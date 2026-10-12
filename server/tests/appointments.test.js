const { parseAppointment } = require('../services/appointments');
const future = () => new Date(Date.now() + 86400000).toISOString();
test('optional appointments preserve compatibility with existing jobs', () => {
  expect(parseAppointment(undefined)).toEqual({ value: null });
  const previous = new Date('2020-01-01T00:00:00Z');
  expect(parseAppointment(undefined, previous)).toEqual({ value: previous });
  expect(parseAppointment('', previous)).toEqual({ value: null });
});
test('future appointment is saved as the same instant', () => {
  const value = future();
  expect(parseAppointment(value).value.toISOString()).toBe(value);
});
test('editing unrelated details preserves an existing past appointment', () => {
  const past = '2020-01-01T00:00:00.000Z';
  expect(parseAppointment(past, new Date(past)).value.toISOString()).toBe(past);
});
test.each(['2020-01-01T00:00:00Z', 'invalid', '2030-01-01T09:00', '2030-02-30T09:00:00Z', '2030-01-01T24:00:00Z'])('rejects invalid or new past appointment %s', value => {
  expect(parseAppointment(value).error).toBeTruthy();
});
test('Sri Lanka offset maps to UTC correctly', () => {
  expect(parseAppointment('2035-01-01T09:00:00+05:30').value.toISOString()).toBe('2035-01-01T03:30:00.000Z');
});
