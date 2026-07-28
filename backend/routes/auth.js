const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const pendingRegistrations = new Map();

const sendVerificationEmail = async (email, token, code) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email verification is not configured. Use this verification link instead:');
    console.log(verificationUrl);
    console.log(`Verification code: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your OJT Tracker account',
    html: `<p>Thank you for registering. Please verify your email by clicking <a href="${verificationUrl}">here</a>.</p><p>Your verification code is: <strong>${code}</strong></p>`
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, requiredHours } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const existingPending = pendingRegistrations.get(normalizedEmail);
    if (existingPending) {
      return res.status(400).json({
        message: 'A verification email is already pending for this email address.'
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    pendingRegistrations.set(normalizedEmail, {
      name,
      email: normalizedEmail,
      password,
      requiredHours: requiredHours || 500,
      verificationToken,
      verificationCode,
      verificationCodeExpires
    });

    try {
      await sendVerificationEmail(normalizedEmail, verificationToken, verificationCode);
    } catch (emailError) {
      pendingRegistrations.delete(normalizedEmail);
      console.error('Verification email failed:', emailError.message);
      return res.status(500).json({
        message: 'Unable to send the verification email right now. Please try again later.'
      });
    }

    res.status(201).json({
      message: 'Registration successful. Please verify your email before logging in.',
      requiresVerification: true,
      user: {
        email: normalizedEmail,
        isVerified: false
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
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
        requiredHours: user.requiredHours
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update required OJT hours
router.put('/required-hours', auth, async (req, res) => {
  try {
    const { requiredHours } = req.body;
    const parsedHours = Number(requiredHours);

    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      return res.status(400).json({ message: 'Please enter a valid number of hours' });
    }

    req.user.requiredHours = parsedHours;
    await req.user.save();

    res.json({
      message: 'Required hours updated successfully',
      requiredHours: req.user.requiredHours,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        requiredHours: req.user.requiredHours
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify email using a link token or a 6-digit code
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is missing' });
    }

    const pendingEntry = Array.from(pendingRegistrations.values()).find((entry) => entry.verificationToken === token);
    if (!pendingEntry) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const user = new User({
      name: pendingEntry.name,
      email: pendingEntry.email,
      password: pendingEntry.password,
      requiredHours: pendingEntry.requiredHours,
      isVerified: true,
      verificationToken: null,
      verificationCode: null,
      verificationCodeExpires: null
    });

    await user.save();
    pendingRegistrations.delete(pendingEntry.email);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const normalizedEmail = email.toLowerCase();
    const pendingEntry = pendingRegistrations.get(normalizedEmail);
    if (!pendingEntry) {
      return res.status(400).json({ message: 'No pending verification was found for this email' });
    }

    if (!pendingEntry.verificationCode || !pendingEntry.verificationCodeExpires) {
      return res.status(400).json({ message: 'No verification code was issued for this account' });
    }

    if (pendingEntry.verificationCode !== code || new Date() > pendingEntry.verificationCodeExpires) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const user = new User({
      name: pendingEntry.name,
      email: pendingEntry.email,
      password: pendingEntry.password,
      requiredHours: pendingEntry.requiredHours,
      isVerified: true,
      verificationToken: null,
      verificationCode: null,
      verificationCodeExpires: null
    });

    await user.save();
    pendingRegistrations.delete(normalizedEmail);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before continuing.' });
    }

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      requiredHours: req.user.requiredHours,
      isVerified: req.user.isVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
