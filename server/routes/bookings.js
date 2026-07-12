const express = require('express');
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// PROVIDER requests to take a job
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can request jobs' });
    }

    const { jobId } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'This job is no longer open' });
    }

    const newBooking = new Booking({
      job: job._id,
      provider: req.user.id,
      customer: job.postedBy
    });

    await newBooking.save();

    res.status(201).json({ message: 'Booking request sent', booking: newBooking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET bookings for the logged-in user (as provider or customer)
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === 'provider'
      ? { provider: req.user.id }
      : { customer: req.user.id };

    const bookings = await Booking.find(filter)
      .populate('job')
      .populate('provider', 'name email')
      .populate('customer', 'name email');

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CUSTOMER accepts or declines a booking
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body; // "accepted" or "declined"

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    booking.status = status;
    await booking.save();

    // If accepted, mark the job as assigned
    if (status === 'accepted') {
      await Job.findByIdAndUpdate(booking.job, { status: 'assigned' });
    }

    res.json({ message: `Booking ${status}`, booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;