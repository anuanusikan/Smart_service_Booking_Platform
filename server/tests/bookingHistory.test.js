jest.mock('../models/Booking', () => ({ findById: jest.fn(), updateOne: jest.fn(), findByIdAndDelete: jest.fn(), find: jest.fn() }));
jest.mock('../models/Quote', () => ({ find: jest.fn() }));
const Booking = require('../models/Booking');
const router = require('../routes/bookings');
const archive = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.delete).route.stack.at(-1).handle;
const mine = router.stack.find(layer => layer.route?.path === '/mine').route.stack.at(-1).handle;
const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const record = { _id: 'b1', customer: 'c1', provider: 'p1', status: 'completed' };
beforeEach(() => jest.resetAllMocks());
test.each(['c1', 'p1'])('only hides the record for participant %s and preserves completion date', async id => {
  Booking.findById.mockResolvedValue(record);
  const response = res();
  await archive({ params: { id: 'b1' }, user: { id } }, response);
  expect(Booking.updateOne).toHaveBeenCalledWith({ _id: 'b1' }, { $addToSet: { hiddenFor: id } }, { timestamps: false });
  expect(Booking.findByIdAndDelete).not.toHaveBeenCalled();
  expect(response.json).toHaveBeenCalledWith({ message: 'Booking removed from history' });
});
test('unrelated user cannot hide a booking', async () => {
  Booking.findById.mockResolvedValue(record);
  const response = res();
  await archive({ params: { id: 'b1' }, user: { id: 'stranger' } }, response);
  expect(response.status).toHaveBeenCalledWith(403);
  expect(Booking.updateOne).not.toHaveBeenCalled();
});
test.each(['pending', 'accepted'])('cannot hide an active %s booking', async status => {
  Booking.findById.mockResolvedValue({ ...record, status });
  const response = res();
  await archive({ params: { id: 'b1' }, user: { id: 'p1' } }, response);
  expect(response.status).toHaveBeenCalledWith(400);
  expect(Booking.updateOne).not.toHaveBeenCalled();
});
test.each([
  ['history', { provider: 'p1', hiddenFor: { $ne: 'p1' } }],
  ['earnings', { provider: 'p1', status: 'completed' }],
  [undefined, { provider: 'p1' }]
])('view %s uses the correct visibility filter', async (view, filter) => {
  const query = { populate: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
  Booking.find.mockReturnValue(query);
  await mine({ query: { view }, user: { id: 'p1', role: 'provider' } }, res());
  expect(Booking.find).toHaveBeenCalledWith(filter);
});
