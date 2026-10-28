import JobDetailsFields from './JobDetailsFields';
import { appointmentLabel } from '../utils/appointments';

function JobCard({
  job,
  variant = 'browse', // 'browse' | 'manage'
  userRole = 'customer',

  // Manage variant props (MyJobs)
  isEditing = false,
  editForm = {},
  editErrors = {},
  editMessage = '',
  savingEdit = false,
  pendingAction = '',
  setEditForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onRemoveFromHistory,
  isQuotesOpen = false,
  onToggleQuotes,
  quotes = [],
  loadingQuotes = false,
  quotesError = '',
  onRetryQuotes,
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
        <form className="job-card-drawer job-edit-form job-details-form" noValidate onSubmit={event => { event.preventDefault(); onSaveEdit(job._id); }}>
          <div className="job-edit-heading"><span className="job-form-kicker">Refine your listing</span><h3>Edit job details</h3><p>Keep your request clear, so providers can offer the right help.</p></div>
          {editMessage && <p className="job-edit-error" role="alert">{editMessage}</p>}
          <JobDetailsFields values={editForm} errors={editErrors} onChange={(name, value) => setEditForm({ ...editForm, [name]: value })} />
          <div className="appointment-field">
            <label htmlFor={`appointment-${job._id}`}>Appointment date &amp; time <span>(optional)</span></label>
            <input id={`appointment-${job._id}`} type="datetime-local" value={editForm.scheduledAt || ''}
              onChange={e => setEditForm({ ...editForm, scheduledAt: e.target.value })} />
            <p>Sri Lanka time (UTC +05:30). Clear the field to arrange a time later.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" disabled={savingEdit} onClick={onCancelEdit} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={savingEdit} className="job-form-submit btn-sm">
              {savingEdit ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* TITLE & DESCRIPTION */}
          <h3 className="job-card-title">{job.title}</h3>
          <p className="job-card-desc">{job.description}</p>

          <p className="job-appointment"><span aria-hidden="true">&#9687;</span> {appointmentLabel(job.scheduledAt)}</p>

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
                      className="btn-outline btn-sm job-quotes-button"
                      aria-expanded={isQuotesOpen}
                      style={{
                        background: isQuotesOpen ? 'var(--info-bg)' : 'transparent',
                        borderColor: isQuotesOpen ? 'var(--primary)' : 'var(--border)',
                        color: isQuotesOpen ? 'var(--primary)' : 'var(--navy)'
                      }}
                    >
                      {isQuotesOpen ? '▲ Hide Quotes' : '💬 View Quotes'}
                      {job.pendingQuoteCount > 0 && (
                        <span className="job-quote-count" aria-label={`${job.pendingQuoteCount} pending quotes`}>
                          {job.pendingQuoteCount > 99 ? '99+' : job.pendingQuoteCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <div className="job-card-actions">
                  {job.status === 'completed' && userRole === 'customer' && (
                    <button type="button" className="btn-danger-outline btn-sm"
                      disabled={Boolean(pendingAction)} onClick={() => onRemoveFromHistory(job._id)}>
                      {pendingAction === `hide:${job._id}` ? 'Removing...' : 'Remove from history'}
                    </button>
                  )}
                  {job.status === 'open' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onStartEdit(job)}
                        disabled={Boolean(pendingAction)}
                        className="btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(job._id)}
                        disabled={Boolean(pendingAction)}
                        className="btn-danger-outline btn-sm"
                      >
                        {pendingAction === `delete:${job._id}` ? 'Deleting...' : 'Delete'}
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
              {!loadingQuotes && quotesError && <div role="alert"><p className="meta">{quotesError}</p><button type="button" className="btn-outline btn-sm" onClick={onRetryQuotes}>Try again</button></div>}

              {!loadingQuotes && !quotesError && quotes.length === 0 && (
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
                        disabled={Boolean(pendingAction)}
                        className="btn-outline btn-sm"
                        style={{ color: 'var(--danger)' }}
                      >
                        {pendingAction === `decline:${quote._id}` ? 'Declining...' : 'Decline'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptQuote(quote._id, job._id)}
                        disabled={Boolean(pendingAction)}
                        className="btn-success btn-sm"
                      >
                        {pendingAction === `accept:${quote._id}` ? 'Accepting...' : 'Accept & Hire'}
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
