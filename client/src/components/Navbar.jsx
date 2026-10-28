import { customerNavigation, providerNavigation } from '../utils/portalNavigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { messagesApi, notificationsApi } from '../services/api';
import useNotificationSettings from '../hooks/useNotificationSettings';
import { notificationEnabled, readNotificationSettings, hasNewAlert } from '../utils/notificationSettings';
import { prepareNotificationSound, playNotificationSound } from '../utils/notificationSound';

function Navbar({ onProfileClick, user, onOpenChat }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isPublicPage = ['/', '/login', '/register'].includes(pathname);
  const dashboardPath = user?.role === 'provider' ? '/provider-dashboard' : '/dashboard';

  const [openMenu, setOpenMenu] = useState(null); // null | 'messages' | 'notifications' | 'navigation'
  useEffect(() => {
    const onEscape = event => { if (event.key === 'Escape') setOpenMenu(null); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);
  const [notifTab, setNotifTab] = useState('alerts'); // 'alerts' | 'settings'
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notificationPages, setNotificationPages] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const seenPreferences = useRef(null);
  const seenMessages = useRef(null);

  const userId = user?.id || user?._id;
  const [settings, updateSetting, settingsSyncStatus] = useNotificationSettings(userId);
  const visibleNotifications = notifications.filter(item => notificationEnabled(item, settings));
  const unreadNotifs = totalUnread;
  const notificationTypes = ['system', ...(settings.bookingAlerts ? ['booking_request', 'booking_status'] : []),
    ...(settings.quoteAlerts ? ['quote_received', 'quote_status'] : [])].join(',');
  const unreadMessages = conversations.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  const seenNotifications = useRef(null);
  const notificationsInFlight = useRef(false);
  const conversationsInFlight = useRef(false);

  useEffect(() => {
    const unlockSound = () => {
      const preferences = readNotificationSettings(userId);
      if (preferences.sound || preferences.messageSound) prepareNotificationSound();
    };
    window.addEventListener('pointerdown', unlockSound);
    window.addEventListener('keydown', unlockSound);
    return () => {
      window.removeEventListener('pointerdown', unlockSound);
      window.removeEventListener('keydown', unlockSound);
    };
  }, [userId]);

  const menuRef = useRef(null);
  const token = sessionStorage.getItem('token');

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

  const fetchConversations = useCallback(async () => {
    if (!token || !userId || conversationsInFlight.current) return;
    conversationsInFlight.current = true;
    setLoadingChats(true);
    try {
      const data = await messagesApi.getConversations();
      if (sessionStorage.getItem('token') !== token) return;
      if (Array.isArray(data)) {
        const preferences = readNotificationSettings(userId);
        const incoming = data.filter(chat => chat.unreadCount > 0 && chat.lastMessage?.sender?._id !== userId);
        if (seenMessages.current && preferences.messageSound &&
          incoming.some(chat => chat.lastMessage?._id && !seenMessages.current.has(chat.lastMessage._id))) playNotificationSound();
        if (!seenMessages.current) seenMessages.current = new Set();
        data.forEach(chat => { if (chat.lastMessage?._id) seenMessages.current.add(chat.lastMessage._id); });
      }
      setConversations(Array.isArray(data) ? data : []);
    } finally {
      conversationsInFlight.current = false;
      setLoadingChats(false);
    }
  }, [token, userId]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !userId || notificationsInFlight.current) return;
    notificationsInFlight.current = true;
    setLoadingNotifs(true);
    try {
      const collected = [];
      let data;
      for (let page = 1; page <= notificationPages; page += 1) {
        data = await notificationsApi.getNotifications(page, notificationTypes);
        if (!data || !Array.isArray(data.notifications)) {
          setNotificationError('Could not load alerts. Please try again.');
          return;
        }
        collected.push(...data.notifications);
        if (!data.hasMore) break;
      }
      if (sessionStorage.getItem('token') !== token) return;
      const latest = readNotificationSettings(userId);
      const latestTypes = ['system', ...(latest.bookingAlerts ? ['booking_request', 'booking_status'] : []),
        ...(latest.quoteAlerts ? ['quote_received', 'quote_status'] : [])].join(',');
      if (latestTypes !== notificationTypes) return;
      if (data && Array.isArray(data.notifications)) {
        const currentSettings = readNotificationSettings(userId);
        // Initial history is silent. Record disabled and read alerts too so
        // changing preferences or reopening the menu never replays them.
        if (seenPreferences.current === notificationTypes && seenNotifications.current && currentSettings.sound &&
            hasNewAlert(collected.slice(0, 30), seenNotifications.current, currentSettings)) {
          playNotificationSound();
        }
        if (!seenNotifications.current) seenNotifications.current = new Set();
        collected.forEach(item => seenNotifications.current.add(item._id));
        seenPreferences.current = notificationTypes;
        setNotifications([...new Map(collected.map(item => [item._id, item])).values()]);
        setTotalUnread(data.unreadCount);
        setHasMoreNotifications(data.hasMore);
        setNotificationError('');
      }
    } finally {
      notificationsInFlight.current = false;
      setLoadingNotifs(false);
    }
  }, [token, userId, notificationPages, notificationTypes]);

  useEffect(() => {
    window.addEventListener('messagesRead', fetchConversations);
    return () => window.removeEventListener('messagesRead', fetchConversations);
  }, [fetchConversations]);

  useEffect(() => {
    if (!userId || !token) return;
    fetchNotifications();
    fetchConversations();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchConversations();
    }, 8000);
    return () => clearInterval(interval);
  }, [userId, token, fetchNotifications, fetchConversations]);

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
      const result = await notificationsApi.markAsRead(notifId);
      if (!result.ok) return;
      if (notifications.some(n => n._id === notifId && !n.read)) setTotalUnread(count => Math.max(0, count - 1));
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
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
      const result = await notificationsApi.markAllAsRead();
      if (!result.ok) return;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setTotalUnread(0);
    } catch (err) {
      // ignore
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await notificationsApi.clearAll();
      if (!result.ok) return;
      setNotifications([]);
      setTotalUnread(0);
      setHasMoreNotifications(false);
      setNotificationPages(1);
    } catch (err) {
      // ignore
    }
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
    <div className={`navbar${isPublicPage || !user ? ' navbar-public' : ''}`} ref={menuRef}>
      {user && !isPublicPage && (
<div className="nav-dropdown-wrapper mobile-portal-navigation">
              <button type="button" className={`nav-icon-btn ${openMenu === 'navigation' ? 'active' : ''}`}
                aria-label="Navigation menu" aria-expanded={openMenu === 'navigation'} aria-controls="mobile-portal-links"
                onClick={() => toggleMenu('navigation')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d={openMenu === 'navigation' ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
              {openMenu === 'navigation' && (
                <nav id="mobile-portal-links" className="nav-dropdown-menu mobile-portal-links" aria-label="Dashboard navigation">
                  <div className="nav-dropdown-header">{user.role === 'provider' ? 'Provider menu' : 'Customer menu'}</div>
                  {(user.role === 'provider' ? providerNavigation : customerNavigation).map(item => (
                    <Link key={item.path} to={item.path} aria-current={pathname === item.path ? 'page' : undefined}
                      onClick={() => setOpenMenu(null)}>
                      <span aria-hidden="true">{item.icon}</span>{item.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
      )}
      <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to={isPublicPage || !user ? '/' : dashboardPath} className="logo">
          <span style={{ fontSize: '22px' }}>⚡</span> ServiceSync
        </Link>
        {!isPublicPage && user?.role === 'provider' && (
          <span className="portal-label"
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
        {!isPublicPage && user?.role === 'customer' && (
          <span className="portal-label"
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
        {user && !isPublicPage ? (
          <>

            {/* MESSAGES DROPDOWN */}
            <div className="nav-dropdown-wrapper">
              <button
                type="button"
                className={`nav-icon-btn ${openMenu === 'messages' ? 'active' : ''}`}
                onClick={() => toggleMenu('messages')}
                title="Messages"
                aria-label="Messages"
                aria-expanded={openMenu === 'messages'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 6 9 7 9-7" />
                </svg>
                <span className="nav-action-label">Messages</span>
                {settings.messageAlerts && unreadMessages > 0 && (
                  <span className="nav-badge" style={{ background: 'var(--primary)' }}>
                    {unreadMessages}
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
                    <div className="setting-switch">
                      <label className="switch-label" htmlFor="message-alerts">Unread message badge</label>
                      <input id="message-alerts" type="checkbox" className="switch-input" checked={settings.messageAlerts} onChange={() => updateSetting('messageAlerts')} />
                    </div>
                    <div className="setting-switch">
                      <label className="switch-label" htmlFor="message-sound">Message sound</label>
                      <input id="message-sound" type="checkbox" className="switch-input" checked={settings.messageSound} onChange={() => updateSetting('messageSound')} />
                    </div>
                    <p role="status" style={{ padding: '0 16px', fontSize: 11 }}>{settingsSyncStatus}</p>
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
                              {c.unreadCount > 0 && <span style={{ marginLeft: 8, color: 'var(--primary)', fontSize: 11 }}>{c.unreadCount} unread</span>}
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
                title="Unread alerts matching your preferences"
                aria-label="Notifications"
                aria-expanded={openMenu === 'notifications'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
                <span className="nav-action-label">Notifications</span>
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
                        <span style={{ fontSize: '12px', color: 'var(--slate)' }}>Your notifications</span>
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
                          {visibleNotifications.length > 0 && (
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
                        {notificationError && <p role="alert" style={{ padding: '12px 16px', color: 'var(--danger)' }}>{notificationError} <button type="button" onClick={fetchNotifications}>Retry</button></p>}
                        {loadingNotifs && <p style={{ padding: '16px', margin: 0, fontSize: '13px', color: 'var(--slate)' }}>Loading alerts...</p>}
                        {!loadingNotifs && visibleNotifications.length === 0 && (
                          <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                            <span style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}>🎉</span>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>You're all caught up!</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--slate)' }}>No alerts matching your preferences.</p>
                          </div>
                        )}

                        {!loadingNotifs && visibleNotifications.map((n) => {
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
                        {hasMoreNotifications && <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button type="button" className="btn-outline btn-sm" disabled={loadingNotifs}
                            onClick={() => setNotificationPages(pages => pages + 1)}>
                            {loadingNotifs ? 'Loading...' : 'Load more'}
                          </button>
                        </div>}
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
                          aria-label="Booking alerts"
                checked={settings.bookingAlerts}
                          onChange={() => updateSetting('bookingAlerts')}
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
                          aria-label="Quote alerts"
                checked={settings.quoteAlerts}
                          onChange={() => updateSetting('quoteAlerts')}
                        />
                      </div>

                      <div className="setting-switch">
                        <div>
                          <div className="switch-label">Sound Notifications</div>
                          <div className="switch-sublabel">Play a gentle chime for new enabled alerts</div>
                        </div>
                        <input
                          type="checkbox"
                          className="switch-input"
                          aria-label="Notification sound"
                checked={settings.sound}
                          onChange={() => updateSetting('sound')}
                        />
                      </div>

                      <div style={{ padding: '12px 16px', background: '#F9FAFB', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--slate)' }}>
                          {settingsSyncStatus}
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
              role="button"
              tabIndex={0}
              aria-label="Profile and account settings"
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onProfileClick(); } }}
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : null}
              <div
                className="user-avatar-circle"
                style={{ display: user?.profilePicture ? 'none' : 'flex' }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span>{user.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--slate)', marginLeft: '2px' }}>⚙️</span>
            </div>
          </>
        ) : (
          /* GUEST NAVIGATION */
          <>
            <Link to="/jobs">Browse Jobs</Link>
            {user ? (
              <Link to={dashboardPath} className="btn-link">Dashboard</Link>
            ) : (
              <>
                <Link to="/register">Register</Link>
                <Link to="/login" className="public-login">Login</Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Navbar;
