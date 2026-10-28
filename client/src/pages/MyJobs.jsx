import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import JobCard from '../components/JobCard';
import { jobsApi, quotesApi } from '../services/api';
import { validateJobForm } from '../utils/jobValidation';
import { appointmentInput, appointmentISO } from '../utils/appointments';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editMessage, setEditMessage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const actionInFlight = useRef(false);
  const [editForm, setEditForm] = useState({});
  const [openQuotesFor, setOpenQuotesFor] = useState(null);
  const [quotesByJob, setQuotesByJob] = useState({});
  const [loadingQuotes, setLoadingQuotes] = useState({});
  const [quoteErrors, setQuoteErrors] = useState({});
  const quoteRequests = useRef(new Set());
  const [filterTab, setFilterTab] = useState('all');

  const user = (() => {
    try {
      const item = sessionStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();

  const fetchJobs = async () => {
    try {
      const data = await jobsApi.getMine();
      if (Array.isArray(data)) setJobs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    const onFocus = () => fetchJobs();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const startEditing = (job) => {
    setEditingId(job._id);
    setEditErrors({});
    setEditMessage('');
    setEditForm({
      title: job.title,
      description: job.description,
      category: job.category,
      location: job.location,
      budget: job.budget,
      scheduledAt: appointmentInput(job.scheduledAt)
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (jobId) => {
    setMessage('');

    if (savingEdit) return;
    const errors = validateJobForm(editForm);
    setEditErrors(errors);
    setEditMessage('');
    if (Object.keys(errors).length) {
      setEditMessage('Please check the highlighted fields.');
      return;
    }
    setSavingEdit(true);
    try {
      const { ok, data } = await jobsApi.update(jobId, { ...editForm, scheduledAt: appointmentISO(editForm.scheduledAt) });
      if (ok) {
        setMessage('Job updated successfully');
        setEditingId(null);
        fetchJobs();
      } else {
        setEditErrors(data?.errors || {});
        setEditMessage(data?.message || 'Update failed');
      }
    } catch {
      setEditMessage('Could not save your changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const runAction = async (key, action) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setPendingAction(key);
    try {
      await action();
    } catch {
      setMessage('Could not confirm the result. Refresh your jobs before trying again.');
    } finally {
      actionInFlight.current = false;
      setPendingAction('');
    }
  };

  const deleteJob = (jobId) => runAction(`delete:${jobId}`, async () => {
    if (!window.confirm('Are you sure you want to delete this job listing?')) return;

    setMessage('');
    const { ok, data } = await jobsApi.delete(jobId);
    if (ok) {
      setMessage('Job deleted successfully');
      await fetchJobs();
    } else {
      setMessage(data?.message || 'Delete failed');
    }
  });

  const removeFromHistory = (jobId) => runAction(`hide:${jobId}`, async () => {
    if (!window.confirm('Remove this completed job from My Posted Jobs? Bookings, reviews and provider earnings will be kept.')) return;
    setMessage('');
    const { ok, data } = await jobsApi.removeFromHistory(jobId);
    if (ok) {
      setJobs(current => current.filter(job => job._id !== jobId));
      setMessage('Completed job removed from your history.');
    } else {
      setMessage(data?.message || 'Could not remove job from history');
    }
  });

  const loadQuotes = async (jobId) => {
    if (quoteRequests.current.has(jobId)) return;
    quoteRequests.current.add(jobId);
    setLoadingQuotes(current => ({ ...current, [jobId]: true }));
    setQuoteErrors(current => ({ ...current, [jobId]: '' }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const data = await quotesApi.getByJob(jobId, { signal: controller.signal });
      if (!Array.isArray(data)) throw new Error('Quotes unavailable');
      setQuotesByJob(current => ({ ...current, [jobId]: data }));
      setJobs(current => current.map(job => job._id === jobId
        ? { ...job, pendingQuoteCount: data.filter(quote => quote.status === 'pending').length }
        : job));
    } catch {
      setQuoteErrors(current => ({ ...current, [jobId]: 'Could not load quotes. Please try again.' }));
    } finally {
      clearTimeout(timeout);
      quoteRequests.current.delete(jobId);
      setLoadingQuotes(current => ({ ...current, [jobId]: false }));
    }
  };

  const toggleQuotes = async (jobId) => {
    if (openQuotesFor === jobId) {
      setOpenQuotesFor(null);
      return;
    }
    setOpenQuotesFor(jobId);

    await loadQuotes(jobId);
  };

  const acceptQuote = (quoteId) => runAction(`accept:${quoteId}`, async () => {
    setMessage('');
    const { ok, data } = await quotesApi.accept(quoteId);
    if (ok) {
      setMessage('Quote accepted! A booking has been created — check Booking Requests.');
      setOpenQuotesFor(null);
      await fetchJobs();
    } else {
      setMessage(data?.message || 'Failed to accept quote');
    }
  });

  const declineQuote = (quoteId, jobId) => runAction(`decline:${quoteId}`, async () => {
    setMessage('');
    const { ok, data } = await quotesApi.decline(quoteId);
    if (ok) {
      const updated = (quotesByJob[jobId] || []).map(q => q._id === quoteId ? { ...q, status: 'declined' } : q);
      setQuotesByJob({ ...quotesByJob, [jobId]: updated });
      await fetchJobs();
    } else {
      setMessage(data?.message || 'Failed to decline quote');
    }
  });

  const Layout = user?.role === 'provider' ? ProviderPortalLayout : CustomerPortalLayout;

  if (loading) {
    return (
      <Layout title="My Posted Jobs" subtitle="Loading job listings...">
        <p style={{ padding: '24px' }}>Loading your jobs...</p>
      </Layout>
    );
  }

  const filteredJobs = jobs.filter(job => {
    if (filterTab === 'open') return job.status === 'open';
    if (filterTab === 'assigned') return job.status === 'assigned';
    if (filterTab === 'completed') return job.status === 'completed';
    return true;
  });

  return (
    <Layout
      title={<span className="posted-jobs-heading">My Posted Jobs</span>}
      subtitle="Manage your active job posts, review provider bids, and select the best offer."
    >
      <div className="centered-job-section posted-jobs-page">
        {/* COMPACT FILTER TAB BAR (CENTERED WITH SUITABLE SPACE) */}
        <div className="posted-jobs-filters">
          <div className="tab-nav-bar" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn${filterTab === 'all' ? ' active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({jobs.length})
            </button>
            <button
              className={`tab-btn${filterTab === 'open' ? ' active' : ''}`}
              onClick={() => setFilterTab('open')}
            >
              Open ({jobs.filter(j => j.status === 'open').length})
            </button>
            <button
              className={`tab-btn${filterTab === 'assigned' ? ' active' : ''}`}
              onClick={() => setFilterTab('assigned')}
            >
              Assigned ({jobs.filter(j => j.status === 'assigned').length})
            </button>
            <button
              className={`tab-btn${filterTab === 'completed' ? ' active' : ''}`}
              onClick={() => setFilterTab('completed')}
            >
              Completed ({jobs.filter(j => j.status === 'completed').length})
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: '10px 14px', background: 'var(--info-bg)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
            {message}
          </div>
        )}

        {filteredJobs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📝</span>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--navy)' }}>
              {jobs.length === 0 ? "You haven't posted any jobs yet" : "No jobs found for this filter"}
            </p>
            <p className="meta" style={{ margin: '4px 0 16px' }}>
              {jobs.length === 0 ? "Post a job to get quotes from verified local providers." : "Switch filter tab to view all jobs."}
            </p>
            {jobs.length === 0 && (
              <Link to="/post-job"><button className="btn-success">+ Post Your First Job</button></Link>
            )}
          </div>
        )}

        {/* JOBS CONTAINER WITH SUITABLE MAX-WIDTH */}
        <div className="job-cards-container">
          {filteredJobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              variant="manage"
              userRole={user?.role || 'customer'}
              isEditing={editingId === job._id}
              editForm={editForm}
              setEditForm={setEditForm}
              editErrors={editErrors}
              editMessage={editMessage}
              savingEdit={savingEdit}
              pendingAction={pendingAction}
              onStartEdit={startEditing}
              onCancelEdit={cancelEditing}
              onSaveEdit={saveEdit}
              onDelete={deleteJob}
              onRemoveFromHistory={removeFromHistory}
              isQuotesOpen={openQuotesFor === job._id}
              onToggleQuotes={toggleQuotes}
              quotes={quotesByJob[job._id] || []}
              loadingQuotes={Boolean(loadingQuotes[job._id])}
              quotesError={quoteErrors[job._id]}
              onRetryQuotes={() => loadQuotes(job._id)}
              onAcceptQuote={acceptQuote}
              onDeclineQuote={declineQuote}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default MyJobs;
