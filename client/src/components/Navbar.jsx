import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar({ onProfileClick, user, onOpenChat }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const [openMenu, setOpenMenu] = useState(null); // null | 'messages' | 'notifications'
  const [notifTab, setNotifTab] = useState('alerts'); // 'alerts' | 'settings'
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('serviceSync_notif_settings');
      return saved ? JSON.parse(saved) : {
        bookingAlerts: true,
        messageAlerts: true,
        quoteAlerts: true,
        sound: false
      };
    } catch {
      return { bookingAlerts: true, messageAlerts: true, quoteAlerts: true, sound: false };
    }
  });

  const menuRef = useRef(null);
  const token = localStorage.getItem('token');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch conversations
  const fetchConversations = () => {
    if (!token || !user) return;
    setLoadingChats(true);
    fetch('http://localhost:5000/api/messages/conversations/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setConversations(Array.isArray(data) ? data : []);
        setLoadingChats(false);
      })
      .catch(() => setLoadingChats(false));
  };

  // Fetch notifications
  const fetchNotifications = () => {
    if (!token || !user) return;
    setLoadingNotifs(true);
    fetch('http://localhost:5000/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadNotifs(data.unreadCount || 0);
        }
        setLoadingNotifs(false);
      })
      .catch(() => setLoadingNotifs(false));
  };

  // Polling for updates
  useEffect(() => {
    if (!user || !token) return;
    fetchNotifications();
    fetchConversations();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchConversations();
    }, 8000);

    return () => clearInterval(interval);
  }, [user, token]);

  const toggleMenu = (menuName) => {
    if (openMenu === menuName) {
      setOpenMenu(null);
    } else {
      setOpenMenu(menuName);
      if (menuName === 'messages') fetchConversations();
      if (menuName === 'notifications') fetchNotifications();
    }
  };

  const handleMarkAsRead = async (notifId, link) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
      setUnreadNotifs(prev => Math.max(0, prev - 1));
    } catch (err) {
      // ignore
    }

    if (link) {
      setOpenMenu(null);
      navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifs(0);
    } catch (err) {
      // ignore
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadNotifs(0);
    } catch (err) {
      // ignore
    }
  };

  const updateSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('serviceSync_notif_settings', JSON.stringify(updated));
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'booking_request':
      case 'booking_status':
        return { icon: '📋', bg: 'var(--info-bg)' };
      case 'quote_received':
      case 'quote_status':
        return { icon: '💰', bg: 'var(--success-bg)' };
      case 'new_message':
        return { icon: '💬', bg: 'var(--info-bg)' };
      default:
        return { icon: '🔔', bg: 'var(--warning-bg)' };
    }
  };

  return (
    <div className="navbar" ref={menuRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to={user?.role === 'provider' ? '/provider-dashboard' : (user ? '/dashboard' : '/')} className="logo">
          <span style={{ fontSize: '22px' }}>⚡</span> ServiceSync
        </Link>
        {user?.role === 'provider' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'var(--info-bg)',
              color: 'var(--primary)',
              border: '1px solid rgba(41, 84, 229, 0.2)'
            }}
          >
            Provider Portal
          </span>
        )}
        {user?.role === 'customer' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'var(--success-bg)',
              color: 'var(--success-dark)',
              border: '1px solid rgba(14, 159, 110, 0.2)'
            }}
          >
            Customer Portal
          </span>
        )}
      </div>

      <div className="links">
        {/* Navigation links for logged in vs guest */}
        {user ? (
          <>

            {/* MESSAGES DROPDOWN */}
            <div className="nav-dropdown-wrapper">
              <button
                type="button"
                className={`nav-icon-btn ${openMenu === 'messages' ? 'active' : ''}`}
                onClick={() => toggleMenu('messages')}
                title="Messages"
              >
                <span>✉</span> Messages
                {conversations.some(c => c.lastMessage) && (
                  <span className="nav-badge" style={{ background: 'var(--primary)' }}>
                    {conversations.filter(c => c.lastMessage).length}
                  </span>
                )}
              </button>

              {openMenu === 'messages' && (
                <div className="nav-dropdown-menu">
                  <div className="nav-dropdown-header">
                    <h4>Active Conversations</h4>
                    <span style={{ fontSize: '12px', color: 'var(--slate)' }}>
                      {conversations.length} total
                    </span>
                  </div>

                  <div className="nav-dropdown-body">
                    {loadingChats && <p style={{ padding: '16px', margin: 0, fontSize: '13px', color: 'var(--slate)' }}>Loading chats...</p>}
                    {!loadingChats && conversations.length === 0 && (
                      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate)' }}>No active conversations yet.</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>Messages will appear once a booking is created.</p>
                      </div>
                    )}

                    {!loadingChats && conversations.map((c) => (
                      <div
                        key={c.bookingId}
                        onClick={() => {
                          setOpenMenu(null);
                          if (onOpenChat) {
                            onOpenChat({
                              bookingId: c.bookingId,
                              otherPersonName: c.otherUser?.name || 'User'
                            });
                          } else {
                            navigate('/my-bookings');
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--info-bg)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '14px',
                            flexShrink: 0
                          }}
                        >
                          {c.otherUser?.name ? c.otherUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>
                              {c.otherUser?.name || 'Service Partner'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {formatTime(c.updatedAt)}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.lastMessage ? c.lastMessage.text : `Booking: ${c.job?.title || 'Active Job'}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="nav-dropdown-footer">
                    <Link to="/my-bookings" onClick={() => setOpenMenu(null)}>
                      Manage All Bookings &amp; Chats →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFICATIONS DROPDOWN */}
            <div className="nav-dropdown-wrapper">
              <button
                type="button"
                className={`nav-icon-btn ${openMenu === 'notifications' ? 'active' : ''}`}
                onClick={() => toggleMenu('notifications')}
                title="Notifications"
              >
                <span>🔔</span> Notifications
                {unreadNotifs > 0 && <span className="nav-badge">{unreadNotifs}</span>}
              </button>

              {openMenu === 'notifications' && (
                <div className="nav-dropdown-menu">
                  {/* Tabs: Alerts vs Settings */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#FAFBFD' }}>
                    <button
                      type="button"
                      onClick={() => setNotifTab('alerts')}
                      style={{
                        flex: 1,
                        background: notifTab === 'alerts' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: notifTab === 'alerts' ? '2px solid var(--primary)' : 'none',
                        color: notifTab === 'alerts' ? 'var(--primary)' : 'var(--slate)',
                        fontWeight: 600,
                        fontSize: '13px',
                        padding: '10px 0',
                        cursor: 'pointer'
                      }}
                    >
                      🔔 Alerts {unreadNotifs > 0 && `(${unreadNotifs})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifTab('settings')}
                      style={{
                        flex: 1,
                        background: notifTab === 'settings' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: notifTab === 'settings' ? '2px solid var(--primary)' : 'none',
                        color: notifTab === 'settings' ? 'var(--primary)' : 'var(--slate)',
                        fontWeight: 600,
                        fontSize: '13px',
                        padding: '10px 0',
                        cursor: 'pointer'
                      }}
                    >
                      ⚙ Settings
                    </button>
                  </div>

                  {notifTab === 'alerts' ? (
                    <>
                      <div className="nav-dropdown-header" style={{ padding: '8px 16px', background: 'white' }}>
                        <span style={{ fontSize: '12px', color: 'var(--slate)' }}>Recent Activities</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {unreadNotifs > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllRead}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >
                              Mark all read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAll}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="nav-dropdown-body">
                        {loadingNotifs && <p style={{ padding: '16px', margin: 0, fontSize: '13px', color: 'var(--slate)' }}>Loading alerts...</p>}
                        {!loadingNotifs && notifications.length === 0 && (
                          <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                            <span style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}>🎉</span>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>You're all caught up!</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--slate)' }}>No new alerts at this time.</p>
                          </div>
                        )}

                        {!loadingNotifs && notifications.map((n) => {
                          const iconMeta = getNotifIcon(n.type);
                          return (
                            <div
                              key={n._id}
                              className={`notification-item ${!n.read ? 'unread' : ''}`}
                              onClick={() => handleMarkAsRead(n._id, n.link)}
                            >
                              <div className="notification-icon" style={{ background: iconMeta.bg }}>
                                {iconMeta.icon}
                              </div>
                              <div className="notification-content">
                                <div className="notification-title">{n.title}</div>
                                <div className="notification-desc">{n.message}</div>
                                <div className="notification-time">{formatTime(n.createdAt)}</div>
                              </div>
                              {!n.read && (
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '4px' }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    /* NOTIFICATION SETTINGS PANEL */
                    <div className="nav-dropdown-body" style={{ padding: '8px 0' }}>
                      <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Alert Preferences</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--slate)' }}>Customize which updates trigger notifications.</p>
                      </div>

                      <div className="setting-switch">
                        <div>
                          <div className="switch-label">Booking Requests &amp; Status</div>
                          <div className="switch-sublabel">Notify on booking confirmations &amp; updates</div>
                        </div>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={settings.bookingAlerts}
                          onChange={() => updateSetting('bookingAlerts')}
                        />
                      </div>

                      <div className="setting-switch">
                        <div>
                          <div className="switch-label">Direct Messages</div>
                          <div className="switch-sublabel">Notify on incoming messages from clients</div>
                        </div>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={settings.messageAlerts}
                          onChange={() => updateSetting('messageAlerts')}
                        />
                      </div>

                      <div className="setting-switch">
                        <div>
                          <div className="switch-label">Quote &amp; Bid Alerts</div>
                          <div className="switch-sublabel">Notify when a quote is submitted or accepted</div>
                        </div>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={settings.quoteAlerts}
                          onChange={() => updateSetting('quoteAlerts')}
                        />
                      </div>

                      <div className="setting-switch">
                        <div>
                          <div className="switch-label">Sound Notifications</div>
                          <div className="switch-sublabel">Play sound effect on new notifications</div>
                        </div>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={settings.sound}
                          onChange={() => updateSetting('sound')}
                        />
                      </div>

                      <div style={{ padding: '12px 16px', background: '#F9FAFB', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--slate)' }}>
                          ✓ Preferences saved automatically
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* USER PROFILE PILL */}
            <div
              className="user-pill"
              onClick={onProfileClick}
              title="Profile & Account Settings"
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div className="user-avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span>{user.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--slate)', marginLeft: '2px' }}>⚙️</span>
            </div>
          </>
        ) : (
          /* GUEST NAVIGATION */
          <>
            <Link to="/jobs">Browse Jobs</Link>
            <Link to="/register" className="btn-link">Register</Link>
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--navy)' }}>Login</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Navbar;