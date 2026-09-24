const express = require('express');
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
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

    const existingBooking = await Booking.findOne({
      job: jobId,
      provider: req.user.id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'You already requested this job' });
    }

    const newBooking = new Booking({
      job: job._id,
      provider: req.user.id,
      customer: job.postedBy
    });

    await newBooking.save();

    try {
      await Notification.create({
        recipient: job.postedBy,
        sender: req.user.id,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `A service provider requested to take your job "${job.title}"`,
        link: '/my-bookings'
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

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
      .populate('provider', 'name email profilePicture')
      .populate('customer', 'name email profilePicture');

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CUSTOMER accepts or declines a booking
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body; // "accepted", "declined", or "completed"

    const booking = await Booking.findById(req.params.id).populate('job');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    if (status === 'completed' && booking.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted bookings can be marked completed' });
    }

    booking.status = status;
    await booking.save();

    if (status === 'accepted') {
      await Job.findByIdAndUpdate(booking.job, { status: 'assigned' });
    }

    if (status === 'completed') {
      await Job.findByIdAndUpdate(booking.job, { status: 'completed' });
    }

    try {
      const statusTitle = status.charAt(0).toUpperCase() + status.slice(1);
      await Notification.create({
        recipient: booking.provider,
        sender: req.user.id,
        type: 'booking_status',
        title: `Booking ${statusTitle}`,
        message: `Your booking for "${booking.job?.title || 'the job'}" has been ${status}.`,
        link: '/my-bookings'
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.json({ message: `Booking ${status}`, booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PROVIDER cancels their own pending request
router.delete('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Either party deletes a finished (declined/completed) booking from their history
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isParty =
      booking.customer.toString() === req.user.id ||
      booking.provider.toString() === req.user.id;

    if (!isParty) {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    if (!['declined', 'completed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only declined or completed bookings can be removed' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking removed from history' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;