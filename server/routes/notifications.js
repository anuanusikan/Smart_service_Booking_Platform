const express = require('express');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET all notifications for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) {
      return res.status(400).json({ message: 'Invalid notification page' });
    }
    const filter = { recipient: req.user.id, type: { $ne: 'new_message' } };
    if (req.query.types !== undefined) {
      const allowed = ['booking_request', 'booking_status', 'quote_received', 'quote_status', 'system'];
      if (typeof req.query.types !== 'string') return res.status(400).json({ message: 'Invalid notification types' });
      filter.type = { $in: req.query.types.split(',').filter(type => allowed.includes(type)) };
    }
    const notifications = await Notification.find(filter)
      .populate('sender', 'name role profilePicture')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 30)
      .limit(31);

    const unreadCount = await Notification.countDocuments({
      ...filter,
      read: false
    });

    res.json({
      notifications: notifications.slice(0, 30),
      unreadCount,
      page,
      hasMore: notifications.length > 30
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// MARK ALL notifications as read
// IMPORTANT: This must come before /:id/read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.id,
        read: false
      },
      {
        read: true
      }
    );

    res.json({
      message: 'All notifications marked as read'
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// MARK a single notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user.id
      },
      {
        read: true
      },
      {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// CLEAR ALL notifications for current user
// IMPORTANT: This must come before /:id
router.delete('/clear-all', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id
    });

    res.json({
      message: 'All notifications cleared'
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// CLEAR/DELETE a single notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification removed'
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;
