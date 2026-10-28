import { appointmentLabel } from '../utils/appointments';
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MessageThread from './MessageThread';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import { bookingsApi, reviewsApi } from '../services/api';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewForms, setReviewForms] = useState({});
  const [reviewedBookings, setReviewedBookings] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'history' ? 'history' : 'active';
  const selectedJob = searchParams.get('job');
  const setActiveTab = tab => setSearchParams(tab === 'history' ? { tab: 'history' } : {});
  const [reviewingId, setReviewingId] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [activeChat, setActiveChat] = useState(null);

  const user = (() => {
    try {
      const item = sessionStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();
  const token = sessionStorage.getItem('token');

  const userRole = user?.role;
  const fetchBookings = useCallback(() => {
    Promise.all([
      bookingsApi.getHistory(),
      userRole === 'customer' ? reviewsApi.getMine() : Promise.resolve([])
    ])
      .then(([bookingsData, reviewedIds]) => {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);

        const reviewedMap = {};
        (Array.isArray(reviewedIds) ? reviewedIds : []).forEach(id => {
          reviewedMap[id] = true;
        });
        setReviewedBookings(reviewedMap);

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userRole]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleAction = async (bookingId, status) => {
    setMessage('');
    const { ok, data } = await bookingsApi.updateStatus(bookingId, status);
    if (ok) {
      setMessage(status === 'completed' ? 'Booking completed. You can leave an optional review in History.' : `Booking ${status}`);
      if (status === 'completed') setActiveTab('history');
      fetchBookings();
    } else {
      setMessage(data?.message || 'Action failed');
    }
  };

  const handleCancel = async (bookingId) => {
    setMessage('');
    const { ok, data } = await bookingsApi.cancel(bookingId);
    if (ok) {
      setMessage('Request cancelled');
      fetchBookings();
    } else {
      setMessage(data?.message || 'Failed to cancel request');
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Remove this booking from your history? Reviews and provider earnings will be kept. A review is not required.')) return;
    setMessage('');
    const { ok, data } = await bookingsApi.removeFromHistory(bookingId);
    if (ok) {
      setMessage('Booking hidden from your history. The other person still has their copy.');
      fetchBookings();
    } else {
      setMessage(data?.message || 'Failed to remove booking');
    }
  };

  const updateReviewForm = (bookingId, field, value) => {
    setReviewForms({
      ...reviewForms,
      [bookingId]: {
        ...reviewForms[bookingId],
        [field]: value
      }
    });
  };

  const submitReview = async (bookingId) => {
    setMessage('');
    const form = reviewForms[bookingId] || {};

    if (!form.rating) {
      setMessage('Please select a rating');
      return;
    }

    if (submittingReview) return;
    setSubmittingReview(true);
    const { ok, data } = await reviewsApi.create({
      bookingId,
      rating: Number(form.rating),
      comment: form.comment || ''
    });

    setSubmittingReview(false);
    if (ok) {
      setReviewingId(null);
      setMessage('Review submitted, thank you!');
      setReviewedBookings({ ...reviewedBookings, [bookingId]: true });
    } else {
      setMessage(data?.message || 'Failed to submit review');
    }
  };

  if (!token) return <p style={{ padding: '32px' }}>Please log in to view your bookings.</p>;
  
  if (loading) {
    if (user?.role === 'provider') {
      return (
        <ProviderPortalLayout title="My Requests & Bookings" subtitle="Loading bookings...">
          <p style={{ padding: '24px' }}>Loading bookings...</p>
        </ProviderPortalLayout>
      );
    }
    return <p style={{ padding: '32px' }}>Loading bookings...</p>;
  }

  const visibleBookings = selectedJob ? bookings.filter(b => b.job?._id === selectedJob) : bookings;
  const activeBookings = visibleBookings.filter(b => ['pending', 'accepted'].includes(b.status));
  const historyBookings = visibleBookings.filter(b => ['completed', 'declined'].includes(b.status));

  const bookingsBody = (
    <div className="centered-job-section">
      {selectedJob && (
        <p className="meta">Showing bookings for the selected job.{' '}
          <Link to="/my-bookings?tab=history">View all booking history</Link>
        </p>
      )}
      {activeTab === 'history' && userRole === 'customer' && (
        <p className="meta">Reviews are optional. You can review completed work later or remove it from your history without reviewing.</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div className="tab-nav-bar" style={{ marginBottom: 0 }}>
          <button
            className={`tab-btn${activeTab === 'active' ? ' active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeBookings.length})
          </button>
          <button
            className={`tab-btn${activeTab === 'history' ? ' active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History ({historyBookings.length})
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 18px',
          background: 'var(--info-bg)',
          color: 'var(--primary-dark)',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: 600,
          border: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>ℹ️</span>
          <span>{message}</span>
        </div>
      )}

      {activeTab === 'active' && activeBookings.length === 0 && (
        <div className="job-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--navy)', fontSize: '17px' }}>No active requests or bookings</h3>
          <p className="meta" style={{ margin: '6px 0 0', fontSize: '14px' }}>New booking requests and accepted jobs will appear here.</p>
        </div>
      )}

      {activeTab === 'history' && historyBookings.length === 0 && (
        <div className="job-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📁</div>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--navy)', fontSize: '17px' }}>No booking history yet</h3>
          <p className="meta" style={{ margin: '6px 0 0', fontSize: '14px' }}>Completed and archived bookings will appear here.</p>
        </div>
      )}

      <div className="job-cards-container">
        {activeTab === 'active' && activeBookings.map((booking) => (
          <div key={booking._id} className="job-card">
            <p className="job-appointment">{appointmentLabel(booking.job?.scheduledAt)}</p>
            {/* Header: Status badge, category, date, budget */}
            <div className="job-card-header">
              <div className="job-card-pills">
                <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
                {booking.job?.category && (
                  <span className="job-card-pill">🏷️ {booking.job.category}</span>
                )}
                <span className="job-card-pill">
                  📅 {new Date(booking.updatedAt || booking.createdAt).toLocaleDateString()}
                </span>
              </div>

              {(booking.agreedPrice ?? booking.job?.budget) != null && (
                <div className="job-card-budget">
                  <span className="budget-label">{booking.status === 'accepted' || booking.status === 'completed' ? 'Agreed price' : 'Budget'}</span>
                  <span className="budget-val">Rs. {Number(booking.agreedPrice ?? booking.job?.budget ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <h3 className="job-card-title">{booking.job?.title || 'Service Request'}</h3>
            <p className="job-card-desc">{booking.job?.description || 'No description provided.'}</p>

            {/* Counterpart Profile Block */}
            {user?.role === 'provider' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {booking.customer?.profilePicture ? (
                    <img
                      src={booking.customer.profilePicture}
                      alt={booking.customer?.name || 'Customer'}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #A7F3D0' }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
                    }}>
                      {booking.customer?.name ? booking.customer.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                      Client Details
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--navy)' }}>
                      <span>{booking.customer?.name || 'Client'}</span>
                      {booking.customer?.email && (
                        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 400, marginLeft: '6px' }}>
                          • {booking.customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user?.role === 'customer' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {booking.provider?.profilePicture ? (
                    <img
                      src={booking.provider.profilePicture}
                      alt={booking.provider?.name || 'Provider'}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #BFDBFE' }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                    }}>
                      {booking.provider?.name ? booking.provider.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                      {booking.status === 'pending' ? 'Requesting Provider' : 'Assigned Provider'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--navy)' }}>
                      <Link to={`/provider/${booking.provider?._id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {booking.provider?.name || 'Provider'}
                      </Link>
                      {booking.provider?.email && (
                        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 400, marginLeft: '6px' }}>
                          • {booking.provider.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {booking.provider?._id && (
                  <Link
                    to={`/provider/${booking.provider._id}`}
                    className="btn-outline btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    View Profile →
                  </Link>
                )}
              </div>
            )}

            {/* Footer with properly aligned action buttons */}
            <div className="job-card-footer">
              <button
                className="btn-outline btn-sm"
                onClick={() => setActiveChat({
                  bookingId: booking._id,
                  otherPersonName: user?.role === 'provider' ? booking.customer?.name : booking.provider?.name
                })}
              >
                💬 Message {user?.role === 'provider' ? 'Client' : 'Provider'}
              </button>

              <div className="job-card-actions">
                {user?.role === 'provider' && booking.status === 'pending' && (
                  <button
                    className="btn-danger-outline btn-sm"
                    onClick={() => handleCancel(booking._id)}
                  >
                    ✕ Cancel Request
                  </button>
                )}

                {user?.role === 'customer' && booking.status === 'pending' && (
                  <>
                    <button
                      className="btn-danger-outline btn-sm"
                      onClick={() => handleAction(booking._id, 'declined')}
                    >
                      ✕ Decline
                    </button>
                    <button
                      className="btn-sm"
                      style={{ background: '#2563EB', color: '#fff' }}
                      onClick={() => handleAction(booking._id, 'accepted')}
                    >
                      ✓ Accept
                    </button>
                  </>
                )}

                {user?.role === 'customer' && booking.status === 'accepted' && (
                  <button
                    className="btn-success btn-sm"
                    onClick={() => handleAction(booking._id, 'completed')}
                  >
                    ✓ Mark as Completed
                  </button>
                )}
              </div>
            </div>


          </div>
        ))}

        {activeTab === 'history' && historyBookings.map((booking) => (
          <div key={booking._id} className="job-card" style={{ opacity: 0.9 }}>
            <p className="job-appointment">{appointmentLabel(booking.job?.scheduledAt)}</p>
            {/* Header: Status badge, category, date, budget */}
            <div className="job-card-header">
              <div className="job-card-pills">
                <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
                {booking.job?.category && (
                  <span className="job-card-pill">🏷️ {booking.job.category}</span>
                )}
                <span className="job-card-pill">
                  📅 {new Date(booking.updatedAt || booking.createdAt).toLocaleDateString()}
                </span>
              </div>

              {(booking.agreedPrice ?? booking.job?.budget) != null && (
                <div className="job-card-budget">
                  <span className="budget-label">{booking.status === 'accepted' || booking.status === 'completed' ? 'Agreed price' : 'Budget'}</span>
                  <span className="budget-val">Rs. {Number(booking.agreedPrice ?? booking.job?.budget ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <h3 className="job-card-title">{booking.job?.title || 'Service Request'}</h3>
            <p className="job-card-desc">{booking.job?.description || 'No description provided.'}</p>

            {/* Counterpart info */}
            {user?.role === 'provider' && booking.customer && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Client:</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>
                  {booking.customer.name} {booking.customer.email && `(${booking.customer.email})`}
                </span>
              </div>
            )}

            {user?.role === 'customer' && booking.provider && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Provider:</span>
                <Link to={`/provider/${booking.provider._id}`} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                  {booking.provider.name}
                </Link>
                {booking.provider.email && (
                  <span style={{ fontSize: '12px', color: '#64748B' }}>({booking.provider.email})</span>
                )}
              </div>
            )}

            <div className="job-card-footer">
              <div>
                {userRole === 'customer' && booking.status === 'completed' && (
                  reviewedBookings[booking._id] ? <span className="status-badge status-completed">Reviewed</span> : (
                    <button type="button" className="btn-outline btn-sm" aria-expanded={reviewingId === booking._id}
                      onClick={() => setReviewingId(reviewingId === booking._id ? null : booking._id)}>
                      {reviewingId === booking._id ? 'Close review' : 'Review'}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => handleDelete(booking._id)}
                className="btn-outline btn-sm"
                style={{ color: '#64748B' }}
              >
                🗑️ Remove from History
              </button>
            </div>

            {/* Optional review, available only in booking history. */}
            {user?.role === 'customer' && booking.status === 'completed' && !reviewedBookings[booking._id] && reviewingId === booking._id && (
              <div className="job-card-drawer" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%)', borderRadius: '12px', marginTop: '16px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px' }}>⭐</span>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
                    Leave a Review for {booking.provider?.name || 'Provider'}
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <select
                    aria-label="Review rating"
                    value={reviewForms[booking._id]?.rating || ''}
                    onChange={(e) => updateReviewForm(booking._id, 'rating', e.target.value)}
                    style={{ marginBottom: 0, background: '#fff' }}
                  >
                    <option value="">Select rating (Required)</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
                    <option value="4">⭐⭐⭐⭐ 4 - Good</option>
                    <option value="3">⭐⭐⭐ 3 - Average</option>
                    <option value="2">⭐⭐ 2 - Below Average</option>
                    <option value="1">⭐ 1 - Poor</option>
                  </select>
                  <textarea
                    aria-label="Review comment"
                    placeholder="Share your experience working with this provider (optional)..."
                    rows={2}
                    value={reviewForms[booking._id]?.comment || ''}
                    onChange={(e) => updateReviewForm(booking._id, 'comment', e.target.value)}
                    style={{ marginBottom: 0, background: '#fff' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button type="button" className="btn-outline btn-sm" disabled={submittingReview} onClick={() => setReviewingId(null)}>Maybe later</button>
                    <button disabled={submittingReview} onClick={() => submitReview(booking._id)} className="btn-success btn-sm">
                      ✓ {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {activeChat && (
        <MessageThread
          bookingId={activeChat.bookingId}
          otherPersonName={activeChat.otherPersonName}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );

  if (user?.role === 'provider') {
    return (
      <ProviderPortalLayout
        title="My Requests & Bookings"
        subtitle="Track your pending requests, accepted bookings, and completed work."
      >
        {bookingsBody}
      </ProviderPortalLayout>
    );
  }

  if (user?.role === 'customer') {
    return (
      <CustomerPortalLayout
        title="My Bookings"
        subtitle="Manage requests and ongoing work in Active. Find completed bookings and optional reviews in History."
        centerContent
      >
        {bookingsBody}
      </CustomerPortalLayout>
    );
  }

  return (
    <div className="job-list">
      <h2>Booking Requests</h2>
      {bookingsBody}
    </div>
  );
}

export default MyBookings;
