import { useState, useEffect } from 'react';
import ProviderPortalLayout from '../components/ProviderPortalLayout';

function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = (() => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetch(`http://localhost:5000/api/reviews/provider/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <ProviderPortalLayout title="Client Reviews" subtitle="Loading reviews...">
        <p style={{ padding: '24px' }}>Loading client reviews...</p>
      </ProviderPortalLayout>
    );
  }

  return (
    <ProviderPortalLayout
      title="Client Reviews & Testimonials"
      subtitle={avgRating ? `Overall Rating: ${avgRating} / 5 based on ${reviews.length} review${reviews.length !== 1 ? 's' : ''}` : 'Manage and view client feedback'}
    >
      {avgRating && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <p className="stat-label">Average Rating</p>
            <p className="stat-value" style={{ color: '#F59E0B' }}>
              {avgRating} <span style={{ fontSize: '18px' }}>★</span>
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Reviews</p>
            <p className="stat-value">{reviews.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">5-Star Reviews</p>
            <p className="stat-value">{reviews.filter(r => r.rating === 5).length}</p>
          </div>
        </div>
      )}

      {reviews.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>⭐</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--navy)' }}>No client reviews yet</p>
          <p className="meta" style={{ margin: '4px 0 0' }}>Reviews will appear here once clients complete and rate your bookings.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {reviews.map((review) => (
          <div key={review._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '15px' }}>
                {'★'.repeat(review.rating || 5)}{'☆'.repeat(5 - (review.rating || 5))}
              </span>
              <span className="status-badge status-accepted">{review.rating} / 5</span>
            </div>
            {review.comment && (
              <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--navy)', fontStyle: 'italic' }}>
                "{review.comment}"
              </p>
            )}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="meta"><b>Client:</b> {review.customer?.name || 'Verified Client'}</span>
              <span className="meta">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </ProviderPortalLayout>
  );
}

export default MyReviews;