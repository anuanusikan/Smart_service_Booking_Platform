import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import BrowseJobs from './pages/BrowseJobs';
import MyBookings from './pages/MyBookings';
import MyQuotes from './pages/MyQuotes';
import MyJobs from './pages/MyJobs';
import MyReviews from './pages/MyReviews';
import ProviderProfile from './pages/ProviderProfile';
import CustomerDashboard from './pages/CustomerDashboard';
import Profile from './pages/Profile';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderEarnings from './pages/ProviderEarnings';
import ProviderSchedule from './pages/ProviderSchedule';
import MessageThread from './pages/MessageThread';
import { authApi } from './services/api';

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const [activeChat, setActiveChat] = useState(null);

  const getUser = () => {
    try {
      if (!localStorage.getItem('token')) return null;
      const item = localStorage.getItem('user');
      const stored = item ? JSON.parse(item) : null;
      return ['customer', 'provider'].includes(stored?.role) ? stored : null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(getUser);

  const refreshUser = (updated) => {
    if (updated && updated.name) {
      setUser(updated);
    } else {
      setUser(getUser());
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe().then((me) => {
        // Ignore a profile response belonging to a previous login session.
        if (localStorage.getItem('token') !== token) return;
        if (me?.message === 'Invalid or expired token' || me?.message === 'No token provided, access denied') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else if (me && (me._id || me.id)) {
          const stored = getUser() || {};
          const syncedUser = {
            ...stored,
            id: me._id || me.id,
            name: me.name,
            email: me.email,
            role: me.role,
            profilePicture: me.profilePicture || ''
          };
          localStorage.setItem('user', JSON.stringify(syncedUser));
          setUser(syncedUser);
          window.dispatchEvent(new Event('userProfileUpdated'));
        }
      }).catch(() => {});
    }

    const handleProfileUpdate = () => {
      setUser(getUser());
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  return (
    <>
      <Navbar
        key={user?.id || user?._id || 'guest'}
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
        <Route path="/my-quotes" element={<MyQuotes />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/my-reviews" element={<MyReviews />} />
        <Route path="/provider/:id" element={<ProviderProfile />} />
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/provider-dashboard" element={<ProviderDashboard />} />
        <Route path="/provider-earnings" element={<ProviderEarnings />} />
        <Route path="/provider-schedule" element={<ProviderSchedule />} />
      </Routes>

      {/* Global Profile Modal */}
      {user && showProfile && (
        <Profile
          onClose={() => setShowProfile(false)}
          onProfileUpdate={refreshUser}
        />
      )}

      {/* Global Chat / Message Thread Modal from Navbar */}
      {user && activeChat && (
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