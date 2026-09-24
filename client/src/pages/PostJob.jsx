import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerPortalLayout from '../components/CustomerPortalLayout';

function PostJob() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    budget: ''
  });
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files).slice(0, 3);
    setImages(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.title.trim().length < 3) {
      setMessage({ type: 'error', text: 'Title must be at least 3 characters.' });
      return;
    }
    if (formData.description.trim().length < 10) {
      setMessage({ type: 'error', text: 'Description must be at least 10 characters.' });
      return;
    }
    if (formData.budget && Number(formData.budget) < 0) {
      setMessage({ type: 'error', text: 'Budget cannot be negative.' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', text: 'You must be logged in to post a job.' });
      return;
    }

    setUploading(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('location', formData.location);
    data.append('budget', formData.budget);
    images.forEach((img) => data.append('images', img));

    try {
      const res = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      const result = await res.json();
      setUploading(false);

      if (res.ok) {
        setMessage({ type: 'success', text: '✓ Job posted successfully! Redirecting to My Jobs...' });
        setTimeout(() => navigate('/my-jobs'), 1200);
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to post job' });
      }
    } catch (err) {
      setUploading(false);
      setMessage({ type: 'error', text: 'Server error. Please try again.' });
    }
  };

  return (
    <CustomerPortalLayout
      title="Post a New Job"
      subtitle="Publish your service need and receive competitive quotes from skilled local providers."
    >
      <div className="card" style={{ maxWidth: '750px' }}>
        {message.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontWeight: 600,
              fontSize: '14px',
              background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: message.type === 'success' ? 'var(--success-dark)' : 'var(--danger)'
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Job Title</label>
          <input
            type="text"
            name="title"
            placeholder="e.g. Need plumber to fix bathroom sink leakage"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Detailed Description</label>
          <textarea
            name="description"
            placeholder="Describe the problem, requirements, and timing in detail..."
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Service Category</label>
              <input
                type="text"
                name="category"
                placeholder="e.g. Plumbing, Electrical, Cleaning"
                value={formData.category}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Location / Area</label>
              <input
                type="text"
                name="location"
                placeholder="e.g. Colombo 03"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Estimated Budget (Rs.)</label>
          <input
            type="number"
            name="budget"
            min="0"
            placeholder="e.g. 5000"
            value={formData.budget}
            onChange={handleChange}
          />

          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>
            Attach Photos (optional, up to 3)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            style={{ fontSize: '13px' }}
          />

          <button type="submit" disabled={uploading} className="btn-success" style={{ width: '100%', marginTop: '10px' }}>
            {uploading ? 'Publishing job...' : 'Publish Job Listing →'}
          </button>
        </form>
      </div>
    </CustomerPortalLayout>
  );
}

export default PostJob;