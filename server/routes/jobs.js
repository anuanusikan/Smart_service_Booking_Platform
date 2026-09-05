const multer = require('multer');
const { storage } = require('../config/cloudinary');

const upload = multer({ storage });
const express = require('express');
const Job = require('../models/Job');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// CREATE a job (protected — must be logged in)
router.post('/', authMiddleware, upload.array('images', 3), async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can post jobs' });
    }

    const { title, description, category, location, budget } = req.body;

        if (!title || title.trim().length < 3) {
      return res.status(400).json({ message: 'Title must be at least 3 characters' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: 'Description must be at least 10 characters' });
    }
    if (!category || category.trim().length === 0) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (budget && (isNaN(budget) || Number(budget) < 0)) {
      return res.status(400).json({ message: 'Budget must be a positive number' });
    }
    
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    const newJob = new Job({
      title,
      description,
      category,
      location,
      budget,
      postedBy: req.user.id,
      images: imageUrls
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
    const { category, location, minBudget, maxBudget } = req.query;

    const filter = { status: 'open' };

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = Number(minBudget);
      if (maxBudget) filter.budget.$lte = Number(maxBudget);
    }

    const jobs = await Job.find(filter).populate('postedBy', 'location');
    res.json(jobs);
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

    const User = require('../models/User');
    const provider = await User.findById(req.user.id);

    const jobs = await Job.find({ status: 'open' }).populate('postedBy', 'name email location');

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

    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scoredJobs);
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

    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE a job (only the customer who posted it, and only if still open)
router.put('/:id', authMiddleware, async (req, res) => {
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

    const { title, description, category, location, budget } = req.body;

    job.title = title ?? job.title;
    job.description = description ?? job.description;
    job.category = category ?? job.category;
    job.location = location ?? job.location;
    job.budget = budget ?? job.budget;

    await job.save();

    res.json({ message: 'Job updated successfully', job });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a job (only the customer who posted it, and only if still open)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Only open jobs can be deleted' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;