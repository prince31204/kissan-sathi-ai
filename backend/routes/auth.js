const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendOtpEmail } = require('../config/mailer');

// @route   POST /api/v1/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { fullName, village, district, state, password } = req.body;
    const email = (req.body.email || '').trim();

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      fullName,
      email,
      village,
      district,
      state,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ detail: 'Internal Server Error: ' + error.message });
  }
});

// @route   POST /api/v1/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || req.body.username || '').trim();
    const password = req.body.password;

    console.log("--- LOGIN ATTEMPT ---");
    console.log("Received Body:", req.body);
    console.log("Parsed Email:", email);

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ detail: 'Incorrect email or password' });
    }

    // Check if it's the admin from .env
    const adminEmail = (process.env.ADMIN_EMAIL || '').replace(/"/g, '');
    const adminPass = (process.env.ADMIN_PASSWORD || '').replace(/"/g, '');

    if (email === adminEmail && password === adminPass) {
      console.log("Admin login successful from env");
      const payload = { sub: email, role: 'admin' };
      const access_token = jwt.sign(payload, process.env.JWT_SECRET || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7', {
        expiresIn: '30d',
      });
      return res.json({
        access_token,
        token_type: 'bearer',
        name: 'Super Admin',
        email: adminEmail,
        phone: '+91 99999 00000',
        village: 'Dehradun HQ',
        district: 'Dehradun',
        state: 'Uttarakhand',
        role: 'admin',
      });
    }

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(400).json({ detail: 'Account does not exist. Please create an account first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for:", email);
      return res.status(400).json({ detail: 'Incorrect email or password' });
    }

    const payload = { sub: user.email };
    const access_token = jwt.sign(payload, process.env.JWT_SECRET || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7', {
      expiresIn: '30d',
    });

    res.json({
      access_token,
      token_type: 'bearer',
      name: user.fullName,
      email: user.email,
      phone: user.phone || user.email,
      village: user.village || 'Rampur',
      district: user.district || 'Dehradun',
      state: user.state || 'Uttarakhand',
      avatar: user.avatar || '',
      role: 'user',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        village: user.village || 'Rampur',
        district: user.district || 'Dehradun',
        state: user.state || 'Uttarakhand',
        avatar: user.avatar || '',
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ detail: 'Internal Server Error: ' + error.message });
  }
});

// @route   PUT /api/v1/auth/profile
// @desc    Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { fullName, village, district, state, phone, avatar } = req.body;
    let user = await User.findOne({ email: { $regex: new RegExp(`^${req.user}$`, 'i') } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (village !== undefined) user.village = village;
    if (district !== undefined) user.district = district;
    if (state !== undefined) user.state = state;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      name: user.fullName,
      email: user.email,
      phone: user.phone || user.email,
      village: user.village || 'Rampur',
      district: user.district || 'Dehradun',
      state: user.state || 'Uttarakhand',
      avatar: user.avatar || avatar || '',
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ detail: 'Server error: ' + error.message });
  }
});

// @route   POST /api/v1/auth/profile/update-by-email
// @desc    Update user profile by email (offline/fallback sync with upsert)
router.post('/profile/update-by-email', async (req, res) => {
  try {
    const { email, fullName, village, district, state, phone, avatar } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email is required' });

    let user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      user = new User({
        fullName: fullName || 'Farmer',
        email: email.trim().toLowerCase(),
        village: village || 'Rampur',
        district: district || 'Dehradun',
        state: state || 'Uttarakhand',
        phone: phone || '',
        avatar: avatar || '',
        password: hashedPassword,
      });
    } else {
      if (fullName) user.fullName = fullName;
      if (village !== undefined) user.village = village;
      if (district !== undefined) user.district = district;
      if (state !== undefined) user.state = state;
      if (phone !== undefined) user.phone = phone;
      if (avatar !== undefined) user.avatar = avatar;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      name: user.fullName,
      email: user.email,
      phone: user.phone || user.email,
      village: user.village || 'Rampur',
      district: user.district || 'Dehradun',
      state: user.state || 'Uttarakhand',
      avatar: user.avatar || avatar || '',
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ detail: 'Server error: ' + error.message });
  }
});

// @route   GET /api/v1/auth/me
// @desc    Get user details
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user }).select('-password');
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/v1/auth/all
// @desc    Admin: Get all users
router.get('/all', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Fetch Users Error:', error.message);
    res.status(500).json({ detail: 'Server error: ' + error.message });
  }
});

// @route   POST /api/v1/auth/forgot-password
// @desc    Send OTP to user email for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    console.log('[FORGOT PASSWORD REQUEST] Email:', email);

    if (!email) {
      return res.status(400).json({ detail: 'Please provide your email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ detail: 'No account registered with this email address' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOtp = otp;
    user.resetOtpExpires = otpExpires;
    await user.save();

    console.log(`\n========================================`);
    console.log(`🔑 [OTP GENERATED] User: ${email}`);
    console.log(`📬 [OTP CODE]: ${otp} (Valid for 10 minutes)`);
    console.log(`========================================\n`);

    let emailSent = false;
    let emailErrorMsg = '';

    try {
      await sendOtpEmail(email, otp);
      emailSent = true;
      console.log(`✅ [EMAIL SUCCESS] OTP email sent successfully to ${email}`);
    } catch (mailError) {
      emailErrorMsg = mailError.message;
      console.error(`❌ [EMAIL SEND FAILED]:`, mailError.message);
    }

    res.json({
      success: true,
      emailSent: emailSent,
      message: emailSent
        ? 'A 6-digit verification code (OTP) has been sent to your email.'
        : 'OTP generated! (Email delivery failed: ' + emailErrorMsg + '). Check backend terminal for OTP in development.',
      email: email,
      // For smooth local testing if SMTP credentials have an issue
      devOtp: !emailSent ? otp : undefined,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error.message);
    res.status(500).json({ detail: 'Internal Server Error: ' + error.message });
  }
});

// @route   POST /api/v1/auth/verify-otp
// @desc    Verify OTP for password reset
router.post('/verify-otp', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = (req.body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ detail: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ detail: 'User account not found' });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ detail: 'No OTP request found. Please request an OTP first.' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ detail: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ detail: 'Invalid OTP code. Please enter the correct OTP.' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP Error:', error.message);
    res.status(500).json({ detail: 'Internal Server Error: ' + error.message });
  }
});

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password after OTP verification
router.post('/reset-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = (req.body.otp || '').trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ detail: 'All fields (Email, OTP, New Password) are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ detail: 'No OTP requested or session expired' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ detail: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ detail: 'Invalid OTP code' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    console.log(`✅ [PASSWORD RESET SUCCESS] New password saved for ${email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset Password Error:', error.message);
    res.status(500).json({ detail: 'Internal Server Error: ' + error.message });
  }
});

module.exports = router;
