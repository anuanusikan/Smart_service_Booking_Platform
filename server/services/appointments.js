function parseAppointment(value, previousValue) {
  if (value === undefined) return { value: previousValue ?? null };
  if (value === '' || value === null) return { value: null };
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return { error: 'Please choose a valid appointment date and time' };
  }
  const [year, month, day, hour, minute, second] = value.slice(0, 19).split(/[-T:]/).map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) {
    return { error: 'Please choose a valid appointment date and time' };
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { error: 'Please choose a valid appointment date and time' };
  const unchanged = previousValue && date.getTime() === new Date(previousValue).getTime();
  if (!unchanged && date.getTime() <= Date.now()) return { error: 'Appointment must be in the future' };
  return { value: date };
}
module.exports = { parseAppointment };
