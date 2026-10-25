import { useState, useEffect } from 'react';
import ProviderPortalLayout from '../components/ProviderPortalLayout';
import { reviewsApi } from '../services/api';
import './MyReviews.css';

function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('newest');
  const [refresh, setRefresh] = useState(0);
  let userId;
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    userId = user?.id || user?._id;
  } catch { /* The route guard handles invalid sessions. */ }

  useEffect(() => {
    let active = true;
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      setError('');
      const data = await reviewsApi.getByProvider(userId);
      if (!active) return;
      if (Array.isArray(data)) setReviews(data);
      else setError('Could not load reviews. Please try again.');
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [userId, refresh]);

  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : null;
  const fiveStars = reviews.filter(review => review.rating === 5).length;
  const sorted = [...reviews].sort((a, b) => {
    if (sort === 'highest' && a.rating !== b.rating) return b.rating - a.rating;
    if (sort === 'lowest' && a.rating !== b.rating) return a.rating - b.rating;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <ProviderPortalLayout>
      <section className="reviews-page" aria-label="Client reviews">
        <header className="reviews-hero">
          <p className="reviews-kicker">YOUR REPUTATION</p>
          <h1>Client reviews &amp; feedback</h1>
          <p>See what clients value about your work.</p>
        </header>
        {loading ? <p role="status">Loading client reviews…</p> : error ? (
          <div className="reviews-empty" role="alert"><p>{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
        ) : <>
          <div className="reviews-summary">
            <div className="reviews-score">
              <span className="reviews-label">Overall rating</span>
              <div><strong>{average || '—'}</strong><span className="reviews-score-scale"> / 5</span></div>
              <span className="reviews-stars" aria-label={average ? `${average} out of 5 stars` : 'Not yet rated'}>
                <span aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < Math.round(Number(average)) ? 'filled' : ''}>★</span>)}</span>
              </span>
              <p>{reviews.length ? `From ${reviews.length} client ${reviews.length === 1 ? 'review' : 'reviews'}` : 'Your first review starts here'}</p>
            </div>
            <div className="reviews-breakdown" aria-label="Rating distribution">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = reviews.filter(review => review.rating === rating).length;
                return <div key={rating} className="reviews-distribution-row" aria-label={`${rating} stars: ${count} reviews`}>
                  <span>{rating} <span aria-hidden="true">★</span></span>
                  <div className="reviews-track"><div style={{ width: `${reviews.length ? count / reviews.length * 100 : 0}%` }} /></div>
                  <span>{count}</span>
                </div>;
              })}
            </div>
            <div className="reviews-totals">
              <div><span className="reviews-label">Total reviews</span><strong>{reviews.length}</strong></div>
              <div><span className="reviews-label">5-star reviews</span><strong>{fiveStars}<small>{reviews.length ? ` · ${Math.round(fiveStars / reviews.length * 100)}%` : ''}</small></strong></div>
            </div>
          </div>
          <div className="reviews-toolbar">
            <div><h2>What your clients say</h2><p>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} from completed bookings</p></div>
            {reviews.length > 0 && <label className="reviews-sort">Sort by
              <select value={sort} onChange={event => setSort(event.target.value)}>
                <option value="newest">Newest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
              </select>
            </label>}
          </div>
          {!reviews.length && <div className="reviews-empty"><span className="reviews-empty-star" aria-hidden="true">☆</span><h3>No client reviews yet</h3><p>Feedback will appear here after clients complete and rate your bookings.</p></div>}
          <div className="reviews-grid">
            {sorted.map(review => <article key={review._id} className="client-review-card">
              <div className="reviewer-identity">
                <span className="review-avatar" aria-hidden="true">
                  {(review.customer?.name || 'Client').charAt(0).toUpperCase()}
                  {review.customer?.profilePicture && <img key={review.customer.profilePicture} src={review.customer.profilePicture} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                </span>
                <div><strong>{review.customer?.name || 'Client'}</strong><span>Client feedback</span></div>
              </div>
              <div className="review-content">
              <div className="client-review-rating"><span className="reviews-stars" aria-label={`${review.rating} out of 5 stars`}><span aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < review.rating ? 'filled' : ''}>★</span>)}</span></span><span className="review-rating-pill">{review.rating}<span> / 5</span></span></div>
              {review.comment?.trim() ? <blockquote>{review.comment}</blockquote> : <p className="review-no-comment">This client left a rating without a written review.</p>}
              </div>
              <time className="review-date" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
            </article>)}
          </div>
        </>}
      </section>
    </ProviderPortalLayout>
  );
}

export default MyReviews;
