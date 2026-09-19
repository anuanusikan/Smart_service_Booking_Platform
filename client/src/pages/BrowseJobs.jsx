import { useState, useEffect } from 'react';

function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState('');
  const [quotedJobs, setQuotedJobs] = useState({});
  const [quoteForms, setQuoteForms] = useState({}); // { jobId: { price, message } }
  const [openQuoteForm, setOpenQuoteForm] = useState(null);
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

    const quotesPromise = isProvider
      ? fetch('http://localhost:5000/api/quotes/mine', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
      : Promise.resolve([]);

    Promise.all([jobsPromise, quotesPromise])
      .then(([jobsData, quotesData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : []);

        const quotedMap = {};
        (Array.isArray(quotesData) ? quotesData : []).forEach(q => {
          if (q.job?._id && q.status === 'pending') quotedMap[q.job._id] = true;
        });
        setQuotedJobs(quotedMap);

        setInitialLoad(false);
      })
      .catch(() => setInitialLoad(false));
  }, [filters]);

  const updateQuoteForm = (jobId, field, value) => {
    setQuoteForms({
      ...quoteForms,
      [jobId]: { ...quoteForms[jobId], [field]: value }
    });
  };

  const submitQuote = async (jobId) => {
    setMessage('');
    const form = quoteForms[jobId] || {};

    if (!form.price || Number(form.price) <= 0) {
      setMessage('Please enter a valid price.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId, price: Number(form.price), message: form.message || '' })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Quote submitted! Check My Requests for status.');
        setQuotedJobs({ ...quotedJobs, [jobId]: true });
        setOpenQuoteForm(null);
      } else {
        setMessage(data.message || 'Failed to submit quote');
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
          <p className="meta"><b>Customer's Budget:</b> Rs. {job.budget}</p>

          {user?.role === 'provider' && job.status === 'open' && !quotedJobs[job._id] && (
            <>
              {openQuoteForm !== job._id ? (
                <button onClick={() => setOpenQuoteForm(job._id)} style={{ marginTop: '10px' }}>
                  Submit a Quote
                </button>
              ) : (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Your Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2500"
                    value={quoteForms[job._id]?.price || ''}
                    onChange={(e) => updateQuoteForm(job._id, 'price', e.target.value)}
                  />
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Message (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly explain your quote..."
                    value={quoteForms[job._id]?.message || ''}
                    onChange={(e) => updateQuoteForm(job._id, 'message', e.target.value)}
                  />
                  <button onClick={() => submitQuote(job._id)} className="btn-success">Send Quote</button>
                  {' '}
                  <button type="button" onClick={() => setOpenQuoteForm(null)} style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {user?.role === 'provider' && quotedJobs[job._id] && (
            <p className="meta" style={{ marginTop: '10px', fontWeight: 600 }}>✓ Quote submitted — awaiting response</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default BrowseJobs;