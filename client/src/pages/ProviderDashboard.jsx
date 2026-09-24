import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';

function ProviderDashboard() {
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = (() => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();
  const token = localStorage.getItem('token');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/jobs/matched', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('http://localhost:5000/api/bookings/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`http://localhost:5000/api/reviews/provider/${user?.id || ''}`).then(res => res.json())
    ])
      .then(([jobsData, bookingsData, reviewsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.job?.budget || 0), 0);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings';
  const latestReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

  const headerAction = (
    <Link to="/provider-schedule">
      <button style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
        📅 View Schedule
      </button>
    </Link>
  );

  return (
    <ProviderPortalLayout
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'Provider'}`}
      subtitle="Here is what is happening with your service business today."
      extraAction={headerAction}
    >
      {/* STATS OVERVIEW */}
      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Total Earnings</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>Rs. {totalEarnings.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Bookings</p>
          <p className="stat-value">{activeBookings.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">New Matched Jobs</p>
          <p className="stat-value" style={{ color: 'var(--primary)' }}>{jobs.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Client Rating</p>
          <p className="stat-value">
            {avgRating}{reviews.length > 0 ? ' ★' : ''}
            <span style={{ fontSize: '12px', color: 'var(--slate)', fontWeight: 400, marginLeft: '4px' }}>
              ({reviews.length})
            </span>
          </p>
        </div>
      </div>

      {/* DASHBOARD GRIDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '10px' }}>
        {/* NEW OPPORTUNITIES */}
        <div className="card">
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
        <div className="card">
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
        <div className="card">
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
    </ProviderPortalLayout>
  );
}

export default ProviderDashboard;