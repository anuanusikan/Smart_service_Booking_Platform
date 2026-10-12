jest.mock('multer', () => () => ({ single: () => (req, res, next) => next() }));
jest.mock('../config/cloudinaryProfile', () => ({ storage: {} }));
jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../models/Booking', () => ({ countDocuments: jest.fn() }));
const User = require('../models/User');
const Booking = require('../models/Booking');
const router = require('../routes/auth');
const handler = router.stack.find(layer => layer.route?.path === '/provider/:id').route.stack.at(-1).handle;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => jest.resetAllMocks());
test('public provider profile counts completed bookings independently of reviews and hidden history', async () => {
  const data = { _id: 'p1', role: 'provider', name: 'Provider' };
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ ...data, toObject: () => data }) });
  Booking.countDocuments.mockResolvedValue(10);
  const res = response();
  await handler({ params: { id: 'p1' } }, res);
  expect(Booking.countDocuments).toHaveBeenCalledWith({ provider: 'p1', status: 'completed' });
  expect(res.json).toHaveBeenCalledWith({ ...data, completedCount: 10 });
});
test.each([null, { role: 'customer' }])('non-provider returns 404 without counting bookings', async provider => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(provider) });
  const res = response();
  await handler({ params: { id: 'p1' } }, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(Booking.countDocuments).not.toHaveBeenCalled();
});
