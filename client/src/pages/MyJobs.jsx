import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerPortalLayout from '../components/CustomerPortalLayout';

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
    if (!window.confirm('Are you sure you want to delete this job listing?')) return;

    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Job deleted successfully');
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
        setMessage('Quote accepted! A booking has been created — check Booking Requests.');
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
        const updated = (quotesByJob[jobId] || []).map(q => q._id === quoteId ? { ...q, status: 'declined' } : q);
        setQuotesByJob({ ...quotesByJob, [jobId]: updated });
      } else {
        setMessage(data.message || 'Failed to decline quote');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  if (loading) {
    return (
      <CustomerPortalLayout title="My Posted Jobs" subtitle="Loading job listings...">
        <p style={{ padding: '24px' }}>Loading your jobs...</p>
      </CustomerPortalLayout>
    );
  }

  return (
    <CustomerPortalLayout
      title="My Posted Jobs"
      subtitle="Manage your active job posts, review provider bids, and select the best offer."
    >
      {message && (
        <div style={{ padding: '10px 14px', background: 'var(--info-bg)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📝</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--navy)' }}>You haven't posted any jobs yet</p>
          <p className="meta" style={{ margin: '4px 0 16px' }}>Post a job to get quotes from verified local providers.</p>
          <Link to="/post-job"><button className="btn-success">+ Post Your First Job</button></Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {jobs.map((job) => (
          <div key={job._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`status-badge status-${job.status}`}>{job.status}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                Budget: Rs. {job.budget?.toLocaleString()}
              </span>
            </div>

            {editingId === job._id ? (
              <div style={{ marginTop: '14px', background: 'var(--bg)', padding: '16px', borderRadius: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Job Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                </div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Budget (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button onClick={() => saveEdit(job._id)}>Save Changes</button>
                  <button onClick={cancelEditing} style={{ background: 'white', color: 'var(--navy)', border: '1px solid var(--border)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ marginTop: '12px', marginBottom: '6px', fontSize: '16px' }}>{job.title}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '14px', margin: '0 0 10px' }}>{job.description}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--slate)' }}>
                  <span>📁 <b>Category:</b> {job.category}</span>
                  <span>📍 <b>Location:</b> {job.location || 'Local / Remote'}</span>
                </div>

                {job.status === 'open' && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleQuotes(job._id)}>
                      {openQuotesFor === job._id ? 'Hide Received Quotes' : '💬 View Quotes'}
                    </button>
                    <button onClick={() => startEditing(job)} style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}>Edit</button>
                    <button onClick={() => deleteJob(job._id)} style={{ background: '#B5453A' }}>Delete</button>
                  </div>
                )}

                {openQuotesFor === job._id && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <p className="eyebrow">Provider Bids &amp; Quotes</p>
                    {loadingQuotes && <p className="meta">Loading quotes...</p>}
                    {!loadingQuotes && (quotesByJob[job._id] || []).length === 0 && (
                      <p className="meta" style={{ padding: '10px 0' }}>No quotes received from providers yet.</p>
                    )}
                    {(quotesByJob[job._id] || []).map((quote) => (
                      <div key={quote._id} style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--navy)' }}>{quote.provider?.name}</p>
                            <p className="meta" style={{ margin: '2px 0 0' }}>
                              ⭐ {quote.provider?.rating ? quote.provider.rating.toFixed(1) : 'New Provider'} · {quote.provider?.location || 'Local'}
                            </p>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
                            Rs. {quote.price?.toLocaleString()}
                          </span>
                        </div>
                        {quote.message && (
                          <p style={{ fontSize: '13px', margin: '8px 0', color: 'var(--slate)', fontStyle: 'italic' }}>
                            "{quote.message}"
                          </p>
                        )}

                        {quote.status === 'pending' ? (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => acceptQuote(quote._id, job._id)} className="btn-success">
                              ✓ Accept &amp; Hire
                            </button>
                            <button onClick={() => declineQuote(quote._id, job._id)} style={{ background: 'white', color: 'var(--danger)', border: '1px solid var(--border)' }}>
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className={`status-badge status-${quote.status}`} style={{ marginTop: '8px' }}>
                            {quote.status}
                          </span>
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
    </CustomerPortalLayout>
  );
}

export default MyJobs;