import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import CustomerPortalLayout from '../components/CustomerPortalLayout';

function BrowseJobs() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState('');
  const [quotedJobs, setQuotedJobs] = useState({});
  const [quoteForms, setQuoteForms] = useState({}); // { jobId: { price, message } }
  const [openQuoteForm, setOpenQuoteForm] = useState(null);
  const [filters, setFilters] = useState({
    category: initialCategory,
    location: '',
    minBudget: '',
    maxBudget: ''
  });
  const user = (() => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();
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
        setMessage('Quote submitted successfully! Track it in My Requests.');
        setQuotedJobs({ ...quotedJobs, [jobId]: true });
        setOpenQuoteForm(null);
      } else {
        setMessage(data.message || 'Failed to submit quote');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  if (initialLoad) {
    if (user?.role === 'provider') {
      return (
        <ProviderPortalLayout title="Matched Jobs" subtitle="Loading opportunities...">
          <p style={{ padding: '24px' }}>Loading matched jobs...</p>
        </ProviderPortalLayout>
      );
    }
    return <p style={{ padding: '32px' }}>Loading jobs...</p>;
  }

  const jobsListContent = (
    <>
      {user?.role !== 'provider' && (
        <div style={{ marginBottom: '20px' }}>
          <div className="tab-nav-bar" style={{ flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '20px', outline: 'none', width: '130px' }}
            />
            <input
              type="text"
              placeholder="📍 Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '20px', outline: 'none', width: '120px' }}
            />
            <input
              type="number"
              placeholder="Min Rs."
              value={filters.minBudget}
              onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
              style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '20px', outline: 'none', width: '90px' }}
            />
            <input
              type="number"
              placeholder="Max Rs."
              value={filters.maxBudget}
              onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
              style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '20px', outline: 'none', width: '90px' }}
            />
            {(filters.category || filters.location || filters.minBudget || filters.maxBudget) && (
              <button
                onClick={() => setFilters({ category: '', location: '', minBudget: '', maxBudget: '' })}
                style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '20px', background: 'var(--bg)', color: 'var(--slate)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div style={{ padding: '10px 14px', background: 'var(--success-bg)', color: 'var(--success-dark)', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>💼</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--navy)' }}>No matched jobs found</p>
          <p className="meta" style={{ margin: '4px 0 0' }}>Update your skills in Profile to match with more job postings.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {jobs.map((job) => (
          <div key={job._id} className="inblock-card">
            <div className="inblock-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`status-badge status-${job.status}`}>{job.status}</span>
                {typeof job.matchScore === 'number' && (
                  <span className="inblock-pill" style={{ background: 'var(--success-bg)', color: 'var(--success-dark)' }}>
                    🎯 {job.matchScore}% match
                  </span>
                )}
                <span className="inblock-pill">📁 {job.category}</span>
                <span className="inblock-pill">📍 {job.location || 'Remote / Local'}</span>
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                Rs. {job.budget?.toLocaleString()}
              </span>
            </div>

            <h3 style={{ margin: '10px 0 6px', fontSize: '16px', color: 'var(--navy)' }}>{job.title}</h3>
            <p style={{ color: 'var(--slate)', fontSize: '14px', margin: '0 0 4px', lineHeight: 1.55 }}>{job.description}</p>

            {user?.role === 'provider' && job.status === 'open' && !quotedJobs[job._id] && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                {openQuoteForm !== job._id ? (
                  <button onClick={() => setOpenQuoteForm(job._id)}>
                    + Submit a Quote
                  </button>
                ) : (
                  <div className="inblock-quote-panel">
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Your Proposed Price (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2500"
                      value={quoteForms[job._id]?.price || ''}
                      onChange={(e) => updateQuoteForm(job._id, 'price', e.target.value)}
                    />
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Message to Client (optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Briefly explain your experience or estimate..."
                      value={quoteForms[job._id]?.message || ''}
                      onChange={(e) => updateQuoteForm(job._id, 'message', e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => submitQuote(job._id)} className="btn-success">Send Quote</button>
                      <button type="button" onClick={() => setOpenQuoteForm(null)} style={{ background: 'white', color: 'var(--navy)', border: '1px solid var(--border)' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {user?.role === 'provider' && quotedJobs[job._id] && (
              <div style={{ marginTop: '12px', padding: '8px 14px', background: 'var(--success-bg)', color: 'var(--success-dark)', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                ✓ Quote submitted — awaiting client review
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (user?.role === 'provider') {
    return (
      <ProviderPortalLayout
        title="Matched Jobs & Opportunities"
        subtitle={`${jobs.length} jobs matched to your skills and service area.`}
      >
        {jobsListContent}
      </ProviderPortalLayout>
    );
  }

  if (user?.role === 'customer') {
    return (
      <CustomerPortalLayout
        title="Browse Services & Open Jobs"
        subtitle="Search and filter through service requests across categories."
      >
        {jobsListContent}
      </CustomerPortalLayout>
    );
  }

  return (
    <div className="job-list">
      <h2>Available Jobs</h2>
      {jobsListContent}
    </div>
  );
}

export default BrowseJobs;