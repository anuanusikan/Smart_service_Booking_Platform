import { useState, useEffect } from 'react';
import ProviderPortalLayout from '../components/ProviderPortalLayout';

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

  if (loading) {
    return (
      <ProviderPortalLayout title="Upcoming Schedule" subtitle="Loading appointments...">
        <p style={{ padding: '24px' }}>Loading schedule...</p>
      </ProviderPortalLayout>
    );
  }

  const upcoming = bookings
    .filter(b => b.status === 'accepted')
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  return (
    <ProviderPortalLayout
      title="Upcoming Schedule & Appointments"
      subtitle="Jobs you have accepted that are currently active or scheduled to complete."
    >
      {upcoming.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📅</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--navy)' }}>No scheduled jobs right now</p>
          <p className="meta" style={{ margin: '4px 0 0' }}>When customers accept your quotes or you accept booking requests, they will appear here.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {upcoming.map(b => (
          <div key={b._id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="status-badge status-accepted">Active Job</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success)' }}>Rs. {b.job?.budget?.toLocaleString()}</span>
            </div>
            <h3 style={{ marginTop: '12px', fontSize: '16px' }}>{b.job?.title}</h3>
            <p className="meta"><b>Customer:</b> {b.customer?.name}</p>
            <p className="meta"><b>Location:</b> {b.job?.location || 'Not specified'}</p>
            <p className="meta"><b>Booked on:</b> {new Date(b.updatedAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </ProviderPortalLayout>
  );
}

export default ProviderSchedule;