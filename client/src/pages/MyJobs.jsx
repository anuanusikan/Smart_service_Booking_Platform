import { useState, useEffect } from 'react';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://localhost:5000/api/jobs/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading your jobs...</p>;

  return (
    <div className="job-list">
      <h2>My Posted Jobs</h2>
      {jobs.length === 0 && <p>You haven't posted any jobs yet.</p>}

      {jobs.map((job) => (
        <div key={job._id} className="card">
          <span className={`status-badge status-${job.status}`}>{job.status}</span>
          <h3 style={{ marginTop: '10px' }}>{job.title}</h3>
          <p>{job.description}</p>
          <p className="meta"><b>Category:</b> {job.category}</p>
          <p className="meta"><b>Location:</b> {job.location}</p>
          <p className="meta"><b>Budget:</b> Rs. {job.budget}</p>
        </div>
      ))}
    </div>
  );
}

export default MyJobs;