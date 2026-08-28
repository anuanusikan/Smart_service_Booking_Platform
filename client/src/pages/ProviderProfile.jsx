import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ProviderProfile() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:5000/api/auth/provider/${id}`).then(res => res.json()),
      fetch(`http://localhost:5000/api/reviews/provider/${id}`).then(res => res.json())
    ])
      .then(([providerData, reviewsData]) => {
        setProvider(providerData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setCompletedCount(Array.isArray(reviewsData) ? reviewsData.length : 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading profile...</p>;
  if (!provider || provider.message) return <p>Provider not found.</p>;

  return (
    <div className="job-list">
      <div className="card">
        <h2 style={{ marginBottom: '4px' }}>{provider.name}</h2>
        <p className="meta">{provider.location}</p>

        <div style={{ display: 'flex', gap: '10px', margin: '14px 0' }}>
          <span className="status-badge status-accepted">
            ⭐ {provider.rating ? provider.rating.toFixed(1) : 'No rating yet'}
          </span>
          <span className="status-badge status-open">{completedCount} jobs completed</span>
        </div>

        <p className="eyebrow">Skills</p>
        <p>{provider.skills?.length ? provider.skills.join(', ') : 'No skills listed'}</p>

        {provider.hourlyRate > 0 && (
          <>
            <p className="eyebrow" style={{ marginTop: '14px' }}>Hourly Rate</p>
            <p>Rs. {provider.hourlyRate} / hour</p>
          </>
        )}
      </div>

      <h3 style={{ marginTop: '30px' }}>Reviews</h3>
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

export default ProviderProfile;