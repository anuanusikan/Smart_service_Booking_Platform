import { useState, useEffect } from 'react';

function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading jobs...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto' }}>
      <h2>Browse Jobs</h2>
      {jobs.length === 0 && <p>No jobs posted yet.</p>}

      {jobs.map((job) => (
        <div key={job._id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px' }}>
          <h3>{job.title}</h3>
          <p>{job.description}</p>
          <p><b>Category:</b> {job.category}</p>
          <p><b>Location:</b> {job.location}</p>
          <p><b>Budget:</b> Rs. {job.budget}</p>
          <p><b>Posted by:</b> {job.postedBy?.name}</p>
          <p><b>Status:</b> {job.status}</p>
        </div>
      ))}
    </div>
  );
}

export default BrowseJobs;