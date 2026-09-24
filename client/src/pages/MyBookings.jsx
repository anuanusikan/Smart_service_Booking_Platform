import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MessageThread from './MessageThread';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import CustomerPortalLayout from '../components/CustomerPortalLayout';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewForms, setReviewForms] = useState({});
  const [reviewedBookings, setReviewedBookings] = useState({});
  const [activeTab, setActiveTab] = useState('active');
  const [activeChat, setActiveChat] = useState(null);

  const user = (() => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();
  const token = localStorage.getItem('token');

  const fetchBookings = () => {
    Promise.all([
      fetch('http://localhost:5000/api/bookings/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      user?.role === 'customer'
        ? fetch('http://localhost:5000/api/reviews/mine', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json())
        : Promise.resolve([])
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
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async (bookingId, status) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(`Booking ${status}`);
        fetchBookings();
      } else {
        setMessage(data.message || 'Action failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const handleCancel = async (bookingId) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}/cancel`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Request cancelled');
        fetchBookings();
      } else {
        setMessage(data.message || 'Failed to cancel request');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const handleDelete = async (bookingId) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Booking removed from history');
        fetchBookings();
      } else {
        setMessage(data.message || 'Failed to remove booking');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
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

    try {
      const res = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId,
          rating: Number(form.rating),
          comment: form.comment || ''
        })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Review submitted, thank you!');
        setReviewedBookings({ ...reviewedBookings, [bookingId]: true });
      } else {
        setMessage(data.message || 'Failed to submit review');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
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

  const activeBookings = bookings.filter(b =>
    !((b.status === 'completed' && reviewedBookings[b._id]) || b.status === 'declined')
  );
  const historyBookings = bookings.filter(b =>
    (b.status === 'completed' && reviewedBookings[b._id]) || b.status === 'declined'
  );

  const bookingsBody = (
    <>
      <div className="tab-nav-bar">
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

      {message && (
        <div style={{ padding: '10px 14px', background: 'var(--info-bg)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {activeTab === 'active' && activeBookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--navy)' }}>No active requests or bookings.</p>
          <p className="meta" style={{ margin: '4px 0 0' }}>New booking requests and accepted jobs will appear here.</p>
        </div>
      )}

      {activeTab === 'history' && historyBookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--navy)' }}>No booking history yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {activeTab === 'active' && activeBookings.map((booking) => (
          <div key={booking._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
              <span style={{ fontSize: '13px', color: 'var(--slate)' }}>
                {new Date(booking.updatedAt).toLocaleDateString()}
              </span>
            </div>

            <h3 style={{ marginTop: '10px', marginBottom: '6px', fontSize: '16px' }}>{booking.job?.title}</h3>
            <p style={{ color: 'var(--slate)', fontSize: '14px', margin: '0 0 10px' }}>{booking.job?.description}</p>

            {user?.role === 'provider' && (
              <>
                <p className="meta"><b>Customer:</b> {booking.customer?.name} ({booking.customer?.email})</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => setActiveChat({ bookingId: booking._id, otherPersonName: booking.customer?.name })}
                    style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}
                  >
                    💬 Message Client
                  </button>
                  {booking.status === 'pending' && (
                    <button onClick={() => handleCancel(booking._id)} style={{ background: '#B5453A' }}>
                      Cancel Request
                    </button>
                  )}
                </div>
              </>
            )}

            {user?.role === 'customer' && (
              <>
                <p className="meta"><b>Provider:</b> <Link to={`/provider/${booking.provider?._id}`}>{booking.provider?.name}</Link> ({booking.provider?.email})</p>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => setActiveChat({ bookingId: booking._id, otherPersonName: booking.provider?.name })}
                    style={{ background: 'var(--bg)', color: 'var(--navy)', border: '1px solid var(--border)' }}
                  >
                    💬 Message
                  </button>
                  {booking.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(booking._id, 'accepted')}>Accept</button>
                      <button onClick={() => handleAction(booking._id, 'declined')} style={{ background: '#B5453A' }}>Decline</button>
                    </>
                  )}
                  {booking.status === 'accepted' && (
                    <button onClick={() => handleAction(booking._id, 'completed')}>Mark as Completed</button>
                  )}
                </div>

                {booking.status === 'completed' && !reviewedBookings[booking._id] && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <p className="eyebrow">Leave a Review</p>
                    <select
                      value={reviewForms[booking._id]?.rating || ''}
                      onChange={(e) => updateReviewForm(booking._id, 'rating', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Good</option>
                      <option value="3">3 - Average</option>
                      <option value="2">2 - Below Average</option>
                      <option value="1">1 - Poor</option>
                    </select>
                    <textarea
                      placeholder="Optional comment"
                      rows={2}
                      value={reviewForms[booking._id]?.comment || ''}
                      onChange={(e) => updateReviewForm(booking._id, 'comment', e.target.value)}
                    />
                    <button onClick={() => submitReview(booking._id)} className="btn-success">Submit Review</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {activeTab === 'history' && historyBookings.map((booking) => (
          <div key={booking._id} className="card" style={{ opacity: 0.85 }}>
            <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
            <h3 style={{ marginTop: '10px' }}>{booking.job?.title}</h3>
            <p>{booking.job?.description}</p>

            {user?.role === 'provider' && (
              <p className="meta"><b>Customer:</b> {booking.customer?.name} ({booking.customer?.email})</p>
            )}
            {user?.role === 'customer' && (
              <p className="meta"><b>Provider:</b> <Link to={`/provider/${booking.provider?._id}`}>{booking.provider?.name}</Link></p>
            )}

            <button onClick={() => handleDelete(booking._id)} style={{ marginTop: '10px', background: '#6b7280' }}>
              Remove from History
            </button>
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
    </>
  );

  if (user?.role === 'provider') {
    return (
      <ProviderPortalLayout
        title="My Requests & Bookings"
        subtitle="Manage incoming service requests and ongoing client jobs."
      >
        {bookingsBody}
      </ProviderPortalLayout>
    );
  }

  if (user?.role === 'customer') {
    return (
      <CustomerPortalLayout
        title="Booking Requests & Hires"
        subtitle="Manage active job bookings, communicate with providers, and leave ratings."
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