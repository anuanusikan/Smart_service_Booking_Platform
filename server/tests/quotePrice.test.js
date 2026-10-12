jest.mock('../models/Booking', () => {
  const Model = jest.fn(function (data) { Object.assign(this, data); this.save = jest.fn().mockResolvedValue(this); });
  Model.updateMany = jest.fn();
  return Model;
});
jest.mock('../models/Quote', () => ({ findById: jest.fn() }));
jest.mock('../models/Job', () => ({ findOneAndUpdate: jest.fn() }));
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
jest.mock('../services/quoteNotifications', () => ({ declinePendingQuotes: jest.fn(), notifyQuoteDeclined: jest.fn() }));
const Booking = require('../models/Booking');
const Quote = require('../models/Quote');
const Job = require('../models/Job');
const router = require('../routes/quotes');
const handler = router.stack.find(layer => layer.route?.path === '/:id/accept').route.stack.at(-1).handle;
test('accepting a quote saves its price rather than the advertised budget', async () => {
  Quote.findById.mockResolvedValue({ _id: 'q1', job: 'j1', provider: 'p1', customer: 'c1', price: 7000, status: 'pending', save: jest.fn() });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'j1', title: 'Test', budget: 5000 });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await handler({ params: { id: 'q1' }, user: { id: 'c1' } }, res);
  expect(Booking).toHaveBeenCalledWith(expect.objectContaining({ agreedPrice: 7000, status: 'accepted' }));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Quote accepted, booking created' }));
});
