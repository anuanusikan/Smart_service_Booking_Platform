import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import BrowseJobs from './pages/BrowseJobs';
import MyBookings from './pages/MyBookings';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="navbar">
      <Link to="/" className="logo">SkillLink</Link>
      <div className="links">
        <Link to="/jobs">Browse Jobs</Link>
        {user?.role === 'customer' && <Link to="/post-job">Post a Job</Link>}
        {user && <Link to="/my-bookings">My Bookings</Link>}
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
        <span className="eyebrow">• Introducing SkillLink</span>
        <h1>Find help.<br /><span>Get it done.</span></h1>
        <p>Connect with trusted local providers for any task — from a leaking pipe to a last-minute tutor. Post a job, get matched, get it sorted.</p>
        <div className="actions">
          <Link to="/register">Get Started</Link>
          <Link to="/jobs" className="secondary">Browse Jobs</Link>
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
      </Routes>
    </>
  );
}

export default App;