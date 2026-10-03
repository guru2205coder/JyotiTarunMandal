import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'jyoti_navratra_solapur_secret_key_2026_mandal',
    { expiresIn: '30d' }
  );
};

// Seed default admin if none exists
const ensureDefaultAdmin = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    await User.create([
      {
        name: 'Gururaj (Admin)',
        email: 'gururajkaki2205@gmail.com',
        mobile: '9876543210',
        password: 'admin',
        role: 'Admin',
        title: 'registered the mandal',
      },
      {
        name: 'Gururaj Kaki',
        email: 'gururaj@jyotimandal.com',
        mobile: '9175344556',
        password: 'admin',
        role: 'Admin',
        title: 'Mandal Admin',
      },
    ]);
  }
};

// POST /api/users/login (Accepts email or mobile number + password)
router.post('/login', async (req, res) => {
  try {
    await ensureDefaultAdmin();
    const { email, mobile, identifier, username, password } = req.body;
    const loginId = (identifier || email || mobile || username || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ message: 'कृपया मोबाईल/ईमेल आणि पासवर्ड टाका' });
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobile: loginId },
      ],
    });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        title: user.title,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'चुकीचा मोबाईल/ईमेल किंवा पासवर्ड (Invalid credentials)' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/karyakartas?festivalId=...
router.get('/karyakartas', async (req, res) => {
  try {
    await ensureDefaultAdmin();
    const { festivalId } = req.query;
    const users = await User.find().select('-password').sort({ createdAt: 1 }).lean();

    // Calculate collection amounts per karyakarta
    const paymentFilter = { isReversed: { $ne: true } };
    if (festivalId) {
      paymentFilter.festivalId = festivalId;
    }
    const payments = await Payment.find(paymentFilter).lean();

    const collectionsByPerson = {};
    payments.forEach((p) => {
      const collector = p.collectedBy || 'Gururaj';
      collectionsByPerson[collector] = (collectionsByPerson[collector] || 0) + p.amount;
    });

    const karyakartas = users.map((u) => ({
      ...u,
      totalCollected: collectionsByPerson[u.name] || 0,
      initial: u.name ? u.name.charAt(0).toUpperCase() : 'K',
    }));

    res.json(karyakartas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/users/karyakarta (Admin only - create new karyakarta with password)
router.post('/karyakarta', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, mobile, role, password, title } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'या ईमेलचा कार्यकर्ता आधीपासून अस्तित्वात आहे' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile ? mobile.trim() : '',
      role: role || 'Volunteer',
      title: title || 'Volunteer karyakarta',
      password: password || '123456',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      title: user.title,
      totalCollected: 0,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/users/me (Get current logged-in user profile)
router.get('/me', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'jyoti_navratra_solapur_secret_key_2026_mandal'
      );
      const user = await User.findById(decoded.id).select('-password');
      if (user) return res.json(user);
    }

    // Default to admin
    await ensureDefaultAdmin();
    const defaultAdmin = await User.findOne({ role: 'Admin' }).select('-password');
    res.json(defaultAdmin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/profile (Update admin/worker profile - protected)
router.put('/profile', protect, async (req, res) => {
  try {
    const { id, name, mobile, password, role } = req.body;
    let targetUser;

    if (id && id !== req.user._id.toString()) {
      // Modifying someone else's profile requires Admin role
      if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'इतर कार्यकर्त्यांची माहिती बदलण्याचा अधिकार फक्त मुख्य ॲडमिनला आहे',
        });
      }
      targetUser = await User.findById(id);
    } else {
      // Modifying own profile
      targetUser = await User.findById(req.user._id);
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) targetUser.name = name.trim();
    if (mobile) targetUser.mobile = mobile.trim();
    if (password && password.trim().length >= 4) {
      targetUser.password = password.trim();
    }
    // Only Admin can assign/change roles
    if (role && (req.user.role === 'Admin' || req.user.role === 'admin')) {
      targetUser.role = role;
    }

    await targetUser.save();

    res.json({
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      mobile: targetUser.mobile,
      role: targetUser.role,
      title: targetUser.title,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
