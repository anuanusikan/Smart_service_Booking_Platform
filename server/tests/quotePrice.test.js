jest.mock('../models/Booking', () => {
  const Model = jest.fn(function (data) { Object.assign(this, data); this.save = jest.fn().mockResolvedValue(this); });
  Model.updateMany = jest.fn();
  return Model;
});
jest.mock('mongoose', () => ({ connection: { transaction: async callback => callback({}) } }));
jest.mock('../models/Quote', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(), find: jest.fn().mockResolvedValue([]), updateMany: jest.fn() }));
jest.mock('../models/Job', () => ({ findOneAndUpdate: jest.fn(), updateOne: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
jest.mock('../services/quoteNotifications', () => ({ declinePendingQuotes: jest.fn(), notifyQuoteDeclined: jest.fn() }));
const Booking = require('../models/Booking');
const Quote = require('../models/Quote');
const Job = require('../models/Job');
const router = require('../routes/quotes');
const handler = router.stack.find(layer => layer.route?.path === '/:id/accept').route.stack.at(-1).handle;
const submitHandler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack.at(-1).handle;

test.each(['abc', 'Infinity', Infinity, NaN, '', '   ', 0, -1, true, [], {}, null, undefined])('rejects invalid quote price %p before database writes', async price => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await submitHandler({ user: { id: 'p1', role: 'provider' }, body: { jobId: 'j1', price } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: 'Please enter a valid price greater than Rs. 0' });
});
test('accepting a quote saves its price rather than the advertised budget', async () => {
  Quote.findOneAndUpdate.mockResolvedValue({ status: 'accepted' });
  Quote.findById.mockResolvedValue({ _id: 'q1', job: 'j1', provider: 'p1', customer: 'c1', price: 7000, status: 'pending', save: jest.fn() });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'j1', title: 'Test', budget: 5000 });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await handler({ params: { id: 'q1' }, user: { id: 'c1' } }, res);
  expect(Booking).toHaveBeenCalledWith(expect.objectContaining({ agreedPrice: 7000, status: 'accepted' }));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Quote accepted, booking created' }));
});
