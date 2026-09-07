import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ProviderDashboard() {
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/jobs/matched', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('http://localhost:5000/api/bookings/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`http://localhost:5000/api/reviews/provider/${user.id}`).then(res => res.json())
    ])
      .then(([jobsData, bookingsData, reviewsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: '32px' }}>Loading dashboard...</p>;

  const activeJobsCount = bookings.filter(b => b.status === 'accepted').length;
  const totalEarnings = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.job?.budget || 0), 0);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings yet';
  const latestReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 2);

  return (
    <div className="dash-layout">
      <div className="dash-sidebar">
        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Provider Portal</p>
        <p className="meta" style={{ marginBottom: '20px' }}>Manage your business</p>
        <Link to="/provider-dashboard" className="active">Dashboard</Link>
        <Link to="/jobs">Matched Jobs</Link>
        <Link to="/my-bookings">My Requests</Link>
        <Link to="/my-reviews">Reviews</Link>
        <Link to="/provider-earnings">Earnings</Link>
      </div>

      <div className="dash-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>Welcome back, {user?.name?.split(' ')[0]}.</h2>
            <p className="meta">Here's what's happening with your business today.</p>
          </div>
          <Link to="/provider-schedule">
            <button style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
              📅 View Schedule
            </button>
          </Link>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Total Earnings</p>
            <p className="stat-value">Rs. {totalEarnings.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Active Jobs</p>
            <p className="stat-value">{activeJobsCount}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">New Opportunities</p>
            <p className="stat-value">{jobs.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Overall Rating</p>
            <p className="stat-value">{avgRating}{reviews.length > 0 ? ' / 5' : ''}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          <div className="card">
            <p className="eyebrow">New Opportunities</p>
            <p className="meta" style={{ marginBottom: '14px' }}>Jobs matched to your skills and location.</p>
            {jobs.slice(0, 3).map(job => (
              <div key={job._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '14px' }}>{job.title}</span>
                <span className="status-badge status-accepted">{job.matchScore}% match</span>
              </div>
            ))}
            {jobs.length === 0 && <p className="meta">No matched jobs right now.</p>}
            <Link to="/jobs"><button style={{ width: '100%', marginTop: '14px' }}>View All Matched Jobs →</button></Link>
          </div>

          <div className="card">
            <p className="eyebrow">Latest Reviews</p>
            {latestReviews.map(r => (
              <div key={r._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{r.customer?.name || 'Anonymous'} — {r.rating}★</p>
                {r.comment && <p className="meta" style={{ margin: '2px 0 0' }}>{r.comment}</p>}
              </div>
            ))}
            {latestReviews.length === 0 && <p className="meta">No reviews yet.</p>}
            <Link to="/my-reviews"><button className="btn-success" style={{ width: '100%', marginTop: '14px' }}>View All Reviews →</button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProviderDashboard;