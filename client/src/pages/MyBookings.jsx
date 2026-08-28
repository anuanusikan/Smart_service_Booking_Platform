import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewForms, setReviewForms] = useState({}); // { bookingId: { rating, comment } }
  const [reviewedBookings, setReviewedBookings] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const user = JSON.parse(localStorage.getItem('user'));
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
        setMessage(data.message || 'Cancel failed');
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
        setMessage('Removed from history');
        fetchBookings();
      } else {
        setMessage(data.message || 'Delete failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const updateReviewForm = (bookingId, field, value) => {
    setReviewForms({
      ...reviewForms,
      [bookingId]: { ...reviewForms[bookingId], [field]: value }
    });
  };

  const submitReview = async (bookingId) => {
    setMessage('');
    const form = reviewForms[bookingId] || {};

    if (!form.rating) {
      setMessage('Please select a rating before submitting.');
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

  if (!token) return <p>Please log in to view your bookings.</p>;
  if (loading) return <p>Loading bookings...</p>;

  const activeBookings = bookings.filter(b =>
    !((b.status === 'completed' && reviewedBookings[b._id]) || b.status === 'declined')
  );
  const historyBookings = bookings.filter(b =>
    (b.status === 'completed' && reviewedBookings[b._id]) || b.status === 'declined'
  );

  return (
    <div className="job-list">
      <h2>{user?.role === 'customer' ? 'Booking Requests' : 'My Requests'}</h2>
      {message && <p><b>{message}</b></p>}
      {activeBookings.length === 0 && historyBookings.length === 0 && <p>No bookings yet.</p>}

      {activeBookings.map((booking) => (
        <div key={booking._id} className="card">
          <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
          <h3 style={{ marginTop: '10px' }}>{booking.job?.title}</h3>
          <p>{booking.job?.description}</p>

          {user?.role === 'provider' && (
            <>
              <p className="meta"><b>Customer:</b> {booking.customer?.name} ({booking.customer?.email})</p>
              {booking.status === 'pending' && (
                <button onClick={() => handleCancel(booking._id)} style={{ marginTop: '10px', background: '#B5453A' }}>
                  Cancel Request
                </button>
              )}
            </>
          )}

          {user?.role === 'customer' && (
            <>
              <p className="meta"><b>Provider:</b> <Link to={`/provider/${booking.provider?._id}`}>{booking.provider?.name}</Link> ({booking.provider?.email})</p>

              {booking.status === 'pending' && (
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => handleAction(booking._id, 'accepted')}>Accept</button>
                  {' '}
                  <button onClick={() => handleAction(booking._id, 'declined')} style={{ background: '#B5453A' }}>Decline</button>
                </div>
              )}

              {booking.status === 'accepted' && (
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => handleAction(booking._id, 'completed')}>Mark as Completed</button>
                </div>
              )}

              {booking.status === 'completed' && !reviewedBookings[booking._id] && (
                <div style={{ marginTop: '14px', borderTop: '1px solid #eee', paddingTop: '14px' }}>
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
                  <button onClick={() => submitReview(booking._id)}>Submit Review</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {historyBookings.length > 0 && (
        <div style={{ marginTop: '24px', marginBottom: '16px' }}>
          <button onClick={() => setShowHistory(!showHistory)} style={{ background: '#6b7280' }}>
            {showHistory ? 'Hide History' : `Show History (${historyBookings.length})`}
          </button>
        </div>
      )}

      {showHistory && historyBookings.map((booking) => (
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
  );
}

export default MyBookings;