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
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const token = localStorage.getItem('token');

    if (!token) {
      setMessage('You must be logged in to post a job.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Job posted successfully!');
        setTimeout(() => navigate('/jobs'), 1000);
      } else {
        setMessage(data.message || 'Failed to post job');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '50px auto' }}>
      <h2>Post a Job</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Job Title (e.g. Fix my sink)"
          value={formData.title}
          onChange={handleChange}
          required
        /><br /><br />

        <textarea
          name="description"
          placeholder="Describe the task in detail"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          style={{ width: '100%' }}
        /><br /><br />

        <input
          type="text"
          name="category"
          placeholder="Category (e.g. Plumbing, Cleaning)"
          value={formData.category}
          onChange={handleChange}
          required
        /><br /><br />

        <input
          type="text"
          name="location"
          placeholder="Location (e.g. Colombo)"
          value={formData.location}
          onChange={handleChange}
        /><br /><br />

        <input
          type="number"
          name="budget"
          placeholder="Budget (Rs.)"
          value={formData.budget}
          onChange={handleChange}
        /><br /><br />

        <button type="submit">Post Job</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default PostJob;