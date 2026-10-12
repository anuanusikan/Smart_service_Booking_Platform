import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import { bookingsApi } from '../services/api';

const money = value => `Rs. ${Number(value).toLocaleString()}`;
const amount = booking => booking.agreedPrice ?? booking.job?.budget ?? 0;

function ProviderEarnings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('6');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setError('');
    bookingsApi.getEarnings(controller.signal).then(data => {
      clearTimeout(timeout);
      if (!active) return;
      if (Array.isArray(data)) setBookings(data);
      else setError(controller.signal.aborted ? 'The server is taking too long. Check that your backend is running, then try again.' : 'Could not load your earnings. Please try again.');
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      if (!active) return;
      setError('Could not load your earnings. Please try again.');
      setLoading(false);
    });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [refresh]);

  const completed = bookings.filter(b => b.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const total = completed.reduce((sum, b) => sum + amount(b), 0);
  const now = new Date();
  const thisMonth = completed.filter(b => {
    const date = new Date(b.updatedAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).reduce((sum, b) => sum + amount(b), 0);
  const start = period === 'all' && completed.length
    ? new Date(completed[completed.length - 1].updatedAt) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const months = new Map();
  for (let date = new Date(start.getFullYear(), start.getMonth(), 1); date <= now; date.setMonth(date.getMonth() + 1)) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    months.set(key, { month: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }), total: 0, jobs: 0 });
  }
  completed.forEach(b => {
    const date = new Date(b.updatedAt);
    const entry = months.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (entry) { entry.total += amount(b); entry.jobs += 1; }
  });
  const chartData = [...months.values()];

  return (
    <ProviderPortalLayout title="Earnings" subtitle="A clear view of the work you've completed."
      extraAction={<button className="earnings-refresh" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh</button>}>
      <div className="earnings-page">
        {loading ? <div className="earnings-panel earnings-empty" role="status">Loading your earnings...</div> : error ? (
          <div className="earnings-panel earnings-empty" role="alert"><p>{error}</p><button onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
        ) : <>
          <section className="earnings-summary" aria-label="Earnings summary">
            <div className="earnings-total">
              <span className="earnings-kicker">Your work, in numbers</span>
              <p className="earnings-label">Total earnings</p>
              <h2>{money(total)}</h2>
              <span className="earnings-total-note">All completed work <span aria-hidden="true">·</span> All time</span>
            </div>
            <div className="earnings-metric"><span className="earnings-kicker">This month</span><strong>{money(thisMonth)}</strong><span>{now.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span></div>
            <div className="earnings-metric"><span className="earnings-kicker">Completed jobs</span><strong>{completed.length.toLocaleString()}</strong><span>Work marked as completed</span></div>
            <div className="earnings-metric"><span className="earnings-kicker">Average per job</span><strong>{money(completed.length ? Math.round(total / completed.length) : 0)}</strong><span>Based on agreed prices</span></div>
          </section>

          <section className="earnings-panel">
            <div className="earnings-panel-heading">
              <div><span className="earnings-kicker">Performance</span><h3>Monthly earnings</h3><p>Completed work, month by month.</p></div>
              <div className="earnings-period" aria-label="Chart period">
                <button aria-pressed={period === '6'} className={period === '6' ? 'selected' : ''} onClick={() => setPeriod('6')}>6 months</button>
                <button aria-pressed={period === 'all'} className={period === 'all' ? 'selected' : ''} onClick={() => setPeriod('all')}>All time</button>
              </div>
            </div>
            {completed.length === 0 ? <div className="earnings-empty"><div className="earnings-empty-symbol" aria-hidden="true">↗</div><h3>Your progress starts here</h3><p>Complete your first job to see your earnings grow.</p><Link to="/jobs">Explore matched jobs →</Link></div> : <>
              <div className="earnings-chart" role="img" aria-label={`Monthly completed-work earnings. ${chartData.map(row => `${row.month}: ${money(row.total)}`).join('; ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }} barCategoryGap="32%">
                    <defs><linearGradient id="earningsBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#527985" /><stop offset="100%" stopColor="#253f4b" /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="#e9e7e2" strokeDasharray="3 5" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#727b80', fontSize: 11 }} tickMargin={12} minTickGap={20} />
                    <YAxis axisLine={false} tickLine={false} width={64} tick={{ fill: '#727b80', fontSize: 11 }} tickFormatter={value => value >= 1000000 ? `${value / 1000000}m` : value >= 1000 ? `${value / 1000}k` : value} />
                    <Tooltip cursor={{ fill: '#f4f2ed' }} formatter={value => [money(value), 'Earnings']} contentStyle={{ border: '1px solid #e5e1d8', borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 24px #253f4b12' }} labelStyle={{ color: '#253f4b', fontWeight: 600 }} />
                    <Bar isAnimationActive={false} dataKey="total" fill="url(#earningsBar)" radius={[6, 6, 0, 0]} maxBarSize={52} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="earnings-chart-caption"><span className="earnings-legend-dot" /> Earnings from completed jobs <span>Amounts in Sri Lankan rupees</span></div>
            </>}
          </section>

          <section className="earnings-panel">
            <div className="earnings-panel-heading"><div><span className="earnings-kicker">Your record</span><h3>Completed work</h3><p>The agreed amount for each finished job.</p></div><span className="earnings-count">{completed.length} {completed.length === 1 ? 'job' : 'jobs'}</span></div>
            {completed.length === 0 ? <p className="earnings-history-empty">Your completed jobs will appear here.</p> : (
              <div className="earnings-table-wrap"><table className="earnings-table"><thead><tr><th scope="col">Job & customer</th><th scope="col">Completed</th><th scope="col">Amount</th></tr></thead><tbody>
                {completed.map(b => <tr key={b._id}><td><strong>{b.job?.title || 'Completed job'}</strong><span>{b.customer?.name || 'Customer'}</span></td><td>{new Date(b.updatedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{money(amount(b))}</td></tr>)}
              </tbody></table></div>
            )}
          </section>
          <p className="earnings-footnote">Earnings reflect completed work at the agreed price. Payment received is not tracked here.</p>
        </>}
      </div>
    </ProviderPortalLayout>
  );
}

export default ProviderEarnings;
