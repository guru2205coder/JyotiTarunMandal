import express from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { protect, treasurerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/expenses?festivalId=...&category=...
router.get('/', async (req, res) => {
  try {
    const { festivalId, category, q } = req.query;
    const filter = {};

    if (festivalId) {
      filter.festivalId = new mongoose.Types.ObjectId(festivalId);
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { paidTo: regex }];
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      expenses,
      totalAmount,
      count: expenses.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/expenses (Treasurer or Admin only)
router.post('/', protect, treasurerOrAdmin, async (req, res) => {
  try {
    const {
      festivalId,
      title,
      category,
      amount,
      date,
      paymentMethod,
      paidTo,
      description,
      billUrl,
      recordedBy,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Expense title is required' });
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid expense amount is required' });
    }

    const expense = await Expense.create({
      festivalId,
      title: title.trim(),
      category: category || 'Other',
      amount: numAmount,
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'Cash',
      paidTo: (paidTo || '').trim(),
      description: (description || '').trim(),
      billUrl: billUrl || '',
      recordedBy: recordedBy || req.user?.name || 'Treasurer',
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/expenses/:id (Edit expense with history - Treasurer or Admin)
router.put('/:id', protect, treasurerOrAdmin, async (req, res) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense not found' });

    const historyEntry = {
      modifiedAt: new Date(),
      modifiedBy: req.body.modifiedBy || req.user?.name || 'Treasurer',
      previousTitle: existing.title,
      previousCategory: existing.category,
      previousAmount: existing.amount,
      previousPaidTo: existing.paidTo,
      changeReason: req.body.changeReason || 'Administrative update',
    };

    const updateData = { ...req.body };
    delete updateData.editHistory;

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
        $push: { editHistory: historyEntry },
      },
      { new: true, runValidators: true }
    );

    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/expenses/:id (Treasurer or Admin only)
router.delete('/:id', protect, treasurerOrAdmin, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
