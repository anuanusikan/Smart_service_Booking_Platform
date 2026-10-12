import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerPortalLayout from '../components/CustomerPortalLayout';
import { apiUpload } from '../services/api';
import { appointmentISO } from '../utils/appointments';
import JobDetailsFields from '../components/JobDetailsFields';
import { validateJobForm } from '../utils/jobValidation';

function PostJob() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    budget: '',
    scheduledAt: ''
  });
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files).slice(0, 3);
    setImages(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const fieldErrors = validateJobForm(formData);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      setMessage({ type: 'error', text: 'Please check the highlighted fields below.' });
      return;
    }

    if (formData.scheduledAt && new Date(appointmentISO(formData.scheduledAt)).getTime() <= Date.now()) {
      setMessage({ type: 'error', text: 'Choose a future appointment date and time.' });
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', text: 'You must be logged in to post a job.' });
      return;
    }

    setUploading(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('location', formData.location);
    data.append('budget', formData.budget);
    data.append('scheduledAt', appointmentISO(formData.scheduledAt) || '');
    images.forEach((img) => data.append('images', img));

    try {
      const { ok, data: result } = await apiUpload('/jobs', data, 'POST');
      setUploading(false);

      if (ok) {
        setMessage({ type: 'success', text: '✓ Job posted successfully! Redirecting to My Jobs...' });
        setTimeout(() => navigate('/my-jobs'), 1200);
      } else {
        setMessage({ type: 'error', text: result?.message || 'Failed to post job' });
      }
    } catch {
      setUploading(false);
      setMessage({ type: 'error', text: 'Server error. Please try again.' });
    }
  };

  return (
    <CustomerPortalLayout
      title="Post a New Job"
      subtitle="Publish your service need and receive competitive quotes from skilled local providers."
      centerContent
    >
      <div className="job-form-shell">
        <div className="job-form-banner"><span className="job-form-kicker">A great project starts here</span><h2>Let's bring your project to life.</h2><p>Share a few details. Let local professionals take care of the rest.</p></div>
        <div className="job-form-content">
        {message.text && (
          <div role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontWeight: 600,
              fontSize: '14px',
              background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: message.type === 'success' ? 'var(--success-dark)' : 'var(--danger)'
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="job-details-form">
          <div className="job-form-section-title"><span>01</span><div><h3>The essentials</h3><p>Tell providers what you need.</p></div></div>
          <JobDetailsFields values={formData} errors={errors} onChange={(name, value) => {
            setFormData(current => ({ ...current, [name]: value }));
            setErrors(current => ({ ...current, [name]: undefined }));
          }} />
          <div className="appointment-field">
            <span className="appointment-kicker">Plan your visit</span>
            <label htmlFor="job-appointment">Appointment date &amp; time <span>(optional)</span></label>
            <input id="job-appointment" type="datetime-local" name="scheduledAt" value={formData.scheduledAt} onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })} aria-describedby="appointment-hint" />
            <p id="appointment-hint">Sri Lanka time (UTC +05:30). Leave blank if you want to arrange a time with the provider.</p>
          </div>

          <label htmlFor="job-photos" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>
            Attach Photos (optional, up to 3)
          </label>
          <input
            id="job-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            style={{ fontSize: '13px' }}
          />

          <button type="submit" disabled={uploading} className="job-form-submit" style={{ width: '100%', marginTop: '10px' }}>
            {uploading ? 'Publishing job...' : 'Publish Job Listing →'}
          </button>
          <p className="job-form-privacy">Your job will be visible to providers. Share only the details needed for a quote.</p>
        </form>
        </div>
      </div>
    </CustomerPortalLayout>
  );
}

export default PostJob;