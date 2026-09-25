import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import JobCard from '../components/JobCard';
import { jobsApi, quotesApi } from '../services/api';

function BrowseJobs() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const [jobs, setJobs] = useState([]);
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
  useEffect(() => {
    const isProvider = user?.role === 'provider';
    let queryString = '';

    if (!isProvider) {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.location) params.append('location', filters.location);
      if (filters.minBudget) params.append('minBudget', filters.minBudget);
      if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);
      queryString = params.toString();
    }

    const jobsPromise = isProvider ? jobsApi.getMatched() : jobsApi.getAll(queryString);
    const quotesPromise = isProvider ? quotesApi.getMine() : Promise.resolve([]);

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
      const { ok, data } = await quotesApi.create({
        jobId,
        price: Number(form.price),
        message: form.message || ''
      });

      if (ok) {
        setMessage('Quote submitted successfully! Track it in My Requests.');
        setQuotedJobs({ ...quotedJobs, [jobId]: true });
        setOpenQuoteForm(null);
      } else {
        setMessage(data?.message || 'Failed to submit quote');
      }
    } catch {
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
    <div className="centered-job-section">
      {user?.role !== 'provider' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div className="filter-pill-bar">
            <input
              type="text"
              placeholder="🔍 Category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{ width: '140px' }}
            />
            <input
              type="text"
              placeholder="📍 Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={{ width: '130px' }}
            />
            <input
              type="number"
              placeholder="Min Rs."
              value={filters.minBudget}
              onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
              style={{ width: '105px' }}
            />
            <input
              type="number"
              placeholder="Max Rs."
              value={filters.maxBudget}
              onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
              style={{ width: '105px' }}
            />
            {(filters.category || filters.location || filters.minBudget || filters.maxBudget) && (
              <button
                type="button"
                className="filter-clear-btn"
                onClick={() => setFilters({ category: '', location: '', minBudget: '', maxBudget: '' })}
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

      <div className="job-cards-container">
        {jobs.map((job) => (
          <JobCard
            key={job._id}
            job={job}
            variant="browse"
            userRole={user?.role || 'customer'}
            hasQuoted={!!quotedJobs[job._id]}
            isQuoteFormOpen={openQuoteForm === job._id}
            onOpenQuoteForm={(jobId) => setOpenQuoteForm(jobId)}
            onCloseQuoteForm={() => setOpenQuoteForm(null)}
            quoteForm={quoteForms[job._id] || {}}
            onUpdateQuoteForm={updateQuoteForm}
            onSubmitQuote={submitQuote}
          />
        ))}
      </div>
    </div>
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