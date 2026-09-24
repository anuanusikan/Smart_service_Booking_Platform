const express = require('express');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET all conversations for current user
router.get('/conversations/mine', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ customer: req.user.id }, { provider: req.user.id }]
    })
      .populate('job', 'title category budget')
      .populate('provider', 'name email role profilePicture')
      .populate('customer', 'name email role profilePicture')
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(
      bookings.map(async (b) => {
        const lastMsg = await Message.findOne({ booking: b._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name');

        const otherUser = b.customer._id.toString() === req.user.id ? b.provider : b.customer;

        return {
          bookingId: b._id,
          bookingStatus: b.status,
          job: b.job,
          otherUser,
          lastMessage: lastMsg ? {
            text: lastMsg.text,
            createdAt: lastMsg.createdAt,
            sender: lastMsg.sender
          } : null,
          updatedAt: lastMsg ? lastMsg.createdAt : b.updatedAt
        };
      })
    );

    // Sort by latest message/activity
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

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

    // Create notification for recipient
    const recipientId = booking.customer.toString() === req.user.id
      ? booking.provider
      : booking.customer;

    try {
      await Notification.create({
        recipient: recipientId,
        sender: req.user.id,
        type: 'new_message',
        title: `Message from ${message.sender?.name || 'User'}`,
        message: text.trim().length > 60 ? `${text.trim().substring(0, 60)}...` : text.trim(),
        link: '/my-bookings'
      });
    } catch (notifErr) {
      console.error('Failed to create message notification:', notifErr);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;