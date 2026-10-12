const TIME_ZONE = 'Asia/Colombo';

export function appointmentLabel(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Time not arranged';
  return `${new Date(value).toLocaleString('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} (Sri Lanka time)`;
}

export function appointmentInput(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function appointmentISO(value) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : null;
}
