import express from 'express';
import { Festival } from '../models/Festival.js';
import { protect, adminOnly, treasurerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all festivals
router.get('/', async (req, res) => {
  try {
    let festivals = await Festival.find().sort({ year: -1, createdAt: -1 });
    if (festivals.length === 0) {
      // Seed default festival
      const defaultFest = await Festival.create({
        name: 'नवरात्र उत्सव २०२६',
        year: 2026,
        mandalNameMarathi: 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
        mandalAddress: 'इंदिरा नगर, सोलापूर',
        openingBalance: 0,
        targetCollection: 100000,
        joinCode: 'VXEVQE',
        isActive: true,
      });
      festivals = [defaultFest];
    }
    res.json(festivals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get currently active festival
router.get('/active', async (req, res) => {
  try {
    let active = await Festival.findOne({ isActive: true });
    if (!active) {
      active = await Festival.findOne().sort({ year: -1 });
      if (!active) {
        active = await Festival.create({
          name: 'नवरात्र उत्सव २०२६',
          year: 2026,
          mandalNameMarathi: 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
          mandalAddress: 'इंदिरा नगर, सोलापूर',
          openingBalance: 0,
          targetCollection: 100000,
          joinCode: 'VXEVQE',
          isActive: true,
        });
      }
    }
    res.json(active);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new festival (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, year, openingBalance, targetCollection, joinCode } = req.body;
    // Set all others inactive if this is active
    await Festival.updateMany({}, { isActive: false });
    const festival = await Festival.create({
      name: name || `नवरात्र उत्सव ${year || 2026}`,
      year: year || 2026,
      openingBalance: Number(openingBalance) || 0,
      targetCollection: Number(targetCollection) || 100000,
      joinCode: joinCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
      isActive: true,
    });
    res.status(201).json(festival);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update festival (e.g. opening balance or name - Treasurer or Admin)
router.put('/:id', protect, treasurerOrAdmin, async (req, res) => {
  try {
    const festival = await Festival.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!festival) return res.status(404).json({ message: 'Festival not found' });
    res.json(festival);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Set active festival (Admin only)
router.put('/:id/set-active', protect, adminOnly, async (req, res) => {
  try {
    await Festival.updateMany({}, { isActive: false });
    const festival = await Festival.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    res.json(festival);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
