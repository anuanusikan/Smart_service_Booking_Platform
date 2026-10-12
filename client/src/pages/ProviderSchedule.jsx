import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import MessageThread from './MessageThread';
import { bookingsApi } from '../services/api';
import { appointmentLabel } from '../utils/appointments';

const zone = { timeZone: 'Asia/Colombo' };
const dayKey = date => new Date(date).toLocaleDateString('en-CA', zone);
const datePart = (date, options) => new Date(date).toLocaleDateString('en-GB', { ...zone, ...options });

function ProviderSchedule() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [refresh, setRefresh] = useState(0);
  const [chat, setChat] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setError('');
    bookingsApi.getMine(controller.signal).then(data => {
      clearTimeout(timeout);
      if (!active) return;
      if (Array.isArray(data)) setBookings(data);
      else setError('Could not load your schedule. Please try again.');
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      if (active) { setError('Could not load your schedule. Please try again.'); setLoading(false); }
    });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [refresh]);

  const now = new Date();
  const today = dayKey(now);
  const activeJobs = bookings.filter(b => b.status === 'accepted').sort((a, b) =>
    (a.job?.scheduledAt ? new Date(a.job.scheduledAt).getTime() : Infinity) -
    (b.job?.scheduledAt ? new Date(b.job.scheduledAt).getTime() : Infinity));
  const todayJobs = activeJobs.filter(b => b.job?.scheduledAt && dayKey(b.job.scheduledAt) === today);
  const next = activeJobs.find(b => b.job?.scheduledAt && new Date(b.job.scheduledAt) >= now);
  const counts = {
    all: activeJobs.length,
    today: todayJobs.length,
    upcoming: activeJobs.filter(b => b.job?.scheduledAt && dayKey(b.job.scheduledAt) > today).length,
    pending: activeJobs.filter(b => !b.job?.scheduledAt).length,
    past: activeJobs.filter(b => b.job?.scheduledAt && dayKey(b.job.scheduledAt) < today).length
  };
  const visible = activeJobs.filter(b => {
    const date = b.job?.scheduledAt;
    if (filter === 'today') return date && dayKey(date) === today;
    if (filter === 'upcoming') return date && dayKey(date) > today;
    if (filter === 'pending') return !date;
    if (filter === 'past') return date && dayKey(date) < today;
    return true;
  });

  return (
    <ProviderPortalLayout title="Your schedule" subtitle="Make room for great work. Plan each visit with confidence."
      extraAction={<button className="schedule-refresh" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh schedule</button>}>
      <div className="schedule-page">
        {loading ? <div className="schedule-empty" role="status">Loading your appointments...</div> : error ? (
          <div className="schedule-empty" role="alert"><p>{error}</p><button onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
        ) : <>
          <section className="schedule-hero">
            <div className="schedule-hero-copy"><span className="schedule-kicker">Your next chapter</span>
              <h2>{next ? 'A little planning.\nA great day ahead.' : 'Good work starts\nwith a clear plan.'}</h2>
              <p>{datePart(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} <span>· Sri Lanka time</span></p>
              <div className="schedule-hero-stats"><div><strong>{todayJobs.length}</strong><span>Visits today</span></div><div><strong>{counts.upcoming}</strong><span>Upcoming visits</span></div><div><strong>{counts.pending}</strong><span>Time to arrange</span></div></div>
            </div>
            <div className="schedule-next">
              <span className="schedule-kicker">Next appointment</span>
              {next ? <><div className="schedule-next-date">{datePart(next.job.scheduledAt, { day: 'numeric', month: 'short' })}<span>{new Date(next.job.scheduledAt).toLocaleTimeString('en-GB', { ...zone, hour: '2-digit', minute: '2-digit', hour12: true })}</span></div><h3>{next.job.title}</h3><p>{next.customer?.name || 'Customer'} · {next.job.location || 'Location not specified'}</p><button onClick={() => setChat(next)}>Message customer <span aria-hidden="true">↗</span></button></> : <><h3>Your next visit will appear here.</h3><p>{counts.pending ? 'Message your customers to arrange a time for jobs without a date.' : 'Accepted jobs with a future appointment will appear here.'}</p><Link to="/jobs">Explore matched jobs →</Link></>}
            </div>
          </section>

          <div className="schedule-list-heading"><div><span className="schedule-kicker">Your appointments</span><h3>Every visit, in view.</h3></div><span className="schedule-zone">All times shown in Sri Lanka time</span></div>
          <div className="schedule-filters" aria-label="Filter appointments">
            {[['all', 'All active'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['pending', 'Time not arranged'], ['past', 'Past dates']].map(([key, label]) => <button key={key} className={filter === key ? 'selected' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>)}
          </div>
          {!visible.length ? <div className="schedule-empty"><span className="schedule-empty-icon" aria-hidden="true">◷</span><h3>{activeJobs.length ? 'No visits in this view' : 'Your schedule is open'}</h3><p>{activeJobs.length ? 'Choose another filter to see your appointments.' : 'Once a customer accepts your quote, the job will appear here.'}</p>{!activeJobs.length && <Link to="/jobs">Find your next opportunity →</Link>}</div> : <div className="schedule-cards">
            {visible.map(b => {
              const date = b.job?.scheduledAt;
              const isToday = date && dayKey(date) === today;
              const isPast = date && dayKey(date) < today;
              return <article key={b._id} className={`schedule-card${!date ? ' schedule-unarranged' : ''}`}>
                <div className="schedule-card-top"><div className="schedule-date-tile">{date ? <><span>{datePart(date, { month: 'short' })}</span><strong>{datePart(date, { day: '2-digit' })}</strong><span>{datePart(date, { weekday: 'short' })}</span></> : <><strong>◷</strong><span>Arrange</span></>}</div><div className="schedule-card-time"><span className={`schedule-chip${isPast ? ' schedule-chip-past' : ''}`}>{!date ? 'Time not arranged' : isToday ? 'Today' : isPast ? 'Date passed' : 'Scheduled'}</span><p>{date ? new Date(date).toLocaleTimeString('en-GB', { ...zone, hour: '2-digit', minute: '2-digit', hour12: true }) : 'Choose a time together'}</p>{date && <span>{datePart(date, { year: 'numeric' })} · Sri Lanka time</span>}</div></div>
                <h3>{b.job?.title || 'Active job'}</h3>
                <dl><div><dt>Customer</dt><dd>{b.customer?.name || 'Customer'}</dd></div><div><dt>Location</dt><dd>{b.job?.location || 'Not specified'}</dd></div></dl>
                {isPast && <p className="schedule-past-note">This date has passed. Confirm completion or discuss a new time with your customer.</p>}
                <div className="schedule-card-footer"><div><span>Agreed price</span><strong>Rs. {Number(b.agreedPrice ?? b.job?.budget ?? 0).toLocaleString()}</strong></div><button onClick={() => setChat(b)}>Message <span aria-hidden="true">↗</span></button></div>
                <span className="schedule-accessible-date">{appointmentLabel(date)}</span>
              </article>;
            })}
          </div>}
          <p className="schedule-footnote">Dates come from the customer's job post. For changes after acceptance, discuss the appointment through Messages.</p>
        </>}
      </div>
      {chat && <MessageThread bookingId={chat._id} otherPersonName={chat.customer?.name || 'Customer'} onClose={() => setChat(null)} />}
    </ProviderPortalLayout>
  );
}

export default ProviderSchedule;
