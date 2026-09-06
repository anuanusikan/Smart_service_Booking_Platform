import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function CustomerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/jobs/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('http://localhost:5000/api/bookings/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
      .then(([jobsData, bookingsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: '32px' }}>Loading dashboard...</p>;

  const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'assigned').length;
  const pendingRequests = bookings.filter(b => b.status === 'pending').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const needsReview = bookings.filter(b => b.status === 'completed').length; // approximation, refined below

  const recentJobs = [...jobs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 2);
  const recentPending = bookings.filter(b => b.status === 'pending').slice(0, 2);

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="status-badge status-open" style={{ marginBottom: '10px' }}>✓ Verified Account</span>
          <h2 style={{ marginTop: '10px' }}>Welcome back, {user?.name?.split(' ')[0]}!</h2>
          <p className="meta">Manage your posted jobs and incoming booking requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/post-job"><button>+ Post a New Job</button></Link>
          <a href="mailto:support@servicesync.example" style={{ textDecoration: 'none' }}>
            <button style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>Help Desk</button>
          </a>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: '20px' }}>
        <div className="stat-card">
          <p className="stat-label">Active Jobs</p>
          <p className="stat-value">{activeJobs}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending Requests</p>
          <p className="stat-value">{pendingRequests}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Completed</p>
          <p className="stat-value">{completedJobs}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <span className="status-badge status-open">{jobs.filter(j => j.status === 'open').length} Active</span>
          <h3 style={{ marginTop: '10px' }}>My Posted Jobs</h3>
          <p className="meta" style={{ marginBottom: '14px' }}>Review live job listings and their status.</p>

          {recentJobs.map(job => (
            <div key={job._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px' }}>{job.title}</span>
              <span className={`status-badge status-${job.status}`}>{job.status}</span>
            </div>
          ))}
          {recentJobs.length === 0 && <p className="meta">No jobs posted yet.</p>}

          <Link to="/my-jobs"><button style={{ width: '100%', marginTop: '14px' }}>View All Posted Jobs →</button></Link>
        </div>

        <div className="card">
          <span className="status-badge status-pending">{pendingRequests} Pending</span>
          <h3 style={{ marginTop: '10px' }}>Booking Requests</h3>
          <p className="meta" style={{ marginBottom: '14px' }}>Requests from providers awaiting your decision.</p>

          {recentPending.map(b => (
            <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px' }}>{b.provider?.name}</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Rs. {b.job?.budget}</span>
            </div>
          ))}
          {recentPending.length === 0 && <p className="meta">No pending requests.</p>}

          <Link to="/my-bookings"><button className="btn-success" style={{ width: '100%', marginTop: '14px' }}>Review Booking Requests →</button></Link>
        </div>
      </div>
    </div>
  );
}

export default CustomerDashboard;