const express = require('express');
const Job = require('../models/Job');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// CREATE a job (protected — must be logged in)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Only customers should be able to post jobs
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can post jobs' });
    }

    const { title, description, category, location, budget } = req.body;

    const newJob = new Job({
      title,
      description,
      category,
      location,
      budget,
      postedBy: req.user.id
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
    const jobs = await Job.find().populate('postedBy', 'name email location');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;