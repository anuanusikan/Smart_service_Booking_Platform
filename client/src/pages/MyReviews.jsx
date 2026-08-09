import { useState, useEffect } from 'react';

function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

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

  if (loading) return <p>Loading reviews...</p>;

  return (
    <div className="job-list">
      <h2>My Reviews</h2>
      {avgRating && (
        <p className="meta" style={{ fontSize: '16px', marginBottom: '20px' }}>
          <b>Average Rating:</b> {avgRating} / 5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
        </p>
      )}
      {reviews.length === 0 && <p>No reviews yet.</p>}

      {reviews.map((review) => (
        <div key={review._id} className="card">
          <span className="status-badge status-accepted">{review.rating} / 5</span>
          {review.comment && <p style={{ marginTop: '10px' }}>{review.comment}</p>}
          <p className="meta"><b>By:</b> {review.customer?.name || 'Anonymous'}</p>
        </div>
      ))}
    </div>
  );
}

export default MyReviews;