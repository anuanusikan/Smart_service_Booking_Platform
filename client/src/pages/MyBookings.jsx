import { useState, useEffect } from 'react';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  const fetchBookings = () => {
    fetch('http://localhost:5000/api/bookings/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setBookings(data);
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
        fetchBookings(); // refresh the list
      } else {
        setMessage(data.message || 'Action failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  if (!token) return <p>Please log in to view your bookings.</p>;
  if (loading) return <p>Loading bookings...</p>;

  return (
    <div className="job-list">
      <h2>My Bookings <span style={{ fontSize: '14px', color: '#375056' }}>({user?.role})</span></h2>
      {message && <p><b>{message}</b></p>}
      {bookings.length === 0 && <p>No bookings yet.</p>}

      {bookings.map((booking) => (
        <div key={booking._id} className="card">
          <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
          <h3 style={{ marginTop: '10px' }}>{booking.job?.title}</h3>
          <p>{booking.job?.description}</p>

          {user?.role === 'provider' && (
            <p className="meta"><b>Customer:</b> {booking.customer?.name} ({booking.customer?.email})</p>
          )}

          {user?.role === 'customer' && (
            <>
              <p className="meta"><b>Provider:</b> {booking.provider?.name} ({booking.provider?.email})</p>
              {booking.status === 'pending' && (
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => handleAction(booking._id, 'accepted')}>Accept</button>
                  {' '}
                  <button onClick={() => handleAction(booking._id, 'declined')} style={{ background: '#B5453A' }}>Decline</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default MyBookings;