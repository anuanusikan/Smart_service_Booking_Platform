jest.mock('mongoose', () => ({ connection: { transaction: jest.fn() } }));
jest.mock('../models/Quote', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn(), find: jest.fn(), updateMany: jest.fn() }));
jest.mock('../models/Job', () => ({ findOneAndUpdate: jest.fn() }));
jest.mock('../models/Booking', () => {
  const Model = jest.fn(function (data) { Object.assign(this, data); this.save = Model.save; });
  Model.save = jest.fn();
  Model.updateMany = jest.fn();
  return Model;
});
jest.mock('../models/Notification', () => ({ create: jest.fn() }));
const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { acceptQuote } = require('../services/acceptQuote');
const session = { testSession: true };
let committed;
beforeEach(() => {
  jest.resetAllMocks();
  Booking.mockImplementation(function (data) { Object.assign(this, data); this.save = Booking.save; });
  committed = false;
  mongoose.connection.transaction.mockImplementation(async callback => {
    const result = await callback(session);
    committed = true;
    return result;
  });
  Quote.findById.mockResolvedValue({ _id: 'q1', customer: 'c1', provider: 'p1', job: 'j1', price: 7000, status: 'pending' });
  Job.findOneAndUpdate.mockResolvedValue({ title: 'Repair tap' });
  Quote.findOneAndUpdate.mockResolvedValue({ status: 'accepted' });
  Quote.find.mockResolvedValue([{ provider: 'p2' }]);
});
test('all reads, writes and notifications share the transaction session', async () => {
  const booking = await acceptQuote('q1', 'c1');
  expect(committed).toBe(true);
  expect(booking.agreedPrice).toBe(7000);
  expect(Quote.findById).toHaveBeenCalledWith('q1', null, { session });
  expect(Job.findOneAndUpdate.mock.calls[0][2].session).toBe(session);
  expect(Quote.findOneAndUpdate.mock.calls[0][2].session).toBe(session);
  expect(Booking.save).toHaveBeenCalledWith({ session });
  expect(Quote.find.mock.calls[0][2].session).toBe(session);
  expect(Quote.updateMany.mock.calls[0][2].session).toBe(session);
  expect(Booking.updateMany.mock.calls[0][2].session).toBe(session);
  expect(Notification.create).toHaveBeenCalledWith([
    expect.objectContaining({ recipient: 'p1', title: 'Quote Accepted!' }),
    expect.objectContaining({ recipient: 'p2', title: 'Quote Declined' })
  ], { session });
});
test.each(['job', 'quote', 'booking', 'otherQuotes', 'otherBookings', 'notifications'])('failure saving %s rejects the whole transaction', async stage => {
  const operation = {
    job: Job.findOneAndUpdate, quote: Quote.findOneAndUpdate, booking: Booking.save,
    otherQuotes: Quote.updateMany, otherBookings: Booking.updateMany, notifications: Notification.create
  }[stage];
  operation.mockRejectedValueOnce(new Error('Simulated database failure'));
  await expect(acceptQuote('q1', 'c1')).rejects.toThrow('Simulated database failure');
  expect(committed).toBe(false);
});
test('a withdrawn quote cannot create a booking', async () => {
  Quote.findById.mockResolvedValue({ customer: 'c1', status: 'withdrawn' });
  await expect(acceptQuote('q1', 'c1')).rejects.toMatchObject({ status: 409 });
  expect(Booking).not.toHaveBeenCalled();
  expect(committed).toBe(false);
});
