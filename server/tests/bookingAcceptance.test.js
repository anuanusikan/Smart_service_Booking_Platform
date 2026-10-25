jest.mock('../models/Booking', () => ({ find: jest.fn(), findById: jest.fn(), findOneAndDelete: jest.fn(), findOneAndUpdate: jest.fn(), updateMany: jest.fn() }));
jest.mock('../models/Job', () => ({ findOneAndUpdate: jest.fn(), findByIdAndUpdate: jest.fn(), updateOne: jest.fn() }));
jest.mock('../models/Quote', () => ({ findById: jest.fn(), find: jest.fn(), findOneAndUpdate: jest.fn(), updateMany: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const Quote = require('../models/Quote');
const bookingRouter = require('../routes/bookings');
const quoteRouter = require('../routes/quotes');
const bookingHandler = bookingRouter.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.put).route.stack.at(-1).handle;
const quoteHandler = quoteRouter.stack.find(layer => layer.route?.path === '/:id/accept').route.stack.at(-1).handle;
const cancelHandler = bookingRouter.stack.find(layer => layer.route?.path === '/:id/cancel').route.stack.at(-1).handle;
function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}
function booking(status = 'pending') {
  return { _id: 'booking1', customer: 'customer1', provider: 'provider1', job: { _id: 'job1', title: 'Test job' }, status };
}
beforeEach(() => {
  jest.resetAllMocks();
  Quote.find.mockResolvedValue([]);
});

test('provider can cancel their own pending request', async () => {
  Booking.findById.mockResolvedValue(booking());
  Booking.findOneAndDelete.mockResolvedValue(booking());
  const res = response();
  await cancelHandler({ params: { id: 'booking1' }, user: { id: 'provider1' } }, res);
  expect(Booking.findOneAndDelete).toHaveBeenCalledWith({ _id: 'booking1', provider: 'provider1', status: 'pending' });
  expect(res.json).toHaveBeenCalledWith({ message: 'Request cancelled' });
});

test('cancellation preserves a booking accepted after the initial read', async () => {
  const current = booking();
  Booking.findById.mockImplementation(async () => ({ ...current }));
  Booking.findOneAndDelete.mockImplementation(async filter => {
    current.status = 'accepted';
    return current.status === filter.status ? current : null;
  });
  const res = response();
  await cancelHandler({ params: { id: 'booking1' }, user: { id: 'provider1' } }, res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(current.status).toBe('accepted');
  expect(res.json).not.toHaveBeenCalledWith({ message: 'Request cancelled' });
});

test.each(['accepted', 'completed', 'declined'])('cannot cancel a %s booking', async status => {
  Booking.findById.mockResolvedValue(booking(status));
  const res = response();
  await cancelHandler({ params: { id: 'booking1' }, user: { id: 'provider1' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(Booking.findOneAndDelete).not.toHaveBeenCalled();
});

test('another provider cannot cancel the request', async () => {
  Booking.findById.mockResolvedValue(booking());
  const res = response();
  await cancelHandler({ params: { id: 'booking1' }, user: { id: 'provider2' } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(Booking.findOneAndDelete).not.toHaveBeenCalled();
});

test('acceptance releases the job if cancellation deleted the pending booking first', async () => {
  Booking.findById.mockReturnValue({ populate: async () => booking() });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'job1' });
  Booking.findOneAndUpdate.mockResolvedValue(null);
  const res = response();
  await bookingHandler({ params: { id: 'booking1' }, user: { id: 'customer1' }, body: { status: 'accepted' } }, res);
  expect(Job.updateOne).toHaveBeenCalledWith({ _id: 'job1', status: 'assigned' }, { status: 'open' });
  expect(Booking.updateMany).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(409);
});
test.each(['declined', 'completed', 'accepted'])('cannot accept a %s booking', async status => {
  Booking.findById.mockReturnValue({ populate: async () => booking(status) });
  const res = response();
  await bookingHandler({ params: { id: 'booking1' }, user: { id: 'customer1' }, body: { status: 'accepted' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(Job.findOneAndUpdate).not.toHaveBeenCalled();
});
test('competing acceptance requests can produce only one winner', async () => {
  Booking.findById.mockImplementation(() => ({ populate: async () => booking() }));
  let claimed = false;
  Job.findOneAndUpdate.mockImplementation(async () => {
    if (claimed) return null;
    claimed = true;
    return { _id: 'job1' };
  });
  Booking.findOneAndUpdate.mockResolvedValue(booking('accepted'));
  const first = response();
  const second = response();
  const req = { params: { id: 'booking1' }, user: { id: 'customer1' }, body: { status: 'accepted' } };
  await Promise.all([bookingHandler(req, first), bookingHandler(req, second)]);
  expect(Booking.findOneAndUpdate).toHaveBeenCalledTimes(1);
  expect([first, second].filter(res => res.status.mock.calls.some(([code]) => code === 409))).toHaveLength(1);
  expect(Quote.find).toHaveBeenCalledWith({ job: 'job1', status: 'pending' });
  expect(Booking.updateMany).toHaveBeenCalled();
});
test('failed booking acceptance releases the job claim', async () => {
  Booking.findById.mockReturnValue({ populate: async () => booking() });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'job1' });
  Booking.findOneAndUpdate.mockRejectedValue(new Error('Database write failed'));
  const res = response();
  await bookingHandler({ params: { id: 'booking1' }, user: { id: 'customer1' }, body: { status: 'accepted' } }, res);
  expect(Job.updateOne).toHaveBeenCalledWith({ _id: 'job1', status: 'assigned' }, { status: 'open' });
  expect(res.status).toHaveBeenCalledWith(500);
});
test('quote cannot assign a job already claimed through bookings', async () => {
  Quote.findById.mockResolvedValue({ customer: 'customer1', job: 'job1', status: 'pending' });
  Job.findOneAndUpdate.mockResolvedValue(null);
  const res = response();
  await quoteHandler({ params: { id: 'quote1' }, user: { id: 'customer1' } }, res);
  expect(Job.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'job1', status: 'open' }, { status: 'assigned' }, { new: true });
  expect(res.status).toHaveBeenCalledWith(409);
});

test('earnings view fetches only completed bookings with lightweight job details', async () => {
  const query = { select: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ status: 'completed', agreedPrice: 7000 }]) };
  Booking.find.mockReturnValue(query);
  const handler = bookingRouter.stack.find(layer => layer.route?.path === '/mine').route.stack.at(-1).handle;
  const res = response();
  await handler({ query: { view: 'earnings' }, user: { id: 'provider1', role: 'provider' } }, res);
  expect(Booking.find).toHaveBeenCalledWith({ provider: 'provider1', status: 'completed' });
  expect(query.populate).toHaveBeenCalledWith('job', 'title budget');
  expect(Quote.find).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith([{ status: 'completed', agreedPrice: 7000 }]);
});
