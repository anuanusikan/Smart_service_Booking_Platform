const express = require('express');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET all messages for a specific booking
router.get('/:bookingId', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isParty =
      booking.customer.toString() === req.user.id ||
      booking.provider.toString() === req.user.id;

    if (!isParty) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const messages = await Message.find({ booking: req.params.bookingId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST a new message on a booking
router.post('/:bookingId', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isParty =
      booking.customer.toString() === req.user.id ||
      booking.provider.toString() === req.user.id;

    if (!isParty) {
      return res.status(403).json({ message: 'Not authorized to message on this booking' });
    }

    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const message = new Message({
      booking: req.params.bookingId,
      sender: req.user.id,
      text: text.trim()
    });

    await message.save();
    await message.populate('sender', 'name');

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;