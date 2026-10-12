import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';

function ProviderPortalLayout({ children, title, subtitle, extraAction }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const readUser = () => {
    try {
      const item = sessionStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(readUser);

  useEffect(() => {
    const handleUpdate = () => {
      setUser(readUser());
    };

    window.addEventListener('userProfileUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Sync with backend on mount if profile picture is missing
    const token = sessionStorage.getItem('token');
    if (token) {
      authApi.getMe().then((me) => {
        if (me && me.profilePicture && me.profilePicture !== user?.profilePicture) {
          const stored = readUser() || {};
          const synced = { ...stored, profilePicture: me.profilePicture };
          sessionStorage.setItem('user', JSON.stringify(synced));
          setUser(synced);
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('userProfileUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/provider-dashboard', icon: '📊' },
    { label: 'Matched Jobs', path: '/jobs', icon: '💼' },
    { label: 'My Quotes', path: '/my-quotes', icon: 'Q' },
    { label: 'My Requests', path: '/my-bookings', icon: '📋' },
    { label: 'Earnings', path: '/provider-earnings', icon: '💰' },
    { label: 'Reviews', path: '/my-reviews', icon: '⭐' },
    { label: 'Schedule', path: '/provider-schedule', icon: '📅' },
  ];

  return (
    <div className="dash-layout">
      {/* PERSISTENT PROVIDER SIDEBAR */}
      <aside className="dash-sidebar">
        {/* PROFILE PHOTO & NAME (ABOVE DASHBOARD) */}
        <div style={{
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* PROFILE PHOTO */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user?.name || 'Provider'}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : null}
            <div
              style={{
                display: user?.profilePicture ? 'none' : 'flex',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                color: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(41, 84, 229, 0.25)'
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--success)',
                border: '2px solid white'
              }}
              title="Online"
            />
          </div>

          <p style={{
            margin: 0,
            fontWeight: 700,
            fontSize: '14px',
            color: 'var(--navy)',
            maxWidth: '190px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {user?.name || 'Service Provider'}
          </p>

          <span className="status-badge status-open" style={{ fontSize: '10px', padding: '1px 8px', marginTop: '4px' }}>
            Active Provider
          </span>
        </div>

        {/* NAVIGATION LINKS */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? 'active' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="dash-content">
        {(title || extraAction) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              {title && <h2 style={{ margin: 0 }}>{title}</h2>}
              {subtitle && <p className="meta" style={{ margin: '4px 0 0' }}>{subtitle}</p>}
            </div>
            {extraAction && <div>{extraAction}</div>}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}

export default ProviderPortalLayout;
