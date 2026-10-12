import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import { quotesApi } from '../services/api';

function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch { /* Show the login prompt for invalid stored user data. */ }
  const isProvider = user?.role === 'provider';
  const hasToken = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    if (!isProvider || !hasToken) return;
    let active = true;
    setLoading(true);
    setError('');
    const load = async () => {
      const data = await quotesApi.getMine();
      if (!active) return;
      if (Array.isArray(data)) {
        setQuotes(data);
        setError('');
      } else {
        setError('Could not load your quotes. Please refresh or log in again.');
      }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isProvider, hasToken, refresh]);

  if (!hasToken) return <p style={{ padding: 32 }}>Please <Link to="/login">log in</Link> to view your quotes.</p>;
  if (!isProvider) return <p style={{ padding: 32 }}>My Quotes is available to service providers.</p>;
  const visible = quotes.filter(quote => filter === 'all' || quote.status === filter);

  return (
    <ProviderPortalLayout title="My Quotes" subtitle="Track the prices you offered and the customer's decision."
      extraAction={<button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh</button>}>
      <div className="tab-nav-bar" style={{ display: 'flex', flexWrap: 'wrap' }} aria-label="Filter quotes">
        {['all', 'pending', 'accepted', 'declined'].map(status => (
          <button key={status} type="button" className={`tab-btn${filter === status ? ' active' : ''}`}
            aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)} ({quotes.filter(quote => status === 'all' || quote.status === status).length})
          </button>
        ))}
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      {loading && <p>Loading your quotes...</p>}
      {!loading && !error && visible.length === 0 && <div className="card">
        <p>No {filter === 'all' ? '' : `${filter} `}quotes yet.</p>
        <Link to="/jobs">Browse matched jobs</Link>
      </div>}
      {!loading && visible.map(quote => (
        <article key={quote._id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ marginBottom: 8 }}>{quote.job?.title || 'Job no longer available'}</h3>
            <span className={`status-badge status-${quote.status}`}>{quote.status}</span>
          </div>
          <p><b>Your quote:</b> Rs. {Number(quote.price).toLocaleString()}</p>
          {quote.job?.location && <p className="meta">Location: {quote.job.location}</p>}
          <p className="meta">Submitted: {new Date(quote.createdAt).toLocaleDateString()}</p>
          {quote.message && <p style={{ overflowWrap: 'anywhere' }}>{quote.message}</p>}
          {quote.status === 'pending' && <p className="meta">Waiting for the customer's decision.</p>}
          {quote.status === 'declined' && <p className="meta">The customer declined this quote or selected another provider.</p>}
          {quote.status === 'accepted' && <Link to="/my-bookings">View your booking</Link>}
        </article>
      ))}
    </ProviderPortalLayout>
  );
}

export default MyQuotes;
