jest.mock('../models/Booking', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn(), updateMany: jest.fn() }));
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
