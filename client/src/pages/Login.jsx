import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginAs, setLoginAs] = useState('customer'); // cosmetic only

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setMessage('Login successful!');
        setTimeout(() => navigate('/'), 1000);
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '12px',
          background: 'var(--primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '18px', margin: '0 auto'
        }}>SS</div>
      </div>

      <div className="card">
        <h2 style={{ textAlign: 'center' }}>Welcome Back</h2>
        <p className="meta" style={{ textAlign: 'center', marginBottom: '20px' }}>Log in to continue to ServiceSync</p>

        <div style={{
          display: 'flex', background: 'var(--bg)', borderRadius: '999px',
          padding: '4px', marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setLoginAs('customer')}
            style={{
              flex: 1, borderRadius: '999px', padding: '8px',
              background: loginAs === 'customer' ? 'white' : 'transparent',
              color: loginAs === 'customer' ? 'var(--primary)' : 'var(--slate)',
              boxShadow: loginAs === 'customer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontSize: '13px'
            }}
          >
            I am a Client
          </button>
          <button
            type="button"
            onClick={() => setLoginAs('provider')}
            style={{
              flex: 1, borderRadius: '999px', padding: '8px',
              background: loginAs === 'provider' ? 'white' : 'transparent',
              color: loginAs === 'provider' ? 'var(--primary)' : 'var(--slate)',
              boxShadow: loginAs === 'provider' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontSize: '13px'
            }}
          >
            I am a Provider
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Email Address</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--slate)' }}>✉</span>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ paddingLeft: '34px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Password</label>
            <Link to="/login" style={{ fontSize: '12px' }}>Forgot password?</Link>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--slate)' }}>🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ paddingLeft: '34px', paddingRight: '50px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '8px', top: '7px',
                background: 'transparent', color: 'var(--slate)',
                padding: '4px 8px', fontSize: '12px'
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button type="submit" style={{ width: '100%', marginTop: '6px' }}>
            Sign In →
          </button>
        </form>

        {message && <p style={{ marginTop: '12px' }}>{message}</p>}

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px' }}>
          <Link to="/">Home</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;