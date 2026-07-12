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
    <div style={{ maxWidth: '600px', margin: '50px auto' }}>
      <h2>My Bookings ({user?.role})</h2>
      {message && <p><b>{message}</b></p>}
      {bookings.length === 0 && <p>No bookings yet.</p>}

      {bookings.map((booking) => (
        <div key={booking._id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px' }}>
          <h3>{booking.job?.title}</h3>
          <p>{booking.job?.description}</p>
          <p><b>Status:</b> {booking.status}</p>

          {user?.role === 'provider' && (
            <p><b>Customer:</b> {booking.customer?.name} ({booking.customer?.email})</p>
          )}

          {user?.role === 'customer' && (
            <>
              <p><b>Provider:</b> {booking.provider?.name} ({booking.provider?.email})</p>
              {booking.status === 'pending' && (
                <div>
                  <button onClick={() => handleAction(booking._id, 'accepted')}>Accept</button>
                  {' '}
                  <button onClick={() => handleAction(booking._id, 'declined')}>Decline</button>
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