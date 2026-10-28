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
    title: '',
    sort: '',
    category: initialCategory,
    location: '',
    minBudget: '',
    maxBudget: ''
  });
  const user = (() => {
    try {
      const item = sessionStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();
  const isProvider = user?.role === 'provider';
  useEffect(() => {
    let active = true;
    setMessage('');
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== '') params.set(key, value);
    }
    const queryString = params.toString();
    const jobsPromise = isProvider ? jobsApi.getMatched(queryString) : jobsApi.getAll(queryString);
    const quotesPromise = isProvider ? quotesApi.getMine() : Promise.resolve([]);

    Promise.all([jobsPromise, quotesPromise])
      .then(([jobsData, quotesData]) => {
        if (!active) return;
        if (!Array.isArray(jobsData)) {
          setMessage(jobsData?.message || 'Could not load jobs. Please try again.');
        }
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        const quotedMap = {};
        (Array.isArray(quotesData) ? quotesData : []).forEach(q => {
          if (q.job?._id && q.status === 'pending') quotedMap[q.job._id] = true;
        });
        setQuotedJobs(quotedMap);
        setInitialLoad(false);
      })
      .catch(() => {
        if (!active) return;
        setMessage('Could not load jobs. Please try again.');
        setInitialLoad(false);
      });
    return () => { active = false; };
  }, [filters, isProvider]);

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
        setMessage('Quote submitted successfully! Track it in My Quotes.');
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
      <section className="job-filters" aria-label="Search and filter jobs">
        <label className="job-filter-field job-filter-search">
          <span>Search jobs</span>
          <input type="search" aria-label="Search job titles" placeholder="Search by job title"
            value={filters.title} onChange={e => setFilters({ ...filters, title: e.target.value })} />
        </label>
        <label className="job-filter-field job-filter-sort">
          <span>Sort by</span>
          <select aria-label="Sort jobs" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
            <option value="">{isProvider ? 'Best match' : 'Newest first'}</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="budget_asc">Budget: low to high</option>
            <option value="budget_desc">Budget: high to low</option>
          </select>
        </label>
        <label className="job-filter-field">
          <span>Category</span>
          <input type="text" aria-label="Category" placeholder="e.g. Plumbing" value={filters.category}
            onChange={e => setFilters({ ...filters, category: e.target.value })} />
        </label>
        <label className="job-filter-field">
          <span>Location</span>
          <input type="text" aria-label="Location" placeholder="e.g. Kandy" value={filters.location}
            onChange={e => setFilters({ ...filters, location: e.target.value })} />
        </label>
        <label className="job-filter-field">
          <span>Min budget (Rs.)</span>
          <input type="number" aria-label="Minimum budget" placeholder="No minimum" min="0" value={filters.minBudget}
            onChange={e => setFilters({ ...filters, minBudget: e.target.value })} />
        </label>
        <label className="job-filter-field">
          <span>Max budget (Rs.)</span>
          <input type="number" aria-label="Maximum budget" placeholder="No maximum" min="0" value={filters.maxBudget}
            onChange={e => setFilters({ ...filters, maxBudget: e.target.value })} />
        </label>
        {(filters.title || filters.sort || filters.category || filters.location || filters.minBudget || filters.maxBudget) && (
          <div className="job-filter-actions">
            <button type="button" className="job-filter-clear"
              onClick={() => setFilters({ title: '', sort: '', category: '', location: '', minBudget: '', maxBudget: '' })}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      {message && (
        <div style={{ padding: '10px 14px', background: 'var(--success-bg)', color: 'var(--success-dark)', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>💼</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--navy)' }}>No jobs found</p>
          <p className="meta" style={{ margin: '4px 0 0' }}>Try changing or clearing your filters to see more jobs.</p>
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