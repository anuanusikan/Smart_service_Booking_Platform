jest.mock('../models/Booking', () => ({ find: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { declinePendingBookings } = require('../services/bookingNotifications');
beforeEach(() => jest.resetAllMocks());
test('notifies each request actually declined, excluding the selected booking', async () => {
  Booking.find.mockResolvedValue([{ _id: 'b2' }, { _id: 'b3' }]);
  Booking.findOneAndUpdate.mockResolvedValueOnce({ provider: 'p2' }).mockResolvedValueOnce({ provider: 'p3' });
  await declinePendingBookings({ job: 'j1', _id: { $ne: 'winner' } }, 'c1', 'Fix sink');
  expect(Booking.find).toHaveBeenCalledWith({ job: 'j1', _id: { $ne: 'winner' }, status: 'pending' }, null, {});
  expect(Notification.create).toHaveBeenCalledTimes(2);
  expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'p2', type: 'booking_status', link: '/my-bookings', message: 'Your request for "Fix sink" was declined because another provider was selected.' }));
});
test('does not notify if a concurrent cancellation or status change won', async () => {
  Booking.find.mockResolvedValue([{ _id: 'b2' }]);
  Booking.findOneAndUpdate.mockResolvedValue(null);
  await declinePendingBookings({ job: 'j1' }, 'c1', 'Fix sink');
  expect(Notification.create).not.toHaveBeenCalled();
});
test('quote acceptance includes status and notification in its transaction and propagates failures', async () => {
  const session = { transaction: true };
  Booking.find.mockResolvedValue([{ _id: 'b2' }]);
  Booking.findOneAndUpdate.mockResolvedValue({ provider: 'p2' });
  Notification.create.mockRejectedValue(new Error('Database failure'));
  await expect(declinePendingBookings({ job: 'j1' }, 'c1', 'Fix sink', session)).rejects.toThrow('Database failure');
  expect(Booking.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'b2', status: 'pending' }, { status: 'declined' }, { new: true, session });
  expect(Notification.create).toHaveBeenCalledWith([expect.objectContaining({ recipient: 'p2' })], { session });
});
