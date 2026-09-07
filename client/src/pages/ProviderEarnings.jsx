import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function ProviderEarnings() {
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

  if (loading) return <p style={{ padding: '32px' }}>Loading earnings...</p>;

  const completedBookings = bookings
    .filter(b => b.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.job?.budget || 0), 0);

  // Group earnings by month for the chart
  const monthlyTotals = {};
  completedBookings.forEach(b => {
    const monthKey = new Date(b.updatedAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (b.job?.budget || 0);
  });
  const chartData = Object.entries(monthlyTotals).map(([month, total]) => ({ month, total }));

  return (
    <div className="dash-layout">
      <div className="dash-sidebar">
        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Provider Portal</p>
        <p className="meta" style={{ marginBottom: '20px' }}>Manage your business</p>
        <Link to="/provider-dashboard">Dashboard</Link>
        <Link to="/jobs">Matched Jobs</Link>
        <Link to="/my-bookings">My Requests</Link>
        <Link to="/provider-earnings" className="active">Earnings</Link>
        <Link to="/my-reviews">Reviews</Link>
      </div>

      <div className="dash-content">
        <h2>Earnings</h2>
        <p className="meta" style={{ marginBottom: '20px' }}>Track your completed jobs and total revenue.</p>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Total Earnings</p>
            <p className="stat-value">Rs. {totalEarnings.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Completed Jobs</p>
            <p className="stat-value">{completedBookings.length}</p>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">Earnings Overview</p>
          {chartData.length === 0 ? (
            <p className="meta">No completed jobs yet to show a chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                <Bar dataKey="total" fill="#2954E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <p className="eyebrow">Recent Payouts</p>
          {completedBookings.length === 0 && <p className="meta">No completed jobs yet.</p>}
          {completedBookings.map(b => (
            <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{b.job?.title}</p>
                <p className="meta" style={{ margin: 0 }}>{b.customer?.name} · {new Date(b.updatedAt).toLocaleDateString()}</p>
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--success)' }}>Rs. {b.job?.budget?.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProviderEarnings;