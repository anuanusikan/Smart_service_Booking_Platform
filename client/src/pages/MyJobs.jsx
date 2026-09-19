import { useState, useEffect } from 'react';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [openQuotesFor, setOpenQuotesFor] = useState(null);
  const [quotesByJob, setQuotesByJob] = useState({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const token = localStorage.getItem('token');

  const fetchJobs = () => {
    fetch('http://localhost:5000/api/jobs/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const startEditing = (job) => {
    setEditingId(job._id);
    setEditForm({
      title: job.title,
      description: job.description,
      category: job.category,
      location: job.location,
      budget: job.budget
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (jobId) => {
    setMessage('');

    if (editForm.title.trim().length < 3) {
      setMessage('Title must be at least 3 characters.');
      return;
    }
    if (editForm.description.trim().length < 10) {
      setMessage('Description must be at least 10 characters.');
      return;
    }
    if (editForm.budget && Number(editForm.budget) < 0) {
      setMessage('Budget cannot be negative.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Job updated successfully');
        setEditingId(null);
        fetchJobs();
      } else {
        setMessage(data.message || 'Update failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Job deleted');
        fetchJobs();
      } else {
        setMessage(data.message || 'Delete failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const toggleQuotes = async (jobId) => {
    if (openQuotesFor === jobId) {
      setOpenQuotesFor(null);
      return;
    }
    setOpenQuotesFor(jobId);

    if (!quotesByJob[jobId]) {
      setLoadingQuotes(true);
      try {
        const res = await fetch(`http://localhost:5000/api/quotes/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setQuotesByJob({ ...quotesByJob, [jobId]: Array.isArray(data) ? data : [] });
      } catch (err) {
        setMessage('Failed to load quotes.');
      }
      setLoadingQuotes(false);
    }
  };

  const acceptQuote = async (quoteId, jobId) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/quotes/${quoteId}/accept`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Quote accepted! A booking has been created — check My Bookings.');
        setOpenQuotesFor(null);
        fetchJobs();
      } else {
        setMessage(data.message || 'Failed to accept quote');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const declineQuote = async (quoteId, jobId) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/quotes/${quoteId}/decline`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        const updated = quotesByJob[jobId].map(q => q._id === quoteId ? { ...q, status: 'declined' } : q);
        setQuotesByJob({ ...quotesByJob, [jobId]: updated });
      } else {
        setMessage(data.message || 'Failed to decline quote');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  if (loading) return <p>Loading your jobs...</p>;

  return (
    <div className="job-list">
      <h2>My Posted Jobs</h2>
      {message && <p><b>{message}</b></p>}
      {jobs.length === 0 && <p>You haven't posted any jobs yet.</p>}

      {jobs.map((job) => (
        <div key={job._id} className="card">
          <span className={`status-badge status-${job.status}`}>{job.status}</span>

          {editingId === job._id ? (
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
              <input
                type="number"
                min="0"
                value={editForm.budget}
                onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
              />
              <button onClick={() => saveEdit(job._id)}>Save</button>
              {' '}
              <button onClick={cancelEditing} style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>Cancel</button>
            </div>
          ) : (
            <>
              <h3 style={{ marginTop: '10px' }}>{job.title}</h3>
              <p>{job.description}</p>
              <p className="meta"><b>Category:</b> {job.category}</p>
              <p className="meta"><b>Location:</b> {job.location}</p>
              <p className="meta"><b>Budget:</b> Rs. {job.budget}</p>

              {job.status === 'open' && (
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => toggleQuotes(job._id)}>
                    {openQuotesFor === job._id ? 'Hide Quotes' : 'View Quotes'}
                  </button>
                  {' '}
                  <button onClick={() => startEditing(job)} style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>Edit</button>
                  {' '}
                  <button onClick={() => deleteJob(job._id)} style={{ background: '#B5453A' }}>Delete</button>
                </div>
              )}

              {openQuotesFor === job._id && (
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <p className="eyebrow">Quotes Received</p>
                  {loadingQuotes && <p className="meta">Loading quotes...</p>}
                  {!loadingQuotes && (quotesByJob[job._id] || []).length === 0 && (
                    <p className="meta">No quotes yet.</p>
                  )}
                  {(quotesByJob[job._id] || []).map((quote) => (
                    <div key={quote._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{quote.provider?.name}</p>
                          <p className="meta" style={{ margin: 0 }}>
                            ⭐ {quote.provider?.rating ? quote.provider.rating.toFixed(1) : 'No rating'} · {quote.provider?.location}
                          </p>
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
                          Rs. {quote.price.toLocaleString()}
                        </p>
                      </div>
                      {quote.message && <p style={{ fontSize: '14px', margin: '6px 0' }}>{quote.message}</p>}

                      {quote.status === 'pending' ? (
                        <div style={{ marginTop: '6px' }}>
                          <button onClick={() => acceptQuote(quote._id, job._id)} className="btn-success">Accept & Book</button>
                          {' '}
                          <button onClick={() => declineQuote(quote._id, job._id)} style={{ background: '#B5453A' }}>Decline</button>
                        </div>
                      ) : (
                        <span className={`status-badge status-${quote.status}`}>{quote.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default MyJobs;