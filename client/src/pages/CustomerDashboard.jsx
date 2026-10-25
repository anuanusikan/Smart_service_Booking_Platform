import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import { jobsApi, bookingsApi } from '../services/api';
import './DashboardOverview.css';

function CustomerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      jobsApi.getMine(),
      bookingsApi.getMine()
    ])
      .then(([jobsData, bookingsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <CustomerPortalLayout title="Client Dashboard" subtitle="Loading metrics...">
        <p style={{ padding: '24px' }}>Loading client portal...</p>
      </CustomerPortalLayout>
    );
  }

  const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'assigned');
  const pendingRequests = bookings.filter(b => b.status === 'pending');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const recentJobs = [...jobs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);
  const recentPending = bookings.filter(b => b.status === 'pending').slice(0, 3);

  const headerAction = (
    <Link to="/post-job" className="overview-primary-action">+ Post a new job <span aria-hidden="true">↗</span></Link>
  );

  return (
    <CustomerPortalLayout>
      <section className="dashboard-overview customer-overview">
      <header className="overview-hero">
        <div><p className="overview-kicker">YOUR SERVICE HUB</p>
        <h1>Your service activity</h1>
        <p>{activeJobs.length || pendingRequests.length
          ? `${activeJobs.length} active ${activeJobs.length === 1 ? 'job' : 'jobs'} · ${pendingRequests.length} ${pendingRequests.length === 1 ? 'request' : 'requests'} awaiting review`
          : 'You’re all caught up. Post a job whenever you need a hand.'}</p></div>
      </header>
      <div className="overview-toolbar"><div><h2>Dashboard overview</h2><p>Your jobs and incoming requests</p></div>{headerAction}</div>
      {/* STATS CARDS */}
      <div className="stat-grid">
        <div className="stat-card metric-blue">
          <p className="stat-label">Active Job Posts</p>
          <p className="stat-value" style={{ color: 'var(--primary)' }}>{activeJobs.length}</p>
          <p className="overview-metric-hint">Open and assigned jobs</p>
        </div>
        <div className="stat-card metric-amber">
          <p className="stat-label">Pending Inquiries</p>
          <p className="stat-value" style={{ color: '#F59E0B' }}>{pendingRequests.length}</p>
          <p className="overview-metric-hint">Awaiting your decision</p>
        </div>
        <div className="stat-card metric-teal">
          <p className="stat-label">Completed Services</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>{completedJobs.length}</p>
          <p className="overview-metric-hint">Services successfully finished</p>
        </div>
      </div>

      {/* DASHBOARD SECTIONS */}
      <div className="overview-panels customer-panels">
        {/* POSTED JOBS */}
        <div className="card overview-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>My Listings</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>My Posted Jobs</h3>
            </div>
            <span className="status-badge status-open">{activeJobs.length} Active</span>
          </div>

          {recentJobs.map(job => (
            <div key={job._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{job.title}</p>
                <p className="meta" style={{ margin: '2px 0 0' }}>{job.category} · Budget: Rs. {job.budget?.toLocaleString()}</p>
              </div>
              <span className={`status-badge status-${job.status}`}>{job.status}</span>
            </div>
          ))}

          {recentJobs.length === 0 && (
            <p className="meta" style={{ padding: '12px 0' }}>No jobs posted yet.</p>
          )}

          <Link to="/my-jobs">
            <button style={{ width: '100%', marginTop: '14px' }}>View All Posted Jobs →</button>
          </Link>
        </div>

        {/* BOOKING REQUESTS */}
        <div className="card overview-panel panel-teal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Provider Inquiries</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>Booking Requests</h3>
            </div>
            <span className="status-badge status-pending">{pendingRequests.length} Pending</span>
          </div>

          {recentPending.map(b => (
            <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{b.provider?.name || 'Provider'}</p>
                <p className="meta" style={{ margin: '2px 0 0' }}>Job: {b.job?.title || 'Service Request'}</p>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>
                Rs. {b.job?.budget?.toLocaleString()}
              </span>
            </div>
          ))}

          {recentPending.length === 0 && (
            <p className="meta" style={{ padding: '12px 0' }}>No pending booking requests from providers.</p>
          )}

          <Link to="/my-bookings">
            <button className="btn-success" style={{ width: '100%', marginTop: '14px' }}>
              Review Booking Requests →
            </button>
          </Link>
        </div>
      </div>
      </section>
    </CustomerPortalLayout>
  );
}

export default CustomerDashboard;
