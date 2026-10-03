import express from 'express';
import mongoose from 'mongoose';
import { Receipt } from '../models/Receipt.js';
import { Payment } from '../models/Payment.js';
import { Donor } from '../models/Donor.js';
import { Festival } from '../models/Festival.js';

const router = express.Router();

// GET /api/receipts
router.get('/', async (req, res) => {
  try {
    const { festivalId, donorId, q, method, todayOnly } = req.query;
    const filter = {};

    if (festivalId) {
      filter.festivalId = new mongoose.Types.ObjectId(festivalId);
    }
    if (donorId) {
      filter.donorId = new mongoose.Types.ObjectId(donorId);
    }
    if (method && method !== 'All') {
      filter.paymentMethod = method;
    }

    if (todayOnly === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filter.paymentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    let receipts = await Receipt.find(filter)
      .populate('donorId')
      .populate('festivalId')
      .populate('paymentId')
      .sort({ receiptNo: -1, createdAt: -1 })
      .lean();

    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      receipts = receipts.filter((r) => {
        const receiptMatch = String(r.receiptNo).includes(term) || (r.receiptCode && r.receiptCode.toLowerCase().includes(term));
        const donorMatch = r.donorId?.name && r.donorId.name.toLowerCase().includes(term);
        const mobileMatch = r.donorId?.mobile && r.donorId.mobile.includes(term);
        const businessMatch = r.donorId?.businessName && r.donorId.businessName.toLowerCase().includes(term);
        return receiptMatch || donorMatch || mobileMatch || businessMatch;
      });
    }

    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/receipts/:id
router.get('/:id', async (req, res) => {
  try {
    let receipt;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      receipt = await Receipt.findById(req.params.id)
        .populate('donorId')
        .populate('festivalId')
        .populate('paymentId');
    }

    if (!receipt) {
      // Try search by receipt number
      const num = Number(req.params.id);
      if (!isNaN(num)) {
        receipt = await Receipt.findOne({ receiptNo: num })
          .populate('donorId')
          .populate('festivalId')
          .populate('paymentId');
      }
    }

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/receipts/verify/:code (Public verification for QR scanner)
router.get('/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const orConditions = [{ verificationCode: code }, { receiptCode: code }];
    const num = Number(code);
    if (!isNaN(num)) {
      orConditions.push({ receiptNo: num });
    }

    const receipt = await Receipt.findOne({ $or: orConditions })
      .populate('donorId')
      .populate('festivalId');

    if (!receipt) {
      return res.status(404).json({
        verified: false,
        message: 'अवैध पावती कोड (Invalid or Fake Receipt Code)',
      });
    }

    res.json({
      verified: true,
      receiptNo: receipt.receiptNo,
      receiptCode: receipt.receiptCode,
      mandalName: receipt.festivalId?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
      mandalAddress: receipt.festivalId?.mandalAddress || 'इंदिरा नगर, सोलापूर',
      festivalName: receipt.festivalId?.name || 'नवरात्र उत्सव २०२६',
      donorName: receipt.donorId?.name,
      businessName: receipt.donorId?.businessName,
      amount: receipt.amount,
      amountInMarathiWords: receipt.amountInMarathiWords,
      installmentNumber: receipt.installmentNumber,
      paymentMethod: receipt.paymentMethod,
      paymentDate: receipt.paymentDate,
      remainingBalance: receipt.remainingBalance,
      isFullyPaid: receipt.isFullyPaid,
      isReversed: receipt.isReversed,
      status: receipt.isReversed ? 'रद्द (Reversed)' : (receipt.isFullyPaid ? 'पूर्ण भरणा (Fully Paid)' : 'अपूर्ण (Partially Paid)'),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
