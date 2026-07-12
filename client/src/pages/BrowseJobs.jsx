import { useState, useEffect } from 'react';

function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://localhost:5000/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRequest = async (jobId) => {
    setMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Request sent! Check My Bookings for status.');
      } else {
        setMessage(data.message || 'Request failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  if (loading) return <p>Loading jobs...</p>;

  return (
    <div className="job-list">
      <h2>Browse Jobs</h2>
      {message && <p><b>{message}</b></p>}
      {jobs.length === 0 && <p>No jobs posted yet.</p>}

      {jobs.map((job) => (
        <div key={job._id} className="card">
          <span className={`status-badge status-${job.status}`}>{job.status}</span>
          <h3 style={{ marginTop: '10px' }}>{job.title}</h3>
          <p>{job.description}</p>
          <p className="meta"><b>Category:</b> {job.category}</p>
          <p className="meta"><b>Location:</b> {job.location}</p>
          <p className="meta"><b>Budget:</b> Rs. {job.budget}</p>
          <p className="meta"><b>Posted by:</b> {job.postedBy?.name}</p>

          {user?.role === 'provider' && job.status === 'open' && (
            <button onClick={() => handleRequest(job._id)} style={{ marginTop: '10px' }}>Request This Job</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default BrowseJobs;