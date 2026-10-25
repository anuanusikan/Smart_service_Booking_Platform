jest.mock('../models/Booking', () => {
  const Model = jest.fn(function (data) { Object.assign(this, data); this.save = jest.fn().mockResolvedValue(this); });
  Model.updateMany = jest.fn();
  return Model;
});
jest.mock('mongoose', () => ({ connection: { transaction: async callback => callback({}) } }));
jest.mock('../models/Quote', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn().mockResolvedValue([]), updateMany: jest.fn() }));
jest.mock('../models/Job', () => ({ findOneAndUpdate: jest.fn(), updateOne: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
jest.mock('../services/quoteNotifications', () => ({ declinePendingQuotes: jest.fn() }));
const Booking = require('../models/Booking');
const Quote = require('../models/Quote');
const Job = require('../models/Job');
const router = require('../routes/quotes');
const handler = path => router.stack.find(layer => layer.route?.path === path).route.stack.at(-1).handle;
const withdraw = handler('/:id/withdraw');
const accept = handler('/:id/accept');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const request = (id = 'p1', role = 'provider') => ({ params: { id: 'q1' }, user: { id, role } });
let current;
beforeEach(() => {
  jest.clearAllMocks();
  current = { _id: 'q1', provider: 'p1', customer: 'c1', job: 'j1', price: 5000, status: 'pending' };
  Quote.findById.mockImplementation(async () => ({ ...current }));
  Quote.findOneAndUpdate.mockImplementation(async (filter, update) => {
    if (current.status !== filter.status || (filter.provider && current.provider !== filter.provider)) return null;
    Object.assign(current, update);
    return { ...current };
  });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'j1', title: 'Test job' });
});
test('withdraws own pending quote and keeps a history record', async () => {
  const res = response();
  await withdraw(request(), res);
  expect(current.status).toBe('withdrawn');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Quote withdrawn' }));
});
test.each([['p2', 'provider'], ['c1', 'customer']])('rejects withdrawal by %s', async (id, role) => {
  const res = response();
  await withdraw(request(id, role), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(current.status).toBe('pending');
});
test.each(['accepted', 'declined', 'withdrawn'])('cannot withdraw a %s quote', async status => {
  current.status = status;
  const res = response();
  await withdraw(request(), res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(current.status).toBe(status);
});
test('withdrawal wins after acceptance read: acceptance aborts without creating a booking', async () => {
  Job.findOneAndUpdate.mockImplementationOnce(async () => {
    await withdraw(request(), response());
    return { _id: 'j1' };
  });
  const res = response();
  await accept(request('c1', 'customer'), res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(current.status).toBe('withdrawn');
  expect(Booking).not.toHaveBeenCalled();
  expect(Job.updateOne).not.toHaveBeenCalled();
});
test('acceptance wins after withdrawal read: withdrawal cannot overwrite accepted status', async () => {
  Quote.findById.mockImplementationOnce(async () => {
    const stale = { ...current };
    await accept(request('c1', 'customer'), response());
    return stale;
  });
  const res = response();
  await withdraw(request(), res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(current.status).toBe('accepted');
  expect(Booking).toHaveBeenCalledTimes(1);
});
