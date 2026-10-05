import express from 'express';
import mongoose from 'mongoose';
import { Festival } from '../models/Festival.js';
import { Donor } from '../models/Donor.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';

const router = express.Router();

// GET /api/dashboard/stats?festivalId=...
router.get('/stats', async (req, res) => {
  try {
    let { festivalId } = req.query;

    let festival;
    if (festivalId) {
      festival = await Festival.findById(festivalId);
    }
    if (!festival) {
      festival = await Festival.findOne({ isActive: true }) || await Festival.findOne().sort({ year: -1 });
    }

    if (!festival) {
      festival = await Festival.create({
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

    const festId = festival._id;

    // 1. Total Collection (non-reversed payments)
    const validPayments = await Payment.find({
      festivalId: festId,
      isReversed: { $ne: true },
    }).populate('donorId').sort({ createdAt: -1 });

    const totalCollection = validPayments.reduce((acc, p) => acc + p.amount, 0);

    // 2. Total Expenses
    const expenses = await Expense.find({ festivalId: festId });
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    // 3. Balance Calculations
    const openingBalance = festival.openingBalance || 0;
    const availableBalance = openingBalance + totalCollection - totalExpenses;
    const percentSpent = totalCollection > 0
      ? Math.min(100, Math.round((totalExpenses / totalCollection) * 100))
      : (totalExpenses > 0 ? 100 : 0);

    // 4. Today's collection
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayPayments = validPayments.filter((p) => {
      const pDate = new Date(p.paymentDate);
      return pDate >= startOfToday && pDate <= endOfToday;
    });
    const todayCollection = todayPayments.reduce((acc, p) => acc + p.amount, 0);
    const todayReceiptsCount = todayPayments.length;

    // 5. Donor status aggregations
    const donors = await Donor.find({ festivalId: festId });
    const totalDonors = donors.length;

    // Map payments by donor
    const paymentsByDonor = {};
    validPayments.forEach((p) => {
      if (p.donorId) {
        const dId = (p.donorId._id || p.donorId).toString();
        paymentsByDonor[dId] = (paymentsByDonor[dId] || 0) + p.amount;
      }
    });

    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let pendingCount = 0;
    let totalPromised = 0;
    let totalPendingAmount = 0;
    const pendingDonorsList = [];

    donors.forEach((donor) => {
      const paid = paymentsByDonor[donor._id.toString()] || 0;
      const promised = (donor.promisedAmount && donor.promisedAmount > 0) ? donor.promisedAmount : paid;
      totalPromised += promised;
      const remaining = Math.max(0, promised - paid);

      if (promised > 0) {
        if (paid >= promised) {
          fullyPaidCount++;
        } else if (paid > 0) {
          partiallyPaidCount++;
          totalPendingAmount += remaining;
          pendingDonorsList.push({
            donorId: donor._id,
            name: donor.name,
            businessName: donor.businessName,
            mobile: donor.mobile,
            bookNo: donor.bookNo || 'Book-1',
            promised,
            paid,
            remaining,
            status: 'partially_paid',
          });
        } else {
          pendingCount++;
          totalPendingAmount += remaining;
          pendingDonorsList.push({
            donorId: donor._id,
            name: donor.name,
            businessName: donor.businessName,
            mobile: donor.mobile,
            bookNo: donor.bookNo || 'Book-1',
            promised,
            paid: 0,
            remaining,
            status: 'pending',
          });
        }
      } else {
        if (paid > 0) {
          fullyPaidCount++;
        } else {
          pendingCount++;
        }
      }
    });

    // Sort pending donors by remaining amount descending
    pendingDonorsList.sort((a, b) => b.remaining - a.remaining);

    // 6. Recent receipts (last 5)
    const recentReceipts = validPayments.slice(0, 5).map((p) => ({
      _id: p._id,
      receiptNo: p.receiptNo,
      receiptCode: p.receiptCode || `No. ${p.receiptNo}`,
      donorName: p.donorId?.name || 'Anonymous',
      businessName: p.donorId?.businessName || '',
      mobile: p.donorId?.mobile || '',
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      installmentNumber: p.installmentNumber,
      collectedBy: p.collectedBy || 'Gururaj',
    }));

    // 7. Expense breakdown by category
    const expenseCategories = [
      'Decoration',
      'Lighting',
      'Sound system',
      'Food',
      'Pooja materials',
      'Transportation',
      'Other',
    ];
    const categoryBreakdown = expenseCategories.map((cat) => {
      const catExpenses = expenses.filter((e) => e.category === cat);
      const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      return { category: cat, total: catTotal, count: catExpenses.length };
    });

    res.json({
      festival,
      totalCollection,
      totalExpenses,
      openingBalance,
      availableBalance,
      percentSpent,
      todayCollection,
      todayReceiptsCount,
      totalDonors,
      fullyPaidDonors: fullyPaidCount,
      partiallyPaidDonors: partiallyPaidCount,
      pendingDonors: pendingCount,
      totalPromised,
      pendingVargani: totalPendingAmount,
      whoOwesList: pendingDonorsList,
      recentReceipts,
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
