jest.mock('../models/Notification', () => ({ find: jest.fn(), countDocuments: jest.fn() }));
const Notification = require('../models/Notification');
const router = require('../routes/notifications');
const handler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.get).route.stack.at(-1).handle;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
let query;
beforeEach(() => {
  jest.resetAllMocks();
  query = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
  Notification.find.mockReturnValue(query);
  Notification.countDocuments.mockResolvedValue(42);
});
test('page 2 skips 30 records and reports another page without returning the extra record', async () => {
  query.limit.mockResolvedValue(Array.from({ length: 31 }, (_, i) => ({ _id: String(i) })));
  const res = response();
  await handler({ query: { page: '2' }, user: { id: 'u1' } }, res);
  expect(query.skip).toHaveBeenCalledWith(30);
  expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ page: 2, hasMore: true, unreadCount: 42 }));
  expect(res.json.mock.calls[0][0].notifications).toHaveLength(30);
});
test('filters enabled categories before pagination and counts all their unread alerts', async () => {
  const res = response();
  await handler({ query: { types: 'system,new_message' }, user: { id: 'u1' } }, res);
  expect(Notification.find).toHaveBeenCalledWith({ recipient: 'u1', type: { $in: ['system'] } });
  expect(Notification.countDocuments).toHaveBeenCalledWith({ recipient: 'u1', type: { $in: ['system'] }, read: false });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasMore: false, page: 1 }));
});
test('exactly 30 remaining records has no next page', async () => {
  query.limit.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({ _id: String(i) })));
  const res = response();
  await handler({ query: {}, user: { id: 'u1' } }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasMore: false }));
});
test.each(['0', '-1', 'abc', '1.5', '1000001'])('rejects invalid page %s', async page => {
  const res = response();
  await handler({ query: { page }, user: { id: 'u1' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(Notification.find).not.toHaveBeenCalled();
});
