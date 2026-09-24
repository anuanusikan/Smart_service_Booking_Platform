const express = require('express');
const Quote = require('../models/Quote');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// PROVIDER submits a quote on a job
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can submit quotes' });
    }

    const { jobId, price, message } = req.body;

    if (!price || Number(price) <= 0) {
      return res.status(400).json({ message: 'Please enter a valid price' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'This job is no longer open' });
    }

    const existing = await Quote.findOne({ job: jobId, provider: req.user.id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already submitted a quote for this job' });
    }

    const quote = new Quote({
      job: jobId,
      provider: req.user.id,
      customer: job.postedBy,
      price,
      message
    });

    await quote.save();

    try {
      await Notification.create({
        recipient: job.postedBy,
        sender: req.user.id,
        type: 'quote_received',
        title: 'New Quote Received',
        message: `A provider submitted a quote of Rs. ${price} for "${job.title}"`,
        link: '/my-jobs'
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.status(201).json({ message: 'Quote submitted', quote });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET quotes for a specific job (only the job's owner can view)
router.get('/job/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view these quotes' });
    }

    const quotes = await Quote.find({ job: req.params.jobId })
      .populate('provider', 'name email location rating skills profilePicture')
      .sort({ price: 1 });

    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET quotes I've submitted (provider view)
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const quotes = await Quote.find({ provider: req.user.id })
      .populate('job')
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CUSTOMER accepts a quote — creates a real Booking, declines the rest
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    if (quote.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to accept this quote' });
    }
    if (quote.status !== 'pending') {
      return res.status(400).json({ message: 'This quote is no longer pending' });
    }

    quote.status = 'accepted';
    await quote.save();

    await Quote.updateMany(
      { job: quote.job, _id: { $ne: quote._id }, status: 'pending' },
      { status: 'declined' }
    );

    const job = await Job.findByIdAndUpdate(quote.job, { status: 'assigned' }, { new: true });

    const booking = new Booking({
      job: quote.job,
      provider: quote.provider,
      customer: quote.customer,
      status: 'accepted'
    });
    await booking.save();

    try {
      await Notification.create({
        recipient: quote.provider,
        sender: req.user.id,
        type: 'quote_status',
        title: 'Quote Accepted!',
        message: `Your quote of Rs. ${quote.price} for "${job?.title || 'the job'}" was accepted!`,
        link: '/my-bookings'
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.json({ message: 'Quote accepted, booking created', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CUSTOMER declines a specific quote
router.put('/:id/decline', authMiddleware, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    if (quote.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to decline this quote' });
    }

    quote.status = 'declined';
    await quote.save();
    res.json({ message: 'Quote declined' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;