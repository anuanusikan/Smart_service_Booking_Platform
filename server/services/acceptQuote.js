const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { declinePendingBookings } = require('./bookingNotifications');

function failure(status, message) {
  return Object.assign(new Error(message), { status });
}

async function acceptQuote(quoteId, customerId) {
  return mongoose.connection.transaction(async session => {
    const quote = await Quote.findById(quoteId, null, { session });
    if (!quote) throw failure(404, 'Quote not found');
    if (quote.customer.toString() !== customerId) throw failure(403, 'Not authorized to accept this quote');
    if (quote.status !== 'pending') throw failure(409, 'This quote is no longer pending. Please refresh.');

    const job = await Job.findOneAndUpdate(
      { _id: quote.job, status: 'open' }, { status: 'assigned' }, { new: true, session }
    );
    if (!job) throw failure(409, 'This job is no longer open');
    const accepted = await Quote.findOneAndUpdate(
      { _id: quote._id, status: 'pending' }, { status: 'accepted' }, { new: true, session }
    );
    if (!accepted) throw failure(409, 'This quote has already changed. Please refresh.');

    const booking = new Booking({
      job: quote.job, provider: quote.provider, customer: quote.customer,
      status: 'accepted', agreedPrice: quote.price
    });
    await booking.save({ session });
    const others = { job: quote.job, _id: { $ne: quote._id }, status: 'pending' };
    const declinedQuotes = await Quote.find(others, null, { session });
    await Quote.updateMany(others, { status: 'declined' }, { session });
    await declinePendingBookings({ job: quote.job, _id: { $ne: booking._id } }, customerId, job.title, session);

    await Notification.create([
      {
        recipient: quote.provider, sender: customerId, type: 'quote_status', title: 'Quote Accepted!',
        message: `Your quote of Rs. ${quote.price} for "${job.title}" was accepted!`, link: '/my-bookings'
      },
      ...declinedQuotes.map(other => ({
        recipient: other.provider, sender: customerId, type: 'quote_status', title: 'Quote Declined',
        message: `Your quote for "${job.title}" was declined because another provider was selected.`, link: '/my-quotes'
      }))
    ], { session });
    return booking;
  }, { readPreference: 'primary' });
}

module.exports = { acceptQuote };
