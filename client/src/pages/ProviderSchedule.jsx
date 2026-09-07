import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ProviderSchedule() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://localhost:5000/api/bookings/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: '32px' }}>Loading schedule...</p>;

  const upcoming = bookings
    .filter(b => b.status === 'accepted')
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  return (
    <div className="dash-layout">
      <div className="dash-sidebar">
        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Provider Portal</p>
        <p className="meta" style={{ marginBottom: '20px' }}>Manage your business</p>
        <Link to="/provider-dashboard">Dashboard</Link>
        <Link to="/jobs">Matched Jobs</Link>
        <Link to="/my-bookings">My Requests</Link>
        <Link to="/provider-earnings">Earnings</Link>
        <Link to="/my-reviews">Reviews</Link>
      </div>

      <div className="dash-content">
        <h2>Upcoming Schedule</h2>
        <p className="meta" style={{ marginBottom: '20px' }}>Jobs you've accepted and are scheduled to complete.</p>

        {upcoming.length === 0 && <p className="meta">No accepted jobs scheduled right now.</p>}

        {upcoming.map(b => (
          <div key={b._id} className="card">
            <span className="status-badge status-accepted">Accepted</span>
            <h3 style={{ marginTop: '10px' }}>{b.job?.title}</h3>
            <p className="meta"><b>Customer:</b> {b.customer?.name}</p>
            <p className="meta"><b>Location:</b> {b.job?.location}</p>
            <p className="meta"><b>Accepted on:</b> {new Date(b.updatedAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProviderSchedule;