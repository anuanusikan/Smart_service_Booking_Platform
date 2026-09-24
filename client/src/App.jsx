import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
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
import MessageThread from './pages/MessageThread';

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const [activeChat, setActiveChat] = useState(null);

  const getUser = () => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(getUser);

  const refreshUser = () => {
    setUser(getUser());
  };

  return (
    <>
      <Navbar
        onProfileClick={() => setShowProfile(true)}
        user={user}
        onOpenChat={(chat) => setActiveChat(chat)}
      />
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

      {/* Global Profile Modal */}
      {showProfile && (
        <Profile
          onClose={() => setShowProfile(false)}
          onProfileUpdate={refreshUser}
        />
      )}

      {/* Global Chat / Message Thread Modal from Navbar */}
      {activeChat && (
        <MessageThread
          bookingId={activeChat.bookingId}
          otherPersonName={activeChat.otherPersonName}
          onClose={() => setActiveChat(null)}
        />
      )}
    </>
  );
}

export default App;