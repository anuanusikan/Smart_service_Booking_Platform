const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// CUSTOMER submits a review after a job is completed
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can leave reviews' });
    }

    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed jobs' });
    }

    const existing = await Review.findOne({ booking: bookingId });
    if (existing) {
      return res.status(400).json({ message: 'You already reviewed this booking' });
    }

    const review = new Review({
      booking: bookingId,
      job: booking.job,
      provider: booking.provider,
      customer: req.user.id,
      rating,
      comment
    });

    await review.save();

    // Recalculate this provider's average rating
    const providerReviews = await Review.find({ provider: booking.provider });
    const avgRating =
      providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;

    await User.findByIdAndUpdate(booking.provider, { rating: avgRating });

    res.status(201).json({ message: 'Review submitted', review });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all reviews for a specific provider (public)
router.get('/provider/:providerId', async (req, res) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET list of booking IDs the logged-in customer has already reviewed
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user.id }).select('booking');
    const reviewedBookingIds = reviews.map(r => r.booking.toString());
    res.json(reviewedBookingIds);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;