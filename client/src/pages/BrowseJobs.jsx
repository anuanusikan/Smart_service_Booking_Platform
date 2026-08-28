import { useState, useEffect } from 'react';

function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState('');
  const [requestedJobs, setRequestedJobs] = useState({});
  const [filters, setFilters] = useState({ category: '', location: '', minBudget: '', maxBudget: '' });
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

    useEffect(() => {
    const isProvider = user?.role === 'provider';
    let url = isProvider
      ? 'http://localhost:5000/api/jobs/matched'
      : 'http://localhost:5000/api/jobs';

    if (!isProvider) {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.location) params.append('location', filters.location);
      if (filters.minBudget) params.append('minBudget', filters.minBudget);
      if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }

    const jobsPromise = fetch(url, {
      headers: isProvider ? { 'Authorization': `Bearer ${token}` } : {}
    }).then(res => res.json());

    const bookingsPromise = isProvider
      ? fetch('http://localhost:5000/api/bookings/mine', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
      : Promise.resolve([]);

    Promise.all([jobsPromise, bookingsPromise])
      .then(([jobsData, bookingsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);

        const requestedMap = {};
        (Array.isArray(bookingsData) ? bookingsData : []).forEach(b => {
          if (b.job?._id) requestedMap[b.job._id] = true;
        });
        setRequestedJobs(requestedMap);

        setInitialLoad(false);
      })
      .catch(() => setInitialLoad(false));
  }, [filters]);

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
        setMessage('Request sent! Check My Requests for status.');
        setRequestedJobs({ ...requestedJobs, [jobId]: true });
      } else {
        setMessage(data.message || 'Request failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

    if (initialLoad) return <p>Loading jobs...</p>;

  return (
    <div className="job-list">
      <h2>{user?.role === 'provider' ? 'Jobs Matched For You' : 'Available Jobs'}</h2>
            {user?.role !== 'provider' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <p className="eyebrow">Filter Jobs</p>
          <input
            type="text"
            placeholder="Category (e.g. Plumbing)"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location (e.g. Colombo)"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              placeholder="Min Budget"
              value={filters.minBudget}
              onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
            />
            <input
              type="number"
              placeholder="Max Budget"
              value={filters.maxBudget}
              onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
            />
          </div>
        </div>
      )}
      {message && <p><b>{message}</b></p>}
      {jobs.length === 0 && <p>No jobs posted yet.</p>}

      {jobs.map((job) => (
        <div key={job._id} className="card">
          <span className={`status-badge status-${job.status}`}>{job.status}</span>
          {typeof job.matchScore === 'number' && (
            <span className="status-badge status-accepted" style={{ marginLeft: '8px' }}>
              {job.matchScore}% match
            </span>
          )}
          <h3 style={{ marginTop: '10px' }}>{job.title}</h3>
          <p>{job.description}</p>
          <p className="meta"><b>Category:</b> {job.category}</p>
          <p className="meta"><b>Location:</b> {job.location}</p>
          <p className="meta"><b>Budget:</b> Rs. {job.budget}</p>

          {user?.role === 'provider' && job.status === 'open' && (
            <button
              onClick={() => handleRequest(job._id)}
              disabled={requestedJobs[job._id]}
              style={{
                marginTop: '10px',
                opacity: requestedJobs[job._id] ? 0.6 : 1,
                cursor: requestedJobs[job._id] ? 'default' : 'pointer'
              }}
            >
              {requestedJobs[job._id] ? 'Requested ✓' : 'Request This Job'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default BrowseJobs;