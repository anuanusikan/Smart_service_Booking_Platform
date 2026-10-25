jest.mock('multer', () => () => ({ single: () => (req, res, next) => next() }));
jest.mock('../config/cloudinaryProfile', () => ({ storage: {} }));
jest.mock('../models/User', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn() }));
const User = require('../models/User');
const router = require('../routes/auth');
const { DEFAULT_SETTINGS } = require('../services/notificationSettings');
const handler = method => router.stack.find(layer => layer.route?.path === '/me/notification-settings' && layer.route.methods[method]).route.stack.at(-1).handle;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => jest.resetAllMocks());
test('returns saved preferences for the authenticated account', async () => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ notificationSettings: { sound: true } }) });
  const res = response();
  await handler('get')({ user: { id: 'u1' } }, res);
  expect(User.findById).toHaveBeenCalledWith('u1');
  expect(res.json).toHaveBeenCalledWith({ settings: { ...DEFAULT_SETTINGS, sound: true } });
});
test('legacy accounts can import their browser settings', async () => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({}) });
  const res = response();
  await handler('get')({ user: { id: 'u1' } }, res);
  expect(res.json).toHaveBeenCalledWith({ settings: null });
});
test('patches only the requested key and ignores a supplied account id', async () => {
  User.findOneAndUpdate.mockResolvedValue({ notificationSettings: { sound: true } });
  const res = response();
  await handler('put')({ user: { id: 'u1' }, body: { userId: 'other', settings: { sound: true } } }, res);
  expect(User.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { 'notificationSettings.sound': true } }, { new: true, runValidators: true });
});
test('initialization never overwrites preferences saved by another device', async () => {
  User.findOneAndUpdate.mockResolvedValue(null);
  User.findById.mockResolvedValue({ notificationSettings: { sound: true } });
  const res = response();
  await handler('put')({ user: { id: 'u1' }, body: { initialize: true, settings: { sound: false } } }, res);
  expect(User.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: 'u1', notificationSettings: { $exists: false } });
  expect(res.json).toHaveBeenCalledWith({ settings: { ...DEFAULT_SETTINGS, sound: true } });
});
test.each([null, [], {}, { sound: 'true' }, { other: true }, { constructor: true }])('rejects invalid settings %j', async settings => {
  const res = response();
  await handler('put')({ user: { id: 'u1' }, body: { settings } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(User.findOneAndUpdate).not.toHaveBeenCalled();
});
test('reports failed saves instead of claiming success', async () => {
  User.findOneAndUpdate.mockRejectedValue(new Error('Database offline'));
  const res = response();
  await handler('put')({ user: { id: 'u1' }, body: { settings: { sound: true } } }, res);
  expect(res.status).toHaveBeenCalledWith(500);
});
