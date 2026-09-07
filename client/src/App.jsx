import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import BrowseJobs from './pages/BrowseJobs';
import MyBookings from './pages/MyBookings';
import MyJobs from './pages/MyJobs';
import MyReviews from './pages/MyReviews';
import ProviderProfile from './pages/ProviderProfile';
import CustomerDashboard from './pages/CustomerDashboard';
import Profile from './pages/Profile';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderEarnings from './pages/ProviderEarnings';
import ProviderSchedule from './pages/ProviderSchedule';


function Navbar({ onProfileClick, user }) {
  return (
    <div className="navbar">
      <Link to="/" className="logo">ServiceSync</Link>
      <div className="links" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {user?.role === 'customer' && <Link to="/dashboard">Dashboard</Link>}
        {user?.role === 'provider' && <Link to="/provider-dashboard">Dashboard</Link>}

        {user && (
          <>
            <span title="Messages (coming soon)" style={{ cursor: 'default', color: 'var(--slate)' }}>✉ Messages</span>
            <span title="Notifications (coming soon)" style={{ cursor: 'default', color: 'var(--slate)' }}>🔔 Notifications</span>
          </>
        )}

        {!user && <Link to="/register" className="btn-link">Register</Link>}
        {!user && <Link to="/login">Login</Link>}
        {user && <a href="#" onClick={(e) => { e.preventDefault(); onProfileClick(); }}>{user.name}</a>}
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (user?.role === 'customer') navigate('/dashboard');
    if (user?.role === 'provider') navigate('/provider-dashboard');
  }, [user]);

  if (user?.role === 'customer' || user?.role === 'provider') return null;

  const categories = [
    { name: 'Plumbing', icon: '🔧' },
    { name: 'Electrical', icon: '⚡' },
    { name: 'Cleaning', icon: '🧹' },
    { name: 'Handyman', icon: '🛠️' },
  ];
  

  return (
    <>
      <div className="hero">
        <div className="hero-inner">
          <h1>Find Trusted Professionals<br />for Any Project</h1>
          <p>From emergency plumbing to a complete home renovation, connect with top-rated local experts ready to help you get the job done right.</p>

          <div className="toggle-slider">
            <Link to="/register" className="active-need">Need Service</Link>
            <Link to="/register" className="active-provide">Provide Service</Link>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Popular Services</h2>
        <p className="section-subtitle">Explore highly requested categories</p>
        <div className="category-grid">
          {categories.map((cat) => (
            <Link key={cat.name} to={`/jobs?category=${cat.name}`} className="category-card" style={{ textDecoration: 'none' }}>
              <div className="category-icon">{cat.icon}</div>
              <p>{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="footer">
        <div>
          <div className="footer-brand">ServiceSync</div>
          <p>© 2026 ServiceSync Marketplace. All rights reserved.</p>
        </div>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Trust &amp; Safety</a>
          <a href="#">Contact Support</a>
        </div>
      </div>
    </>
  );
}

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));

  const refreshUser = () => {
    setUser(JSON.parse(localStorage.getItem('user')));
  };

  return (
    <>
      <Navbar onProfileClick={() => setShowProfile(true)} user={user} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login onLoginSuccess={refreshUser} />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/jobs" element={<BrowseJobs />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/my-reviews" element={<MyReviews />} />
        <Route path="/provider/:id" element={<ProviderProfile />} />
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/provider-dashboard" element={<ProviderDashboard />} />
        <Route path="/provider-earnings" element={<ProviderEarnings />} />
        <Route path="/provider-schedule" element={<ProviderSchedule />} />
      </Routes>
      {showProfile && <Profile onClose={() => setShowProfile(false)} onProfileUpdate={refreshUser} />}
    </>
  );
}

export default App;