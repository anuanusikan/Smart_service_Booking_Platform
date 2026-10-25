jest.mock('../models/Message', () => {
  const Model = jest.fn(function(data) { Object.assign(this, data); this.save = jest.fn(); this.populate = jest.fn(); });
  Model.findOne = jest.fn(); Model.find = jest.fn(); Model.countDocuments = jest.fn(); Model.updateMany = jest.fn();
  return Model;
});
jest.mock('../models/Booking', () => ({ find: jest.fn(), findById: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const router = require('../routes/messages');
const handler = (path, method) => router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle;
const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => jest.clearAllMocks());
test('sending a message saves chat without creating a bell notification', async () => {
  Booking.findById.mockResolvedValue({ customer: 'c1', provider: 'p1' });
  const response = res();
  await handler('/:bookingId', 'post')({ params: { bookingId: 'b1' }, user: { id: 'c1' }, body: { text: 'Hello' } }, response);
  expect(response.status).toHaveBeenCalledWith(201);
  expect(Message.mock.instances[0].save).toHaveBeenCalled();
  expect(Notification.create).not.toHaveBeenCalled();
});
test('opening a thread marks only fetched incoming messages as read', async () => {
  Booking.findById.mockResolvedValue({ customer: 'c1', provider: 'p1' });
  Message.find.mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'm1' }]) }) });
  await handler('/:bookingId', 'get')({ params: { bookingId: 'b1' }, user: { id: 'p1' } }, res());
  expect(Message.updateMany).toHaveBeenCalledWith({ _id: { $in: ['m1'] }, sender: { $ne: 'p1' }, read: { $ne: true } }, { read: true });
});
test('nonparticipants cannot mark a thread read', async () => {
  Booking.findById.mockResolvedValue({ customer: 'c1', provider: 'p1' });
  const response = res();
  await handler('/:bookingId', 'get')({ params: { bookingId: 'b1' }, user: { id: 'other' } }, response);
  expect(response.status).toHaveBeenCalledWith(403);
  expect(Message.updateMany).not.toHaveBeenCalled();
});
test('conversation list counts incoming unread messages, including older records without a read field', async () => {
  const query = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([{ _id: 'b1', customer: { _id: 'c1' }, provider: { _id: 'p1' } }]) };
  Booking.find.mockReturnValue(query);
  Message.findOne.mockReturnValue({ sort: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue({ _id: 'm1', sender: { _id: 'c1' }, text: 'Hello' }) }) });
  Message.countDocuments.mockResolvedValue(2);
  const response = res();
  await handler('/conversations/mine', 'get')({ user: { id: 'p1' } }, response);
  expect(Message.countDocuments).toHaveBeenCalledWith({ booking: 'b1', sender: { $ne: 'p1' }, read: { $ne: true } });
  expect(response.json).toHaveBeenCalledWith([expect.objectContaining({ unreadCount: 2, lastMessage: expect.objectContaining({ _id: 'm1' }) })]);
});
