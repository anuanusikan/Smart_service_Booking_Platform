const Quote = require('../models/Quote');
const Notification = require('../models/Notification');

async function notifyQuoteDeclined(quote, sender, jobTitle, anotherProviderSelected = false) {
  try {
    await Notification.create({
      recipient: quote.provider,
      sender,
      type: 'quote_status',
      title: 'Quote Declined',
      message: `Your quote for "${jobTitle || 'the job'}" was declined${anotherProviderSelected ? ' because another provider was selected' : ' by the customer'}.`,
      link: '/my-quotes'
    });
  } catch (err) {
    console.error('Quote notification error:', err);
  }
}

async function declinePendingQuotes(filter, sender, jobTitle) {
  const pending = await Quote.find({ ...filter, status: 'pending' });
  for (const quote of pending) {
    // Notify only when this request actually changes the quote's status.
    const declined = await Quote.findOneAndUpdate(
      { _id: quote._id, status: 'pending' },
      { status: 'declined' },
      { new: true }
    );
    if (declined) await notifyQuoteDeclined(declined, sender, jobTitle, true);
  }
}

module.exports = { declinePendingQuotes, notifyQuoteDeclined };
