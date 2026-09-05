import { useState, useEffect } from 'react';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const token = localStorage.getItem('token');

  const fetchJobs = () => {
    fetch('http://localhost:5000/api/jobs/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const startEditing = (job) => {
    setEditingId(job._id);
    setEditForm({
      title: job.title,
      description: job.description,
      category: job.category,
      location: job.location,
      budget: job.budget
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (jobId) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Job updated successfully');
        setEditingId(null);
        fetchJobs();
      } else {
        setMessage(data.message || 'Update failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    setMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Job deleted');
        fetchJobs();
      } else {
        setMessage(data.message || 'Delete failed');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
    }
  };

  if (loading) return <p>Loading your jobs...</p>;

  return (
    <div className="job-list">
      <h2>My Posted Jobs</h2>
      {message && <p><b>{message}</b></p>}
      {jobs.length === 0 && <p>You haven't posted any jobs yet.</p>}

      {jobs.map((job) => (
        <div key={job._id} className="card">
          <span className={`status-badge status-${job.status}`}>{job.status}</span>

          {editingId === job._id ? (
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
              <input
                type="number"
                value={editForm.budget}
                onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
              />
              <button onClick={() => saveEdit(job._id)}>Save</button>
              {' '}
              <button onClick={cancelEditing} style={{ background: '#6b7280' }}>Cancel</button>
            </div>
          ) : (
            <>
              <h3 style={{ marginTop: '10px' }}>{job.title}</h3>
              <p>{job.description}</p>
              <p className="meta"><b>Category:</b> {job.category}</p>
              <p className="meta"><b>Location:</b> {job.location}</p>
              <p className="meta"><b>Budget:</b> Rs. {job.budget}</p>

              {job.status === 'open' && (
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => startEditing(job)}>Edit</button>
                  {' '}
                  <button onClick={() => deleteJob(job._id)} style={{ background: '#B5453A' }}>Delete</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default MyJobs;