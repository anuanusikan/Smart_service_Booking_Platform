import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ProviderPortalLayout from '../components/ProviderPortalLayout';

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

  if (loading) {
    return (
      <ProviderPortalLayout title="Earnings & Payouts" subtitle="Loading revenue history...">
        <p style={{ padding: '24px' }}>Loading revenue analytics...</p>
      </ProviderPortalLayout>
    );
  }

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
    <ProviderPortalLayout
      title="Earnings & Analytics"
      subtitle="Track your completed jobs, revenue trends, and payout history."
    >
      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Total Earnings</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>Rs. {totalEarnings.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Completed Jobs</p>
          <p className="stat-value">{completedBookings.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Average per Job</p>
          <p className="stat-value">
            Rs. {completedBookings.length ? Math.round(totalEarnings / completedBookings.length).toLocaleString() : 0}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <p className="eyebrow">Monthly Revenue Overview</p>
        {chartData.length === 0 ? (
          <p className="meta" style={{ padding: '20px 0' }}>No completed jobs yet to populate monthly revenue trends.</p>
        ) : (
          <div style={{ height: 260, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                <Bar dataKey="total" fill="#2954E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <p className="eyebrow">Payout &amp; Completion History</p>
        {completedBookings.length === 0 && <p className="meta" style={{ padding: '16px 0' }}>No completed jobs yet.</p>}
        {completedBookings.map(b => (
          <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--navy)' }}>{b.job?.title}</p>
              <p className="meta" style={{ margin: '2px 0 0' }}>Client: {b.customer?.name} · Completed on {new Date(b.updatedAt).toLocaleDateString()}</p>
            </div>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--success)' }}>
              + Rs. {b.job?.budget?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </ProviderPortalLayout>
  );
}

export default ProviderEarnings;