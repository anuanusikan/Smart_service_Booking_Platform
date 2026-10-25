const express = require('express');
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const { declinePendingQuotes } = require('../services/quoteNotifications');
const Notification = require('../models/Notification');
const Quote = require('../models/Quote');
const { resolveBookingPrices } = require('../services/bookingPrices');
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

    if (await Job.exists({ _id: jobId, status: 'deleted' })) {
      await Booking.updateOne({ _id: newBooking._id, status: 'pending' }, { status: 'declined' });
      return res.status(409).json({ message: 'This job was removed by the customer.' });
    }

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

    if (req.query.view === 'history') filter.hiddenFor = { $ne: req.user.id };
    const earningsOnly = req.query.view === 'earnings';
    if (earningsOnly) filter.status = 'completed';
    const query = Booking.find(filter);
    if (earningsOnly) {
      query.select('job provider customer status agreedPrice updatedAt')
        .populate('job', 'title budget')
        .populate('customer', 'name');
    } else {
      query.populate('job')
        .populate('provider', 'name email profilePicture')
        .populate('customer', 'name email profilePicture');
    }
    const bookings = await query.lean();

    // Recover prices for older bookings without rewriting historical records.
    const legacy = bookings.filter(b => b.agreedPrice == null && b.job && ['accepted', 'completed'].includes(b.status));
    const acceptedQuotes = legacy.length ? await Quote.find({
      job: { $in: legacy.map(b => b.job._id) },
      status: 'accepted',
      ...(req.user.role === 'provider' ? { provider: req.user.id } : { customer: req.user.id })
    }).select('job provider customer price').lean() : [];
    res.json(resolveBookingPrices(bookings, acceptedQuotes));
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

    const expectedStatus = {
      accepted: 'pending',
      declined: 'pending',
      completed: 'accepted'
    }[status];
    if (!expectedStatus || booking.status !== expectedStatus) {
      return res.status(400).json({ message: 'This booking cannot be changed to that status' });
    }
    if (!booking.job) {
      return res.status(404).json({ message: 'Job no longer exists' });
    }

    if (status === 'accepted') {
      // Claim the job atomically, shared with quote acceptance.
      const claimed = await Job.findOneAndUpdate(
        { _id: booking.job._id, status: 'open' },
        { status: 'assigned' },
        { new: true }
      );
      if (!claimed) {
        return res.status(409).json({ message: 'This job is no longer open' });
      }
      try {
        const updated = await Booking.findOneAndUpdate(
          { _id: booking._id, status: 'pending' },
          { status: 'accepted', agreedPrice: booking.job.budget },
          { new: true }
        );
        if (!updated) {
          await Job.updateOne({ _id: booking.job._id, status: 'assigned' }, { status: 'open' });
          return res.status(409).json({ message: 'This booking has already changed. Please refresh.' });
        }
      } catch (err) {
        await Job.updateOne({ _id: booking.job._id, status: 'assigned' }, { status: 'open' });
        throw err;
      }
      await Booking.updateMany(
        { job: booking.job._id, _id: { $ne: booking._id }, status: 'pending' },
        { status: 'declined' }
      );
      await declinePendingQuotes({ job: booking.job._id }, req.user.id, booking.job.title);
    } else {
      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: expectedStatus },
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(409).json({ message: 'This booking has already changed. Please refresh.' });
      }
      if (status === 'completed') {
        await Job.findByIdAndUpdate(booking.job._id, { status: 'completed' });
      }
    }
    booking.status = status;
    if (status === 'accepted') booking.agreedPrice = booking.job.budget;

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

    // Recheck ownership and status in the delete itself: acceptance may have
    // changed the booking since the initial read.
    const cancelled = await Booking.findOneAndDelete({
      _id: req.params.id,
      provider: req.user.id,
      status: 'pending'
    });
    if (!cancelled) {
      return res.status(409).json({ message: 'This booking has already changed. Please refresh.' });
    }
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Hide a finished booking only from the requesting participant's history
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

    await Booking.updateOne(
      { _id: booking._id },
      { $addToSet: { hiddenFor: req.user.id } },
      { timestamps: false }
    );
    res.json({ message: 'Booking removed from history' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
