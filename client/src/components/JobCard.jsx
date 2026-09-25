function JobCard({
  job,
  variant = 'browse', // 'browse' | 'manage'
  userRole = 'customer',

  // Manage variant props (MyJobs)
  isEditing = false,
  editForm = {},
  setEditForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isQuotesOpen = false,
  onToggleQuotes,
  quotes = [],
  loadingQuotes = false,
  onAcceptQuote,
  onDeclineQuote,

  // Browse variant props (BrowseJobs)
  hasQuoted = false,
  isQuoteFormOpen = false,
  onOpenQuoteForm,
  onCloseQuoteForm,
  quoteForm = {},
  onUpdateQuoteForm,
  onSubmitQuote,
}) {
  if (!job) return null;

  const budgetDisplay = job.budget != null ? Number(job.budget).toLocaleString() : '0';

  return (
    <div className="job-card">
      {/* CARD HEADER */}
      <div className="job-card-header">
        <div className="job-card-pills">
          <span className={`status-badge status-${job.status}`}>{job.status}</span>
          
          {typeof job.matchScore === 'number' && (
            <span
              className="job-card-pill"
              style={{ background: 'var(--success-bg)', color: 'var(--success-dark)', fontWeight: 600 }}
            >
              🎯 {job.matchScore}% match
            </span>
          )}

          <span className="job-card-pill">📁 {job.category}</span>
          <span className="job-card-pill">📍 {job.location || 'Remote / Local'}</span>
        </div>

        <div className="job-card-budget">
          <span className="budget-label">Budget:</span>
          <span className="budget-val">Rs. {budgetDisplay}</span>
        </div>
      </div>

      {/* INLINE EDIT MODE (FOR MANAGE VARIANT) */}
      {isEditing ? (
        <div className="job-card-drawer" style={{ marginTop: '8px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>
            ✏️ Edit Job Details
          </p>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Job Title</label>
          <input
            type="text"
            value={editForm.title || ''}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            placeholder="Job Title"
          />

          <label style={{ fontSize: '12px', fontWeight: 600 }}>Description</label>
          <textarea
            rows={3}
            value={editForm.description || ''}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="Detailed description of the task"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
              <input
                type="text"
                value={editForm.category || ''}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Location</label>
              <input
                type="text"
                value={editForm.location || ''}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
          </div>

          <label style={{ fontSize: '12px', fontWeight: 600 }}>Budget (Rs.)</label>
          <input
            type="number"
            min="0"
            value={editForm.budget || ''}
            onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" onClick={onCancelEdit} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="button" onClick={() => onSaveEdit(job._id)} className="btn-success btn-sm">
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* TITLE & DESCRIPTION */}
          <h3 className="job-card-title">{job.title}</h3>
          <p className="job-card-desc">{job.description}</p>

          {/* CARD FOOTER & ACTIONS */}
          <div className="job-card-footer">
            {/* MANAGE VARIANT (My Posted Jobs) */}
            {variant === 'manage' && (
              <>
                <div>
                  {job.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => onToggleQuotes(job._id)}
                      className="btn-outline btn-sm"
                      style={{
                        background: isQuotesOpen ? 'var(--info-bg)' : 'transparent',
                        borderColor: isQuotesOpen ? 'var(--primary)' : 'var(--border)',
                        color: isQuotesOpen ? 'var(--primary)' : 'var(--navy)'
                      }}
                    >
                      {isQuotesOpen ? '▲ Hide Quotes' : '💬 View Quotes'}
                    </button>
                  )}
                </div>

                <div className="job-card-actions">
                  {job.status === 'open' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onStartEdit(job)}
                        className="btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(job._id)}
                        className="btn-danger-outline btn-sm"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* BROWSE VARIANT (Provider Matched Jobs / Customer Find Services) */}
            {variant === 'browse' && (
              <>
                <div style={{ fontSize: '12px', color: 'var(--slate)' }}>
                  {job.createdAt && `Posted ${new Date(job.createdAt).toLocaleDateString()}`}
                </div>

                <div className="job-card-actions">
                  {userRole === 'provider' && job.status === 'open' && !hasQuoted && (
                    <button
                      type="button"
                      onClick={() => onOpenQuoteForm(job._id)}
                      className="btn-sm"
                    >
                      + Submit a Quote
                    </button>
                  )}

                  {userRole === 'provider' && hasQuoted && (
                    <span
                      style={{
                        padding: '6px 12px',
                        background: 'var(--success-bg)',
                        color: 'var(--success-dark)',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ✓ Quote Submitted
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* QUOTES LIST PANEL (FOR MANAGE VARIANT) */}
          {variant === 'manage' && isQuotesOpen && (
            <div className="job-card-drawer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>
                  Provider Bids &amp; Proposals ({quotes.length})
                </span>
              </div>

              {loadingQuotes && <p className="meta">Loading quotes...</p>}

              {!loadingQuotes && quotes.length === 0 && (
                <p className="meta" style={{ padding: '8px 0', margin: 0 }}>
                  No quotes received from providers yet.
                </p>
              )}

              {quotes.map((quote) => (
                <div key={quote._id} className="quote-bid-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>
                        {quote.provider?.name || 'Service Provider'}
                      </p>
                      <p className="meta" style={{ margin: '2px 0 0' }}>
                        ⭐ {quote.provider?.rating ? quote.provider.rating.toFixed(1) : 'New Provider'} · {quote.provider?.location || 'Local'}
                      </p>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--primary)' }}>
                      Rs. {quote.price?.toLocaleString()}
                    </span>
                  </div>

                  {quote.message && (
                    <p style={{ fontSize: '13px', margin: '8px 0', color: 'var(--slate)', fontStyle: 'italic', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
                      "{quote.message}"
                    </p>
                  )}

                  {quote.status === 'pending' ? (
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => onDeclineQuote(quote._id, job._id)}
                        className="btn-outline btn-sm"
                        style={{ color: 'var(--danger)' }}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptQuote(quote._id, job._id)}
                        className="btn-success btn-sm"
                      >
                        ✓ Accept &amp; Hire
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '8px', textAlign: 'right' }}>
                      <span className={`status-badge status-${quote.status}`}>
                        {quote.status}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* QUOTE SUBMISSION FORM (FOR BROWSE VARIANT / PROVIDER) */}
          {variant === 'browse' && isQuoteFormOpen && (
            <div className="job-card-drawer">
              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>
                💬 Send Quote Proposal
              </p>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Your Proposed Price (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 2500"
                value={quoteForm.price || ''}
                onChange={(e) => onUpdateQuoteForm(job._id, 'price', e.target.value)}
              />

              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Message to Client (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Briefly explain your experience, availability, or estimate..."
                value={quoteForm.message || ''}
                onChange={(e) => onUpdateQuoteForm(job._id, 'message', e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onCloseQuoteForm}
                  className="btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSubmitQuote(job._id)}
                  className="btn-success btn-sm"
                >
                  Send Quote
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default JobCard;
