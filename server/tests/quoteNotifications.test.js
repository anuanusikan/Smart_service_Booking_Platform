jest.mock('../models/Quote', () => ({ find: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
const Quote = require('../models/Quote');
const Notification = require('../models/Notification');
const { declinePendingQuotes, notifyQuoteDeclined } = require('../services/quoteNotifications');
beforeEach(() => jest.resetAllMocks());
test('losing providers receive notifications linking to their quotes', async () => {
  Quote.find.mockResolvedValue([{ _id: 'q1' }, { _id: 'q2' }]);
  Quote.findOneAndUpdate.mockResolvedValueOnce({ provider: 'p1' }).mockResolvedValueOnce({ provider: 'p2' });
  await declinePendingQuotes({ job: 'job1', _id: { $ne: 'winner' } }, 'customer1', 'Fix sink');
  expect(Quote.find).toHaveBeenCalledWith({ job: 'job1', _id: { $ne: 'winner' }, status: 'pending' });
  expect(Notification.create).toHaveBeenCalledTimes(2);
  expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'p2', link: '/my-quotes', message: 'Your quote for "Fix sink" was declined because another provider was selected.' }));
});
test('a quote already changed by another request is not notified again', async () => {
  Quote.find.mockResolvedValue([{ _id: 'q1' }]);
  Quote.findOneAndUpdate.mockResolvedValue(null);
  await declinePendingQuotes({ job: 'job1' }, 'customer1', 'Fix sink');
  expect(Notification.create).not.toHaveBeenCalled();
});
test('manual decline has a different explanation', async () => {
  await notifyQuoteDeclined({ provider: 'p1' }, 'customer1', 'Fix sink');
  expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Your quote for "Fix sink" was declined by the customer.' }));
});
test('notification failure does not undo the decline', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  Quote.find.mockResolvedValue([{ _id: 'q1' }]);
  Quote.findOneAndUpdate.mockResolvedValue({ provider: 'p1' });
  Notification.create.mockRejectedValue(new Error('Notifications unavailable'));
  await expect(declinePendingQuotes({ job: 'job1' }, 'customer1', 'Fix sink')).resolves.toBeUndefined();
  expect(Quote.findOneAndUpdate).toHaveBeenCalled();
  log.mockRestore();
});
