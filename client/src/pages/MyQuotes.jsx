import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import { quotesApi } from '../services/api';

function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [withdrawing, setWithdrawing] = useState(null);
  const withdrawingRef = useRef(false);
  const quotesVersion = useRef(0);
  const [notice, setNotice] = useState('');

  const withdrawQuote = async id => {
    if (withdrawingRef.current) return;
    if (!window.confirm('Withdraw this quote? The customer will no longer be able to accept it.')) return;
    withdrawingRef.current = true;
    quotesVersion.current += 1;
    setWithdrawing(id);
    setNotice('');
    setError('');
    try {
      const result = await quotesApi.withdraw(id);
      quotesVersion.current += 1;
      if (result.ok) {
        setQuotes(current => current.map(quote => quote._id === id ? { ...quote, status: 'withdrawn' } : quote));
        setNotice('Quote withdrawn successfully.');
      } else {
        setNotice(result.data?.message || 'Could not withdraw quote. Please try again.');
        setRefresh(value => value + 1);
      }
    } finally {
      withdrawingRef.current = false;
      setWithdrawing(null);
    }
  };
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user') || 'null');
  } catch { /* Show the login prompt for invalid stored user data. */ }
  const isProvider = user?.role === 'provider';
  const hasToken = Boolean(sessionStorage.getItem('token'));

  useEffect(() => {
    if (!isProvider || !hasToken) return;
    let active = true;
    setLoading(true);
    setError('');
    let latestRequest = 0;
    const load = async () => {
      if (withdrawingRef.current) return;
      const version = quotesVersion.current;
      const request = ++latestRequest;
      const data = await quotesApi.getMine();
      // A poll started before withdrawal must not restore the pending card.
      if (!active || withdrawingRef.current || version !== quotesVersion.current || request !== latestRequest) return;
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
  const matchesFilter = (quote, status) => status === 'all' ? quote.status !== 'withdrawn' : quote.status === status;
  const visible = quotes.filter(quote => matchesFilter(quote, filter));

  return (
    <ProviderPortalLayout title="My Quotes" subtitle="Track the prices you offered and the customer's decision."
      extraAction={<button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh</button>}>
      <section className="quotes-page" aria-label="Your submitted quotes">
      <div className="quotes-filter-bar" aria-label="Filter quotes">
        {['all', 'pending', 'accepted', 'declined', 'withdrawn'].map(status => (
          <button key={status} type="button" className={`tab-btn${filter === status ? ' active' : ''}`}
            aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)} <span className="quotes-filter-count">{quotes.filter(quote => matchesFilter(quote, status)).length}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading && <p>Loading your quotes...</p>}
      {!loading && !error && visible.length === 0 && <div className="card">
        <p>No {filter === 'all' ? '' : `${filter} `}quotes yet.</p>
        <Link to="/jobs">Browse matched jobs</Link>
      </div>}
      <div className="quotes-list">
      {!loading && visible.map(quote => (
        <article key={quote._id} className="quote-card">
          <div className="quote-card-details">
          <div className="quote-card-heading">
            <h3>{quote.job?.title || 'Job no longer available'}</h3>
            <span className={`status-badge status-${quote.status}`}>{quote.status}</span>
          </div>
          <div className="quote-card-meta">
          {quote.job?.location && <span><span className="quote-meta-label">Location</span> {quote.job.location}</span>}
          <span><span className="quote-meta-label">Submitted</span> {new Date(quote.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {quote.message && <p className="quote-card-message">{quote.message}</p>}
          </div>
          <div className="quote-card-price"><span>Your offer</span><strong><small>Rs.</small> {Number(quote.price).toLocaleString()}</strong></div>
          <div className="quote-card-footer">
          <p className="quote-card-note">
          {quote.status === 'pending' && 'Awaiting the customer’s decision'}
          {quote.status === 'withdrawn' && 'You withdrew this quote. It can no longer be accepted.'}
          {quote.status === 'declined' && (quote.job?.status === 'deleted' ? 'The customer removed this job listing.' : 'The customer declined or selected another provider.')}
          {quote.status === 'accepted' && 'Your offer was accepted. You’re ready for the next step.'}
          </p>
          {quote.status === 'pending' && <button type="button" className="quote-withdraw-btn"
            disabled={withdrawing !== null} onClick={() => withdrawQuote(quote._id)}>
            {withdrawing === quote._id ? 'Withdrawing...' : 'Withdraw Quote'}
          </button>}
          {quote.status === 'accepted' && <Link className="quote-booking-link" to="/my-bookings">View booking <span aria-hidden="true">↗</span></Link>}
          </div>
        </article>
      ))}
      </div>
      </section>
    </ProviderPortalLayout>
  );
}

export default MyQuotes;
