function resolveBookingPrices(bookings, quotes) {
  const key = (job, provider, customer) => `${job?._id || job}:${provider?._id || provider}:${customer?._id || customer}`;
  const prices = new Map();
  for (const quote of quotes) {
    const quoteKey = key(quote.job, quote.provider, quote.customer);
    // Ambiguous historical quotes should not be guessed.
    prices.set(quoteKey, prices.has(quoteKey) ? null : quote.price);
  }
  return bookings.map(booking => {
    const data = booking.toObject ? booking.toObject() : { ...booking };
    if (data.agreedPrice == null && ['accepted', 'completed'].includes(data.status)) {
      data.agreedPrice = prices.get(key(data.job, data.provider, data.customer)) ?? data.job?.budget ?? 0;
    }
    return data;
  });
}
module.exports = { resolveBookingPrices };
