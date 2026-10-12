import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authApi, reviewsApi } from '../services/api';

function Stars({ value }) {
  return <span className="public-stars" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map(star => <span key={star} aria-hidden="true" className={star <= Math.round(value) ? 'filled' : ''}>★</span>)}</span>;
}

function ProviderProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPhotoFailed(false);
    Promise.all([authApi.getProvider(id), reviewsApi.getByProvider(id)])
      .then(([providerData, reviewsData]) => {
        if (!active) return;
        setProvider(providerData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setReviewsError(!Array.isArray(reviewsData));
        setLoading(false);
      }).catch(() => { if (active) { setProvider(null); setLoading(false); } });
    return () => { active = false; };
  }, [id, refresh]);

  if (loading) return <main className="public-provider"><div className="public-profile-empty" role="status">Loading provider profile...</div></main>;
  if (!provider || provider.message) return <main className="public-provider"><div className="public-profile-empty"><h2>Profile unavailable</h2><p>We couldn't load this provider. Please try again.</p><button onClick={() => setRefresh(value => value + 1)}>Try again</button></div></main>;
  const rating = Number(provider.rating || 0);
  const initials = (provider.name || 'Provider').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();

  return (
    <main className="public-provider">
      <nav className="public-profile-navigation" aria-label="Profile navigation">
        <button type="button" className="public-profile-back" onClick={() => navigate(-1)}><span aria-hidden="true">&larr;</span> Back</button>
      </nav>
      <section className="public-profile-hero" aria-label="Provider overview">
        <div className="public-profile-cover"><span>LOCAL EXPERTISE. PERSONAL SERVICE.</span><span className="public-profile-cover-mark" aria-hidden="true">✦</span></div>
        <div className="public-profile-intro">
          <div className="public-profile-avatar">{provider.profilePicture && !photoFailed ? <img src={provider.profilePicture} alt={provider.name} onError={() => setPhotoFailed(true)} /> : <span>{initials}</span>}</div>
          <div className="public-profile-identity"><span className="public-profile-kicker">Service professional</span><h1>{provider.name}</h1><p><span aria-hidden="true">⌖</span> {provider.location || 'Location not specified'}{provider.createdAt && <span className="public-profile-member">Member since {new Date(provider.createdAt).getFullYear()}</span>}</p></div>
          <a className="public-profile-review-link" href="#provider-reviews">Read reviews <span aria-hidden="true">↗</span></a>
        </div>
        <div className="public-profile-stats"><div><strong>{rating ? rating.toFixed(1) : '—'}<span className="public-profile-star" aria-hidden="true">★</span></strong><span>{rating ? 'Customer rating' : 'No ratings yet'}</span></div><div><strong>{provider.completedCount ?? 0}</strong><span>Jobs completed</span></div><div><strong>{reviewsError ? '—' : reviews.length}</strong><span>Customer reviews</span></div></div>
      </section>

      <div className="public-profile-columns">
        <aside className="public-profile-details">
          <section className="public-profile-panel"><span className="public-profile-kicker">What I do</span><h2>Skills & services</h2><div className="public-profile-skills">{provider.skills?.length ? provider.skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>) : <p>No skills listed yet.</p>}</div></section>
          <section className="public-profile-rate"><span className="public-profile-kicker">Hourly rate</span><p>{provider.hourlyRate > 0 ? <>Rs. {Number(provider.hourlyRate).toLocaleString()}<span>/ hour</span></> : 'Ask for a quote'}</p><span className="public-profile-rate-note">Final job prices are agreed through quotes.</span></section>
        </aside>

        <section className="public-profile-reviews" id="provider-reviews">
          <div className="public-profile-section-heading"><div><span className="public-profile-kicker">From the community</span><h2>Customer reviews</h2></div><span className="public-profile-review-count">{reviewsError ? 'Unavailable' : `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`}</span></div>
          {reviewsError ? <div className="public-profile-empty" role="alert"><p>Reviews could not be loaded.</p><button onClick={() => setRefresh(value => value + 1)}>Try again</button></div> : !reviews.length ? <div className="public-profile-empty"><span aria-hidden="true">☆</span><h3>A fresh start</h3><p>This provider hasn't received any reviews yet.</p></div> : <>
            <div className="public-profile-rating-summary"><div className="public-profile-rating-score"><strong>{rating ? rating.toFixed(1) : '—'}</strong><Stars value={rating} /><span>Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span></div><div className="public-profile-rating-bars">{[5, 4, 3, 2, 1].map(star => { const count = reviews.filter(review => Math.round(review.rating) === star).length; return <div key={star}><span>{star} <span aria-hidden="true">★</span></span><div className="public-profile-rating-track"><div style={{ width: `${count / reviews.length * 100}%` }} /></div><span>{count}</span></div>; })}</div></div>
            <div className="public-profile-review-list">{reviews.map(review => {
              const name = review.customer?.name || 'Anonymous';
              return <article key={review._id} className="public-profile-review-card"><div className="public-profile-review-top"><div className="public-profile-reviewer"><span className="public-profile-reviewer-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span><div><h3>{name}</h3>{review.createdAt && <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}</div></div><div className="public-profile-review-stars"><Stars value={review.rating} /><span>{review.rating}/5</span></div></div>{review.comment ? <p className="public-profile-comment">{review.comment}</p> : <p className="public-profile-no-comment">Left a rating without a written comment.</p>}</article>;
            })}</div>
          </>}
        </section>
      </div>
    </main>
  );
}

export default ProviderProfile;
