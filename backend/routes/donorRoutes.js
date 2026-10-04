import express from 'express';
import mongoose from 'mongoose';
import { Donor } from '../models/Donor.js';
import { Payment } from '../models/Payment.js';
import { Receipt } from '../models/Receipt.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Helper to calculate donor totals
export const getDonorStats = async (donorId) => {
  const payments = await Payment.find({
    donorId,
    isReversed: { $ne: true },
  }).sort({ paymentDate: 1, installmentNumber: 1 });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return { payments, totalPaid };
};

// GET /api/donors?festivalId=...&q=...&status=...&bookNo=...
router.get('/', async (req, res) => {
  try {
    const { festivalId, q, status, bookNo } = req.query;

    const filter = {};
    if (festivalId) {
      filter.festivalId = new mongoose.Types.ObjectId(festivalId);
    }

    if (bookNo && bookNo !== 'all') {
      filter.bookNo = bookNo;
    }

    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { mobile: searchRegex },
        { area: searchRegex },
        { bookNo: searchRegex },
      ];
    }

    const donors = await Donor.find(filter).sort({ createdAt: -1 }).lean();

    // Get all valid payments for these donors
    const donorIds = donors.map((d) => d._id);
    const payments = await Payment.find({
      donorId: { $in: donorIds },
      isReversed: { $ne: true },
    }).lean();

    // Group payments by donorId
    const paymentsByDonor = {};
    payments.forEach((p) => {
      const id = p.donorId.toString();
      if (!paymentsByDonor[id]) paymentsByDonor[id] = [];
      paymentsByDonor[id].push(p);
    });

    // Compute status and totals
    const donorsWithCalculations = donors.map((donor) => {
      const donorPayments = paymentsByDonor[donor._id.toString()] || [];
      const totalPaid = donorPayments.reduce((sum, p) => sum + p.amount, 0);
      const promised = donor.promisedAmount || 0;
      const remaining = Math.max(0, promised - totalPaid);

      let calcStatus = 'pending';
      if (promised > 0) {
        if (totalPaid >= promised) {
          calcStatus = 'fully_paid';
        } else if (totalPaid > 0) {
          calcStatus = 'partially_paid';
        } else {
          calcStatus = 'pending';
        }
      } else {
        calcStatus = totalPaid > 0 ? 'fully_paid' : 'pending';
      }

      return {
        ...donor,
        totalPaid,
        remaining,
        status: calcStatus,
        installmentCount: donorPayments.length,
        payments: donorPayments,
      };
    });

    // Filter by status if specified
    let filtered = donorsWithCalculations;
    if (status && status !== 'all') {
      if (status === 'pending_all' || status === 'has_remaining') {
        filtered = donorsWithCalculations.filter((d) => d.remaining > 0);
      } else {
        filtered = donorsWithCalculations.filter((d) => d.status === status);
      }
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/donors/book-stats?festivalId=... (Aggregated Category / Totals by Book Number)
router.get('/book-stats', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const filter = {};
    if (festivalId) {
      filter.festivalId = new mongoose.Types.ObjectId(festivalId);
    }

    const donors = await Donor.find(filter).lean();
    const donorIds = donors.map((d) => d._id);
    const payments = await Payment.find({
      donorId: { $in: donorIds },
      isReversed: { $ne: true },
    }).lean();

    const paymentsByDonor = {};
    payments.forEach((p) => {
      const id = p.donorId.toString();
      paymentsByDonor[id] = (paymentsByDonor[id] || 0) + p.amount;
    });

    const bookMap = {};
    let grandPromised = 0;
    let grandCollected = 0;
    let grandRemaining = 0;

    donors.forEach((donor) => {
      const rawBook = donor.bookNo ? donor.bookNo.trim() : '';
      const bKey = rawBook || 'Book-1';

      if (!bookMap[bKey]) {
        bookMap[bKey] = {
          bookNo: bKey,
          label: bKey.startsWith('Book') ? bKey : `वही क्र. ${bKey}`,
          donorCount: 0,
          totalPromised: 0,
          totalCollected: 0,
          totalRemaining: 0,
          fullyPaidCount: 0,
          partiallyPaidCount: 0,
          pendingCount: 0,
        };
      }

      const promised = donor.promisedAmount || 0;
      const paid = paymentsByDonor[donor._id.toString()] || 0;
      const remaining = Math.max(0, promised - paid);

      bookMap[bKey].donorCount += 1;
      bookMap[bKey].totalPromised += promised;
      bookMap[bKey].totalCollected += paid;
      bookMap[bKey].totalRemaining += remaining;

      grandPromised += promised;
      grandCollected += paid;
      grandRemaining += remaining;

      if (promised > 0) {
        if (paid >= promised) bookMap[bKey].fullyPaidCount++;
        else if (paid > 0) bookMap[bKey].partiallyPaidCount++;
        else bookMap[bKey].pendingCount++;
      } else {
        if (paid > 0) bookMap[bKey].fullyPaidCount++;
        else bookMap[bKey].pendingCount++;
      }
    });

    const books = Object.values(bookMap).sort((a, b) =>
      a.bookNo.localeCompare(b.bookNo, undefined, { numeric: true })
    );

    res.json({
      books,
      overall: {
        totalDonors: donors.length,
        totalPromised: grandPromised,
        totalCollected: grandCollected,
        totalRemaining: grandRemaining,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/donors/:id
router.get('/:id', async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id).lean();
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const payments = await Payment.find({ donorId: donor._id }).sort({
      createdAt: -1,
    });
    const validPayments = payments.filter((p) => !p.isReversed);
    const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
    const promised = donor.promisedAmount || 0;
    const remaining = Math.max(0, promised - totalPaid);

    let calcStatus = 'pending';
    if (promised > 0) {
      if (totalPaid >= promised) {
        calcStatus = 'fully_paid';
      } else if (totalPaid > 0) {
        calcStatus = 'partially_paid';
      } else {
        calcStatus = 'pending';
      }
    } else {
      calcStatus = totalPaid > 0 ? 'fully_paid' : 'pending';
    }

    res.json({
      ...donor,
      totalPaid,
      remaining,
      status: calcStatus,
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/donors
router.post('/', protect, async (req, res) => {
  try {
    const {
      festivalId,
      name,
      businessName,
      mobile,
      address,
      area,
      promisedAmount,
      bookNo,
      physicalReceiptNo,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Donor name is required' });
    }

    const donor = await Donor.create({
      festivalId,
      name: name.trim(),
      businessName: (businessName || '').trim(),
      mobile: (mobile || '').trim(),
      address: (address || '').trim(),
      area: (area || '').trim(),
      promisedAmount: Number(promisedAmount) >= 0 ? Number(promisedAmount) : 0,
      bookNo: (bookNo || '').trim(),
      physicalReceiptNo: (physicalReceiptNo || '').trim(),
      notes: (notes || '').trim(),
    });

    res.status(201).json({
      ...donor.toObject(),
      totalPaid: 0,
      remaining: donor.promisedAmount || 0,
      status: 'pending',
      installmentCount: 0,
      payments: [],
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/donors/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const stats = await getDonorStats(donor._id);
    const promised = donor.promisedAmount || 0;
    const remaining = Math.max(0, promised - stats.totalPaid);

    res.json({
      ...donor.toObject(),
      totalPaid: stats.totalPaid,
      remaining,
      payments: stats.payments,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/donors/:id?cascade=true (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { cascade } = req.query;
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: 'देणगीदार सापडले नाहीत (Donor not found)' });

    // Check if donor has payments
    const paymentsCount = await Payment.countDocuments({ donorId: donor._id });
    if (paymentsCount > 0) {
      if (cascade === 'true') {
        await Payment.deleteMany({ donorId: donor._id });
        await Receipt.deleteMany({ donorId: donor._id });
      } else {
        return res.status(400).json({
          hasPayments: true,
          paymentsCount,
          message: `या देणगीदाराचे ${paymentsCount} पेमेंट/पावती रेकॉर्ड्स आहेत. हे रेकॉर्ड्ससह हटवायचे असल्यास पुष्टी करा.`,
        });
      }
    }

    await Donor.findByIdAndDelete(req.params.id);
    res.json({
      message: 'देणगीदार यशस्वीरीत्या हटवला गेला',
      deletedPaymentsCount: cascade === 'true' ? paymentsCount : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
