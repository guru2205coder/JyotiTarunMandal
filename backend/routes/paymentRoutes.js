import express from 'express';
import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Donor } from '../models/Donor.js';
import { Festival } from '../models/Festival.js';
import { Receipt } from '../models/Receipt.js';
import { numberToMarathiWords, numberToEnglishWords } from '../utils/marathiNumbers.js';
import { protect, treasurerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to format receipt response
const formatReceipt = (payment, donor, festival, prevPaid = null) => {
  const promised = donor?.promisedAmount || 0;
  const currentPaid = payment.amount;
  const previouslyPaid = prevPaid !== null ? prevPaid : 0;
  const totalPaidSoFar = previouslyPaid + currentPaid;
  const remaining = Math.max(0, promised - totalPaidSoFar);

  return {
    ...payment.toObject ? payment.toObject() : payment,
    donor: donor ? {
      _id: donor._id,
      name: donor.name,
      businessName: donor.businessName,
      mobile: donor.mobile,
      address: donor.address,
      area: donor.area,
      promisedAmount: promised,
    } : null,
    festival: festival ? {
      _id: festival._id,
      name: festival.name,
      year: festival.year,
      mandalNameMarathi: festival.mandalNameMarathi,
      mandalAddress: festival.mandalAddress,
      registrationNo: festival.registrationNo,
    } : null,
    previouslyPaid,
    totalPaidSoFar,
    remainingBalance: remaining,
    amountInMarathiWords: numberToMarathiWords(payment.amount),
    amountInEnglishWords: numberToEnglishWords(payment.amount),
    isFullyPaid: promised > 0 ? totalPaidSoFar >= promised : true,
  };
};

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { festivalId, donorId, q, method, date, todayOnly } = req.query;
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

    if (todayOnly === 'true' || date === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filter.paymentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    let payments = await Payment.find(filter)
      .populate('donorId')
      .populate('festivalId')
      .sort({ receiptNo: -1, createdAt: -1 })
      .lean();

    // Text search if query provided
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      payments = payments.filter((p) => {
        const receiptMatch = String(p.receiptNo).includes(term) || (p.receiptCode && p.receiptCode.toLowerCase().includes(term));
        const donorNameMatch = p.donorId?.name && p.donorId.name.toLowerCase().includes(term);
        const mobileMatch = p.donorId?.mobile && p.donorId.mobile.includes(term);
        const businessMatch = p.donorId?.businessName && p.donorId.businessName.toLowerCase().includes(term);
        return receiptMatch || donorNameMatch || mobileMatch || businessMatch;
      });
    }

    // Attach Marathi words & details
    const enriched = payments.map((p) => {
      const promised = p.donorId?.promisedAmount || 0;
      return {
        ...p,
        donor: p.donorId,
        festival: p.festivalId,
        amountInMarathiWords: numberToMarathiWords(p.amount),
        amountInEnglishWords: numberToEnglishWords(p.amount),
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/payments/:id (Full receipt detail)
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('donorId')
      .populate('festivalId');

    if (!payment) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Find all valid payments for this donor up to this payment
    const priorPayments = await Payment.find({
      donorId: payment.donorId._id,
      festivalId: payment.festivalId._id,
      isReversed: { $ne: true },
      createdAt: { $lt: payment.createdAt },
    });

    const previouslyPaid = priorPayments.reduce((s, p) => s + p.amount, 0);

    const formatted = formatReceipt(
      payment,
      payment.donorId,
      payment.festivalId,
      previouslyPaid
    );

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments (Record new installment)
router.post('/', protect, async (req, res) => {
  try {
    const {
      festivalId,
      donorId,
      amount,
      paymentDate,
      paymentMethod,
      transactionRef,
      bookNo,
      physicalReceiptNo,
      collectedBy,
      notes,
      allowOverpayment,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    const festival = await Festival.findById(festivalId || donor.festivalId);
    if (!festival) {
      return res.status(404).json({ message: 'Festival not found' });
    }

    // Get all previous valid payments for this donor
    const existingPayments = await Payment.find({
      donorId: donor._id,
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).sort({ createdAt: 1 });

    const totalPreviouslyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const promised = donor.promisedAmount || 0;
    const remainingBefore = Math.max(0, promised - totalPreviouslyPaid);

    // Overpayment validation
    if (promised > 0 && totalPreviouslyPaid + numAmount > promised && !allowOverpayment) {
      return res.status(400).json({
        message: `Payment exceeds promised Vargani amount. Remaining promise is ₹${remainingBefore}. Please confirm overpayment if intentional.`,
        overpaymentWarning: true,
        remainingPromise: remainingBefore,
      });
    }

    // Determine next unique receipt number for this festival
    const highestReceiptPayment = await Payment.findOne({ festivalId: festival._id }).sort({ receiptNo: -1 });
    const nextReceiptNo = (highestReceiptPayment?.receiptNo || 0) + 1;
    const nextInstallmentNumber = existingPayments.length + 1;

    const payment = await Payment.create({
      festivalId: festival._id,
      donorId: donor._id,
      receiptNo: nextReceiptNo,
      receiptCode: `No. ${nextReceiptNo}`,
      installmentNumber: nextInstallmentNumber,
      amount: numAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'Cash',
      transactionRef: transactionRef || '',
      bookNo: bookNo || donor.bookNo || '',
      physicalReceiptNo: physicalReceiptNo || donor.physicalReceiptNo || '',
      collectedBy: collectedBy || 'Gururaj',
      notes: notes || '',
    });

    const receiptResult = formatReceipt(
      payment,
      donor,
      festival,
      totalPreviouslyPaid
    );

    // Save corresponding official Receipt in Receipts collection
    const verificationCode = `PAV-${festival.year || 2026}-${nextReceiptNo}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    await Receipt.create({
      festivalId: festival._id,
      donorId: donor._id,
      paymentId: payment._id,
      receiptNo: nextReceiptNo,
      receiptCode: `No. ${nextReceiptNo}`,
      installmentNumber: nextInstallmentNumber,
      amount: numAmount,
      amountInMarathiWords: receiptResult.amountInMarathiWords,
      amountInEnglishWords: receiptResult.amountInEnglishWords,
      promisedAmount: promised,
      previouslyPaid: totalPreviouslyPaid,
      totalPaidSoFar: receiptResult.totalPaidSoFar,
      remainingBalance: receiptResult.remainingBalance,
      isFullyPaid: receiptResult.isFullyPaid,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef,
      bookNo: payment.bookNo,
      physicalReceiptNo: payment.physicalReceiptNo,
      collectedBy: payment.collectedBy,
      verificationCode,
    });

    res.status(201).json({
      ...receiptResult,
      verificationCode,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(400).json({ message: error.message });
  }
});

// POST /api/payments/:id/reverse (Authorized Reversal / Adjustment - Treasurer or Admin only)
router.post('/:id/reverse', protect, treasurerOrAdmin, async (req, res) => {
  try {
    const { reversalReason, reversedBy } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.isReversed) {
      return res.status(400).json({ message: 'This payment has already been reversed.' });
    }

    payment.isReversed = true;
    payment.reversalReason = reversalReason || 'Administrative correction';
    payment.reversedAt = new Date();
    payment.reversedBy = reversedBy || req.user?.name || 'Admin';

    await payment.save();

    // Also update receipt
    await Receipt.findOneAndUpdate(
      { paymentId: payment._id },
      {
        isReversed: true,
        reversalReason: payment.reversalReason,
      }
    );

    res.json({
      message: 'Payment reversed successfully with audit trail preserved.',
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
