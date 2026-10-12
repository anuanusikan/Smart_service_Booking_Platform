const { resolveBookingPrices } = require('../services/bookingPrices');
const Booking = require('../models/Booking');
const base = { job: { _id: 'job1', budget: 5000 }, provider: { _id: 'p1' }, customer: { _id: 'c1' }, status: 'completed' };
test('stored agreed price takes precedence over budget and historical quotes', () => {
  expect(resolveBookingPrices([{ ...base, agreedPrice: 7000 }], [])[0].agreedPrice).toBe(7000);
});
test('older bookings recover the accepted quote for the same participants', () => {
  const quotes = [{ job: 'job1', provider: 'p1', customer: 'c1', price: 7000 }];
  expect(resolveBookingPrices([base], quotes)[0].agreedPrice).toBe(7000);
  expect(base.agreedPrice).toBeUndefined();
});
test('another provider quote cannot change this booking price', () => {
  expect(resolveBookingPrices([base], [{ job: 'job1', provider: 'p2', customer: 'c1', price: 9000 }])[0].agreedPrice).toBe(5000);
});
test('zero agreed price remains zero', () => {
  expect(resolveBookingPrices([{ ...base, agreedPrice: 0 }], [])[0].agreedPrice).toBe(0);
});
test('pending request does not claim an agreed price', () => {
  expect(resolveBookingPrices([{ ...base, status: 'pending' }], [])[0].agreedPrice).toBeUndefined();
});
test('booking schema preserves accepted price', () => {
  const doc = new Booking({ agreedPrice: 7000 });
  expect(doc.toObject().agreedPrice).toBe(7000);
});
