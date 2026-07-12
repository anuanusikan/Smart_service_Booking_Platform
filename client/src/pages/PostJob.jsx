import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [message, setMessage] = useState('');
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
    setMessage('');

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to post a job.');
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
          // Note: no 'Content-Type' header here — the browser sets it
          // automatically for FormData, including the required boundary string
        },
        body: data
      });

      const result = await res.json();
      setUploading(false);

      if (res.ok) {
        setMessage('Job posted successfully!');
        setTimeout(() => navigate('/my-jobs'), 1000);
      } else {
        setMessage(result.message || 'Failed to post job');
      }
    } catch (err) {
      setUploading(false);
      setMessage('Server error. Please try again.');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Post a Job</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            placeholder="Job Title (e.g. Fix my sink)"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Describe the task in detail"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
          />

          <input
            type="text"
            name="category"
            placeholder="Category (e.g. Plumbing, Cleaning)"
            value={formData.category}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="location"
            placeholder="Location (e.g. Colombo)"
            value={formData.location}
            onChange={handleChange}
          />

          <input
            type="number"
            name="budget"
            placeholder="Budget (Rs.)"
            value={formData.budget}
            onChange={handleChange}
          />

          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
            Add photos (optional, up to 3)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />

          <button type="submit" disabled={uploading} style={{ marginTop: '10px' }}>
            {uploading ? 'Uploading...' : 'Post Job'}
          </button>
        </form>

        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

export default PostJob;