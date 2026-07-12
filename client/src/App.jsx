import { Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import BrowseJobs from './pages/BrowseJobs';
import MyBookings from './pages/MyBookings';

function Home() {
  return (
    <div>
      <h1>SkillLink</h1>
      <p>Welcome to SkillLink — find trusted service providers near you.</p>
      <Link to="/register">Register</Link> | <Link to="/login">Login</Link> | <Link to="/post-job">Post a Job</Link> | <Link to="/jobs">Browse Jobs</Link> | <Link to="/my-bookings">My Bookings</Link>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/post-job" element={<PostJob />} />
      <Route path="/jobs" element={<BrowseJobs />} />
      <Route path="/my-bookings" element={<MyBookings />} />
    </Routes>
  );
}

export default App;