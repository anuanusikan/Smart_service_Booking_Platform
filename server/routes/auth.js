const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Booking = require('../models/Booking');
const multer = require('multer');
const { storage: profileStorage } = require('../config/cloudinaryProfile');
const uploadProfilePic = multer({ storage: profileStorage });
const authMiddleware = require('../middleware/auth');
const { DEFAULT_SETTINGS } = require('../services/notificationSettings');

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, skills, location, hourlyRate } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      skills,
      location,
      hourlyRate
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

if (!user) {
  return res.status(400).json({
    message: 'Invalid email or password'
  });
}

if (role && user.role !== role) {
  return res.status(400).json({
    message: `This account is registered as a ${user.role}.`
  });
}

    // Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// GET public profile of a provider
router.get('/provider/:id', async (req, res) => {
  try {
    const provider = await User.findById(req.params.id).select('name role skills location rating hourlyRate createdAt profilePicture');

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const completedCount = await Booking.countDocuments({ provider: provider._id, status: 'completed' });
    res.json({ ...provider.toObject(), completedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET my own full profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/me/notification-settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationSettings');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const saved = user.notificationSettings?.toObject?.() || user.notificationSettings;
    res.json({ settings: saved ? { ...DEFAULT_SETTINGS, ...saved } : null });
  } catch {
    res.status(500).json({ message: 'Could not load preferences' });
  }
});

router.put('/me/notification-settings', authMiddleware, async (req, res) => {
  try {
    const { settings, initialize = false } = req.body || {};
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) || typeof initialize !== 'boolean' ||
      Object.keys(settings).length === 0 || Object.entries(settings).some(([key, value]) => !Object.hasOwn(DEFAULT_SETTINGS, key) || typeof value !== 'boolean')) {
      return res.status(400).json({ message: 'Invalid notification preferences' });
    }
    const filter = { _id: req.user.id };
    if (initialize) filter.notificationSettings = { $exists: false };
    const update = initialize ? { notificationSettings: { ...DEFAULT_SETTINGS, ...settings } } :
      Object.fromEntries(Object.entries(settings).map(([key, value]) => [`notificationSettings.${key}`, value]));
    let user = await User.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });
    // Another device may have initialized preferences first. Keep that winner.
    if (!user && initialize) user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const saved = user.notificationSettings?.toObject?.() || user.notificationSettings || {};
    res.json({ settings: { ...DEFAULT_SETTINGS, ...saved } });
  } catch {
    res.status(500).json({ message: 'Could not save preferences. Please try again.' });
  }
});

// UPDATE my own profile (including optional picture upload)
router.put('/me', authMiddleware, uploadProfilePic.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, location, hourlyRate, skills } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;
    if (skills !== undefined) user.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (req.file) user.profilePicture = req.file.path;

    await user.save();

    const { password, ...safeUser } = user.toObject();
    res.json({ message: 'Profile updated', user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
