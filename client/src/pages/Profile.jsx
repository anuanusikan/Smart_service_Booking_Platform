import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile({ onClose }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [picFile, setPicFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  const fetchProfile = () => {
    fetch('http://localhost:5000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          location: data.location || '',
          hourlyRate: data.hourlyRate || '',
          skills: (data.skills || []).join(', ')
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (picFile) data.append('profilePicture', picFile);

    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });
      const result = await res.json();

      if (res.ok) {
        setMessage('Profile updated successfully.');
        localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user')), name: result.user.name }));
        setEditing(false);
        fetchProfile();
      } else {
        setMessage(result.message || 'Update failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onClose();
    navigate('/');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(17, 24, 39, 0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        zIndex: 1000, padding: '80px 24px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px', maxHeight: '85vh', overflowY: 'auto',
          background: 'white', borderRadius: '12px', padding: '24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--slate)', padding: '2px 8px' }}>✕</button>
        </div>

        {loading && <p>Loading profile...</p>}
        {!loading && !profile && <p>Could not load profile.</p>}

        {!loading && profile && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <img
                src={profile.profilePicture || 'https://via.placeholder.com/64x64.png?text=%20'}
                alt="Profile"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
              />
              <div>
                <h3 style={{ margin: 0 }}>{profile.name}</h3>
                <p className="meta" style={{ margin: 0 }}>
                  Member since {new Date(profile.createdAt).getFullYear()}
                </p>
              </div>
            </div>

            {!editing ? (
              <>
                <p className="meta">📞 {profile.phone || 'No phone number added'}</p>
                <p className="meta">✉ {profile.email}</p>
                <p className="meta">📍 {profile.location || 'No location set'}</p>
                {profile.role === 'provider' && (
                  <>
                    <p className="meta">🛠 Skills: {(profile.skills || []).join(', ') || 'None listed'}</p>
                    <p className="meta">💰 Rate: Rs. {profile.hourlyRate || 0} / hour</p>
                  </>
                )}

                <button onClick={() => setEditing(true)} style={{ width: '100%', marginTop: '14px' }}>
                  Edit Profile Details
                </button>
              </>
            ) : (
              <form onSubmit={handleSave}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Profile Picture</label>
                <input type="file" accept="image/*" onChange={(e) => setPicFile(e.target.files[0])} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 123 4567" />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Location</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />

                {profile.role === 'provider' && (
                  <>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Skills (comma-separated)</label>
                    <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Plumbing, Electrical" />

                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Hourly Rate (Rs.)</label>
                    <input type="number" min="0" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                  </>
                )}

                <button type="submit" style={{ width: '100%' }}>Save Changes</button>
                {' '}
                <button type="button" onClick={() => setEditing(false)} style={{ width: '100%', marginTop: '8px', background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </form>
            )}

            {message && <p style={{ marginTop: '12px' }}>{message}</p>}

            <button onClick={handleLogout} style={{ width: '100%', marginTop: '16px', background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              ⏻ Sign Out {profile.name}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;