import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import BrowseJobs from './pages/BrowseJobs';
import MyBookings from './pages/MyBookings';
import MyJobs from './pages/MyJobs';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="navbar">
      <Link to="/" className="logo">ServiceSync</Link>
      <div className="links">
        {user?.role === 'provider' && <Link to="/jobs">Matched Jobs</Link>}
        {user?.role === 'customer' && <Link to="/post-job">Post a Job</Link>}
        {user?.role === 'customer' && <Link to="/my-jobs">My Posted Jobs</Link>}
        {user?.role === 'customer' && <Link to="/my-bookings">Booking Requests</Link>}
{user?.role === 'provider' && <Link to="/my-bookings">My Requests</Link>}
        {!user && <Link to="/register">Register</Link>}
        {!user && <Link to="/login">Login</Link>}
        {user && <a href="#" onClick={handleLogout}>Logout ({user.name})</a>}
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="hero">
      <div className="hero-inner">
        <span className="eyebrow">• Introducing ServiceSync</span>
        <h1>Book trusted services.<br /><span>Anytime, anywhere.</span></h1>
        <p>Connect with trusted local providers for any task — from a leaking pipe to a last-minute tutor. Post a job, get matched, get it sorted.</p>
        <div className="actions">
          <Link to="/register">Get Started</Link>
          <Link to="/jobs" className="secondary">See Available Jobs</Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/jobs" element={<BrowseJobs />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/my-jobs" element={<MyJobs />} />
      </Routes>
    </>
  );
}

export default App;