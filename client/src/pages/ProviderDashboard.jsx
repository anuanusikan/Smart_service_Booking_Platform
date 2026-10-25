import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import { jobsApi, bookingsApi, reviewsApi } from '../services/api';
import './DashboardOverview.css';

function ProviderDashboard() {
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = (() => {
    try {
      const item = sessionStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();
  useEffect(() => {
    Promise.all([
      jobsApi.getMatched(),
      bookingsApi.getMine(),
      user?.id ? reviewsApi.getByProvider(user.id) : Promise.resolve([])
    ])
      .then(([jobsData, bookingsData, reviewsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <ProviderPortalLayout title="Dashboard Overview" subtitle="Loading metrics...">
        <p style={{ padding: '24px' }}>Loading provider portal...</p>
      </ProviderPortalLayout>
    );
  }

  const activeBookings = bookings.filter(b => b.status === 'accepted');
  const pendingRequests = bookings.filter(b => b.status === 'pending');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.agreedPrice ?? b.job?.budget ?? 0), 0);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings';
  const latestReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

  const headerAction = (
    <Link to="/provider-schedule" className="overview-primary-action">View schedule <span aria-hidden="true">↗</span></Link>
  );

  return (
    <ProviderPortalLayout>
      <section className="dashboard-overview provider-overview">
      <header className="overview-hero">
        <div><p className="overview-kicker">YOUR BUSINESS AT A GLANCE</p>
        <h1>Your business activity</h1>
        <p>{activeBookings.length || pendingRequests.length || jobs.length
          ? `${activeBookings.length} active ${activeBookings.length === 1 ? 'booking' : 'bookings'} · ${pendingRequests.length} pending ${pendingRequests.length === 1 ? 'request' : 'requests'} · ${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} to explore`
          : 'You’re all caught up. New opportunities will appear here.'}</p></div>
      </header>
      <div className="overview-toolbar"><div><h2>Business overview</h2><p>Your performance and latest activity</p></div>{headerAction}</div>
      {/* STATS OVERVIEW */}
      <div className="stat-grid">
        <div className="stat-card metric-teal">
          <p className="stat-label">Total Earnings</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>Rs. {totalEarnings.toLocaleString()}</p>
          <p className="overview-metric-hint">From {completedBookings.length} completed bookings</p>
        </div>
        <div className="stat-card metric-indigo">
          <p className="stat-label">Active Bookings</p>
          <p className="stat-value">{activeBookings.length}</p>
          <p className="overview-metric-hint">Accepted and in progress</p>
        </div>
        <div className="stat-card metric-blue">
          <p className="stat-label">New Matched Jobs</p>
          <p className="stat-value" style={{ color: 'var(--primary)' }}>{jobs.length}</p>
          <p className="overview-metric-hint">Open opportunities to explore</p>
        </div>
        <div className="stat-card metric-amber">
          <p className="stat-label">Client Rating</p>
          <p className="stat-value">
            {avgRating}{reviews.length > 0 ? ' ★' : ''}
            <span style={{ fontSize: '12px', color: 'var(--slate)', fontWeight: 400, marginLeft: '4px' }}>
              ({reviews.length})
            </span>
          </p>
          <p className="overview-metric-hint">Based on {reviews.length} client reviews</p>
        </div>
      </div>

      {/* DASHBOARD GRIDS */}
      <div className="overview-panels provider-panels">
        {/* NEW OPPORTUNITIES */}
        <div className="card overview-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>High Match Opportunities</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>Matched for your skills</h3>
            </div>
            <span className="status-badge status-open">{jobs.length} Open</span>
          </div>

          {jobs.slice(0, 3).map(job => (
            <div key={job._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{job.title}</p>
                <p className="meta" style={{ margin: '2px 0 0' }}>{job.category} · Budget: Rs. {job.budget?.toLocaleString()}</p>
              </div>
              <span className="status-badge status-accepted" style={{ flexShrink: 0 }}>
                {job.matchScore}% match
              </span>
            </div>
          ))}

          {jobs.length === 0 && <p className="meta" style={{ padding: '12px 0' }}>No matched jobs right now. Check back soon!</p>}

          <Link to="/jobs">
            <button style={{ width: '100%', marginTop: '14px' }}>View All Matched Jobs →</button>
          </Link>
        </div>

        {/* ACTIVE & PENDING BOOKINGS */}
        <div className="card overview-panel panel-teal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Bookings &amp; Inquiries</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>Recent Client Requests</h3>
            </div>
            <span className="status-badge status-pending">{pendingRequests.length} Pending</span>
          </div>

          {[...activeBookings, ...pendingRequests].slice(0, 3).map(b => (
            <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{b.customer?.name || 'Customer'}</p>
                <p className="meta" style={{ margin: '2px 0 0' }}>Job: {b.job?.title || 'Service Request'}</p>
              </div>
              <span className={`status-badge status-${b.status}`}>
                {b.status}
              </span>
            </div>
          ))}

          {[...activeBookings, ...pendingRequests].length === 0 && (
            <p className="meta" style={{ padding: '12px 0' }}>No pending requests or active bookings.</p>
          )}

          <Link to="/my-bookings">
            <button className="btn-success" style={{ width: '100%', marginTop: '14px' }}>Manage All Requests →</button>
          </Link>
        </div>

        {/* LATEST REVIEWS */}
        <div className="card overview-panel panel-reviews">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Feedback</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>Recent Client Reviews</h3>
            </div>
          </div>

          {latestReviews.map(r => (
            <div key={r._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>{r.customer?.name || 'Anonymous Client'}</span>
                <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '13px' }}>{'★'.repeat(r.rating || 5)}</span>
              </div>
              {r.comment && <p className="meta" style={{ margin: '4px 0 0' }}>{r.comment}</p>}
            </div>
          ))}

          {latestReviews.length === 0 && <p className="meta" style={{ padding: '12px 0' }}>No reviews received yet.</p>}

          <Link to="/my-reviews">
            <button style={{ width: '100%', marginTop: '14px', background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
              View All Reviews →
            </button>
          </Link>
        </div>
      </div>
      </section>
    </ProviderPortalLayout>
  );
}

export default ProviderDashboard;
