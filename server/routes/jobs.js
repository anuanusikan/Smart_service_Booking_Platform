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


module.exports = router;