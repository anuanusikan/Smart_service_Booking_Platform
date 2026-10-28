const multer = require('multer');
const { storage } = require('../config/cloudinary');

const upload = multer({ storage });
const express = require('express');
const Job = require('../models/Job');
const Quote = require('../models/Quote');
const Booking = require('../models/Booking');
const { validateJobInput } = require('../services/jobValidation');
const { jobFilters, sortJobs } = require('../services/jobFilters');
const { parseAppointment } = require('../services/appointments');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// CREATE a job (protected — must be logged in)
router.post('/', authMiddleware, requireRole('customer'), upload.array('images', 3), async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can post jobs' });
    }

    const validated = validateJobInput(req.body);
    if (validated.message) return res.status(400).json({ message: validated.message, errors: validated.errors });
    const { title, description, category, location, budget } = validated.value;

    const appointment = parseAppointment(req.body.scheduledAt);
    if (appointment.error) return res.status(400).json({ message: appointment.error });

    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    const newJob = new Job({
      title,
      description,
      category,
      location,
      budget,
      postedBy: req.user.id,
      images: imageUrls,
      scheduledAt: appointment.value
    });

    await newJob.save();

    res.status(201).json({ message: 'Job posted successfully', job: newJob });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all jobs (public — anyone can browse)
router.get('/', async (req, res) => {
  try {
    let filter;
    try { filter = jobFilters(req.query); }
    catch (err) { return res.status(400).json({ message: err.message }); }

    const jobs = await Job.find(filter).populate('postedBy', 'location');
    res.json(sortJobs(jobs, req.query?.sort || 'newest'));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET jobs matched/ranked for the logged-in provider
router.get('/matched', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can view matched jobs' });
    }

    let filter;
    try { filter = jobFilters(req.query); }
    catch (err) { return res.status(400).json({ message: err.message }); }

    const User = require('../models/User');
    const provider = await User.findById(req.user.id);

    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const jobs = await Job.find(filter).populate('postedBy', 'name email location');

    const providerSkills = (provider.skills || []).map(s => s.toLowerCase());
    const providerLocation = (provider.location || '').toLowerCase();

    const scoredJobs = jobs.map(job => {
      let score = 0;

      if (providerSkills.includes(job.category.toLowerCase())) {
        score += 50;
      }

      if (job.location && job.location.toLowerCase() === providerLocation) {
        score += 30;
      }

      score += (provider.rating || 0) * 4;

      return { ...job.toObject(), matchScore: score };
    });

    res.json(sortJobs(scoredJobs, req.query?.sort || 'match'));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET jobs posted by the logged-in customer
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can view their posted jobs' });
    }

    const jobs = await Job.find({ postedBy: req.user.id, status: { $ne: 'deleted' } }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE a job (only the customer who posted it, and only if still open)
router.put('/:id', authMiddleware, requireRole('customer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this job' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Only open jobs can be edited' });
    }

    const validated = validateJobInput(req.body, true);
    if (validated.message) return res.status(400).json({ message: validated.message, errors: validated.errors });

    const appointment = parseAppointment(req.body.scheduledAt, job.scheduledAt);
    if (appointment.error) return res.status(400).json({ message: appointment.error });
    job.scheduledAt = appointment.value;

    Object.assign(job, validated.value);

    await job.save();

    res.json({ message: 'Job updated successfully', job });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a job (only the customer who posted it, and only if still open)
router.delete('/:id', authMiddleware, requireRole('customer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    if (!['open', 'deleted'].includes(job.status)) {
      return res.status(400).json({ message: 'Only open jobs can be deleted' });
    }

    // Compete with acceptance for the open job, while preserving historical
    // references and prices. A retry can finish cleanup after a partial failure.
    const deleted = await Job.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user.id, status: { $in: ['open', 'deleted'] } },
      { status: 'deleted' },
      { new: true }
    );
    if (!deleted) {
      return res.status(409).json({ message: 'This job has already changed. Please refresh.' });
    }
    await Quote.updateMany({ job: job._id, status: 'pending' }, { status: 'declined' });
    await Booking.updateMany({ job: job._id, status: 'pending' }, { status: 'declined' });
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
