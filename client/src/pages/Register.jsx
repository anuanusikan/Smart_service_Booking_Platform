import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    location: ''
  });
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectRole = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (formData.name.trim().length < 2) {
      setMessage('Please enter your full name.');
      return;
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Create an account</h2>
        <p className="meta" style={{ marginBottom: '20px' }}>Choose your path below to get started.</p>

        <div
          onClick={() => selectRole('customer')}
          style={{
            border: formData.role === 'customer' ? '2px solid var(--success)' : '1.5px solid var(--border)',
            background: formData.role === 'customer' ? 'var(--success-bg)' : 'white',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '10px',
            cursor: 'pointer'
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--navy)' }}>👤 Sign up as a Customer</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--slate)' }}>✓ Get help fast &nbsp; ✓ Trusted professionals</p>
        </div>

        <div
          onClick={() => selectRole('provider')}
          style={{
            border: formData.role === 'provider' ? '2px solid var(--primary)' : '1.5px solid var(--border)',
            background: formData.role === 'provider' ? 'var(--info-bg)' : 'white',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            cursor: 'pointer'
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--navy)' }}>🧰 Sign up as a Service Provider</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--slate)' }}>✓ Grow your business &nbsp; ✓ Manage jobs easily</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Anu sikan"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="Anusikan@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '8px',
                background: 'transparent',
                color: 'var(--slate)',
                padding: '4px 8px',
                fontSize: '16px'
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Location</label>
          <input
            type="text"
            name="location"
            placeholder="(e.g. Colombo)"
            value={formData.location}
            onChange={handleChange}
          />

          <button type="submit" className="btn-success" style={{ width: '100%', marginTop: '6px' }}>
            Create Account →
          </button>
        </form>

        {message && <p style={{ marginTop: '12px' }}>{message}</p>}

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;