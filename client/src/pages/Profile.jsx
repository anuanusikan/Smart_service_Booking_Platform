import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

function Profile({ onClose, onProfileUpdate }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'settings'
  const [form, setForm] = useState({});
  const [picFile, setPicFile] = useState(null);
  const [picPreview, setPicPreview] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [notifSettings, setNotifSettings] = useState(() => {
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

  const token = localStorage.getItem('token');

  const fetchProfile = async () => {
  try {
    const data = await authApi.getMe();

    setProfile(data);

    setForm({
      name: data.name || '',
      phone: data.phone || '',
      location: data.location || '',
      hourlyRate: data.hourlyRate || '',
      skills: (data.skills || []).join(', ')
    });

    if (data.profilePicture) {
      setPicPreview(data.profilePicture);
    }

    setLoading(false);
  } catch {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPicFile(file);
      setPicPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (picFile) data.append('profilePicture', picFile);

    try {
      const result = await authApi.updateProfile(data);

        if (result.ok) {
        setMessage({ type: 'success', text: '✓ Profile updated successfully.' });
        
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...storedUser,
          name: result.user.name,
          profilePicture: result.user.profilePicture || storedUser.profilePicture || ''
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        if (onProfileUpdate) onProfileUpdate();
        setEditing(false);
        fetchProfile();
      } else {
        setMessage({ type: 'error', text: result.message || 'Update failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifSetting = (key) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    localStorage.setItem('serviceSync_notif_settings', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onProfileUpdate) onProfileUpdate();
    onClose();
    navigate('/');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(17, 24, 39, 0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        zIndex: 2000, padding: '16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '420px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          background: 'white', borderRadius: '16px', padding: '24px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column'
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Profile &amp; Settings</h3>
          <button onClick={onClose} style={{ background: 'var(--bg)', color: 'var(--slate)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1, background: 'none', border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--slate)',
              fontWeight: 600, padding: '8px 0', fontSize: '13px'
            }}
          >
            👤 My Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              flex: 1, background: 'none', border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'settings' ? 'var(--primary)' : 'var(--slate)',
              fontWeight: 600, padding: '8px 0', fontSize: '13px'
            }}
          >
            ⚙️ Preferences
          </button>
        </div>

        {loading && <p style={{ padding: '20px 0' }}>Loading profile details...</p>}
        {!loading && !profile && <p style={{ color: 'var(--danger)' }}>Could not load profile.</p>}

        {!loading && profile && activeTab === 'profile' && (
          <>
            {/* AVATAR & BASIC SUMMARY */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '12px', background: 'var(--bg)', borderRadius: '12px' }}>
              <div style={{ position: 'relative' }}>
                {picPreview ? (
                  <img
                    src={picPreview}
                    alt="Profile"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'var(--primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '24px'
                    }}
                  >
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute', bottom: '2px', right: '2px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: 'var(--success)', border: '2px solid white'
                  }}
                />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--navy)' }}>{profile.name}</h4>
                <p className="meta" style={{ margin: '2px 0 0' }}>
                  {profile.role === 'provider' ? '🛠️ Verified Provider' : '👤 Client Member'}
                </p>
                <p className="meta" style={{ margin: '2px 0 0', fontSize: '11px' }}>
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {message.text && (
              <div style={{
                padding: '10px 12px', borderRadius: '8px', marginBottom: '14px',
                fontSize: '13px', fontWeight: 600,
                background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: message.type === 'success' ? 'var(--success-dark)' : 'var(--danger)'
              }}>
                {message.text}
              </div>
            )}

            {!editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <p className="eyebrow" style={{ margin: 0, fontSize: '11px' }}>Email Address</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', color: 'var(--navy)', fontWeight: 500 }}>{profile.email}</p>
                </div>

                <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <p className="eyebrow" style={{ margin: 0, fontSize: '11px' }}>Phone Number</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', color: 'var(--navy)', fontWeight: 500 }}>{profile.phone || 'Not added yet'}</p>
                </div>

                <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <p className="eyebrow" style={{ margin: 0, fontSize: '11px' }}>Location / City</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', color: 'var(--navy)', fontWeight: 500 }}>{profile.location || 'Not set'}</p>
                </div>

                {profile.role === 'provider' && (
                  <>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <p className="eyebrow" style={{ margin: 0, fontSize: '11px' }}>Skills</p>
                      <p style={{ margin: '2px 0 0', fontSize: '14px', color: 'var(--navy)', fontWeight: 500 }}>
                        {(profile.skills || []).join(', ') || 'No skills added'}
                      </p>
                    </div>

                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <p className="eyebrow" style={{ margin: 0, fontSize: '11px' }}>Hourly Rate</p>
                      <p style={{ margin: '2px 0 0', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>
                        Rs. {profile.hourlyRate || 0} / hour
                      </p>
                    </div>
                  </>
                )}

                <button onClick={() => setEditing(true)} style={{ marginTop: '10px' }}>
                  ✏️ Edit Profile Details
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Upload New Photo</label>
                <input type="file" accept="image/*" onChange={handlePicChange} style={{ fontSize: '12px' }} />

                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Phone</label>
                <input type="text" placeholder="+94 77 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Location / City</label>
                <input type="text" placeholder="e.g. Colombo" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />

                {profile.role === 'provider' && (
                  <>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Skills (comma-separated)</label>
                    <input type="text" placeholder="Plumbing, Electrical, Carpentry" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />

                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Hourly Rate (Rs.)</label>
                    <input type="number" min="0" placeholder="1500" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                  </>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="submit" disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* TAB: PREFERENCES & SETTINGS */}
        {!loading && profile && activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>Notification Alerts</p>

            <div className="setting-switch" style={{ background: 'var(--bg)', borderRadius: '8px' }}>
              <div>
                <div className="switch-label">Booking Inquiries</div>
                <div className="switch-sublabel">Alert on new requests &amp; status</div>
              </div>
              <input
                type="checkbox"
                className="switch-input"
                checked={notifSettings.bookingAlerts}
                onChange={() => toggleNotifSetting('bookingAlerts')}
              />
            </div>

            <div className="setting-switch" style={{ background: 'var(--bg)', borderRadius: '8px' }}>
              <div>
                <div className="switch-label">Direct Messages</div>
                <div className="switch-sublabel">Alert on incoming chat messages</div>
              </div>
              <input
                type="checkbox"
                className="switch-input"
                checked={notifSettings.messageAlerts}
                onChange={() => toggleNotifSetting('messageAlerts')}
              />
            </div>

            <div className="setting-switch" style={{ background: 'var(--bg)', borderRadius: '8px' }}>
              <div>
                <div className="switch-label">Quote &amp; Bid Alerts</div>
                <div className="switch-sublabel">Alert when quotes are accepted</div>
              </div>
              <input
                type="checkbox"
                className="switch-input"
                checked={notifSettings.quoteAlerts}
                onChange={() => toggleNotifSetting('quoteAlerts')}
              />
            </div>

            <div className="setting-switch" style={{ background: 'var(--bg)', borderRadius: '8px' }}>
              <div>
                <div className="switch-label">Sound Effects</div>
                <div className="switch-sublabel">Audio chimes for notifications</div>
              </div>
              <input
                type="checkbox"
                className="switch-input"
                checked={notifSettings.sound}
                onChange={() => toggleNotifSetting('sound')}
              />
            </div>
          </div>
        )}

        {/* LOGOUT BUTTON */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600 }}
          >
            ⏻ Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;