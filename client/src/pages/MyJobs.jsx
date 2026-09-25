import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import JobCard from '../components/JobCard';
import { jobsApi, quotesApi } from '../services/api';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [openQuotesFor, setOpenQuotesFor] = useState(null);
  const [quotesByJob, setQuotesByJob] = useState({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [filterTab, setFilterTab] = useState('all');

  const user = (() => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();

  const fetchJobs = async () => {
    try {
      const data = await jobsApi.getMine();
      setJobs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
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

    const { ok, data } = await jobsApi.update(jobId, editForm);
    if (ok) {
      setMessage('Job updated successfully');
      setEditingId(null);
      fetchJobs();
    } else {
      setMessage(data?.message || 'Update failed');
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job listing?')) return;

    setMessage('');
    const { ok, data } = await jobsApi.delete(jobId);
    if (ok) {
      setMessage('Job deleted successfully');
      fetchJobs();
    } else {
      setMessage(data?.message || 'Delete failed');
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
      const data = await quotesApi.getByJob(jobId);
      setQuotesByJob({ ...quotesByJob, [jobId]: Array.isArray(data) ? data : [] });
      setLoadingQuotes(false);
    }
  };

  const acceptQuote = async (quoteId) => {
    setMessage('');
    const { ok, data } = await quotesApi.accept(quoteId);
    if (ok) {
      setMessage('Quote accepted! A booking has been created — check Booking Requests.');
      setOpenQuotesFor(null);
      fetchJobs();
    } else {
      setMessage(data?.message || 'Failed to accept quote');
    }
  };

  const declineQuote = async (quoteId, jobId) => {
    setMessage('');
    const { ok, data } = await quotesApi.decline(quoteId);
    if (ok) {
      const updated = (quotesByJob[jobId] || []).map(q => q._id === quoteId ? { ...q, status: 'declined' } : q);
      setQuotesByJob({ ...quotesByJob, [jobId]: updated });
    } else {
      setMessage(data?.message || 'Failed to decline quote');
    }
  };

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
      title="My Posted Jobs"
      subtitle="Manage your active job posts, review provider bids, and select the best offer."
    >
      <div className="centered-job-section">
        {/* COMPACT FILTER TAB BAR (CENTERED WITH SUITABLE SPACE) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
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
              onStartEdit={startEditing}
              onCancelEdit={cancelEditing}
              onSaveEdit={saveEdit}
              onDelete={deleteJob}
              isQuotesOpen={openQuotesFor === job._id}
              onToggleQuotes={toggleQuotes}
              quotes={quotesByJob[job._id] || []}
              loadingQuotes={loadingQuotes && openQuotesFor === job._id}
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