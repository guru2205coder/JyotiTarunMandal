import express from 'express';
import mongoose from 'mongoose';
import { Festival } from '../models/Festival.js';
import { Donor } from '../models/Donor.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { Receipt } from '../models/Receipt.js';

const router = express.Router();

const getFestival = async (festivalId) => {
  if (festivalId) {
    const f = await Festival.findById(festivalId);
    if (f) return f;
  }
  let active = await Festival.findOne({ isActive: true }) || await Festival.findOne().sort({ year: -1 });
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
  return active;
};

// GET /api/reports/financial-summary?festivalId=...&startDate=...&endDate=...&bookNo=...
router.get('/financial-summary', async (req, res) => {
  try {
    const { festivalId, startDate, endDate, bookNo } = req.query;
    const festival = await getFestival(festivalId);

    const paymentFilter = {
      festivalId: festival._id,
      isReversed: { $ne: true },
    };
    const expenseFilter = { festivalId: festival._id };

    if (bookNo && bookNo !== 'all') {
      paymentFilter.bookNo = bookNo;
    }

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      paymentFilter.paymentDate = { $gte: s, $lte: e };
      expenseFilter.date = { $gte: s, $lte: e };
    }

    const payments = await Payment.find(paymentFilter).populate('donorId');
    const expenses = await Expense.find(expenseFilter);

    const totalVargani = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const openingBalance = festival.openingBalance || 0;
    const currentBalance = openingBalance + totalVargani - totalExpenses;

    // Donor calculations for this book or all
    const donorFilter = { festivalId: festival._id };
    if (bookNo && bookNo !== 'all') {
      donorFilter.bookNo = bookNo;
    }
    const bookDonors = await Donor.find(donorFilter).lean();
    const totalPromised = bookDonors.reduce((acc, d) => acc + (d.promisedAmount || 0), 0);
    const totalRemaining = Math.max(0, totalPromised - totalVargani);

    res.json({
      festival,
      openingBalance,
      totalVargani,
      totalExpenses,
      currentBalance,
      receiptCount: payments.length,
      expenseCount: expenses.length,
      bookNo: bookNo || 'all',
      totalDonors: bookDonors.length,
      totalPromised,
      totalRemaining,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/book-wise-summary?festivalId=... (Combined and Book-by-Book Performance)
router.get('/book-wise-summary', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const donors = await Donor.find({ festivalId: festival._id }).lean();
    const payments = await Payment.find({
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).lean();

    const expenses = await Expense.find({ festivalId: festival._id });
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

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
      const bKey = donor.bookNo ? donor.bookNo.trim() : 'Book-1';
      if (!bookMap[bKey]) {
        bookMap[bKey] = {
          bookNo: bKey,
          label: bKey.startsWith('Book') ? bKey : `वही क्र. ${bKey}`,
          donorCount: 0,
          totalPromised: 0,
          totalCollected: 0,
          totalRemaining: 0,
          receiptCount: 0,
          fullyPaidCount: 0,
          partiallyPaidCount: 0,
          pendingCount: 0,
        };
      }

      const promised = donor.promisedAmount || 0;
      const paid = paymentsByDonor[donor._id.toString()] || 0;
      const remaining = Math.max(0, promised - paid);

      bookMap[bKey].donorCount++;
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

    // Count receipts per book
    payments.forEach((p) => {
      const bKey = p.bookNo ? p.bookNo.trim() : 'Book-1';
      if (bookMap[bKey]) {
        bookMap[bKey].receiptCount++;
      }
    });

    const books = Object.values(bookMap).map((b) => ({
      ...b,
      percentCollected: b.totalPromised > 0 ? Math.min(100, Math.round((b.totalCollected / b.totalPromised) * 100)) : 0,
    })).sort((a, b) => a.bookNo.localeCompare(b.bookNo, undefined, { numeric: true }));

    const percentCombined = grandPromised > 0 ? Math.min(100, Math.round((grandCollected / grandPromised) * 100)) : 0;
    const openingBalance = festival.openingBalance || 0;
    const netBalance = openingBalance + grandCollected - totalExpenses;

    res.json({
      books,
      combined: {
        totalBooks: books.length,
        totalDonors: donors.length,
        totalPromised: grandPromised,
        totalCollected: grandCollected,
        totalRemaining: grandRemaining,
        percentCollected: percentCombined,
        totalReceipts: payments.length,
        openingBalance,
        totalExpenses,
        netBalance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/daily?festivalId=...
router.get('/daily', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const payments = await Payment.find({
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).sort({ paymentDate: 1 });

    const dailyMap = {};
    payments.forEach((p) => {
      const dateKey = new Date(p.paymentDate).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, total: 0, count: 0 };
      }
      dailyMap[dateKey].total += p.amount;
      dailyMap[dateKey].count += 1;
    });

    const dailyList = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    res.json(dailyList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/donor-wise?festivalId=...&status=...&bookNo=...
router.get('/donor-wise', async (req, res) => {
  try {
    const { festivalId, status, bookNo } = req.query;
    const festival = await getFestival(festivalId);

    const donorFilter = { festivalId: festival._id };
    if (bookNo && bookNo !== 'all') {
      donorFilter.bookNo = bookNo;
    }

    const donors = await Donor.find(donorFilter).lean();
    const payments = await Payment.find({
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).lean();

    const paymentsByDonor = {};
    payments.forEach((p) => {
      const id = p.donorId.toString();
      if (!paymentsByDonor[id]) paymentsByDonor[id] = [];
      paymentsByDonor[id].push(p);
    });

    let donorLedger = donors.map((d) => {
      const dPayments = paymentsByDonor[d._id.toString()] || [];
      const totalPaid = dPayments.reduce((s, p) => s + p.amount, 0);
      const promised = d.promisedAmount || 0;
      const remaining = Math.max(0, promised - totalPaid);

      let calcStatus = 'pending';
      if (promised > 0) {
        if (totalPaid >= promised) calcStatus = 'fully_paid';
        else if (totalPaid > 0) calcStatus = 'partially_paid';
      } else {
        calcStatus = totalPaid > 0 ? 'fully_paid' : 'pending';
      }

      return {
        _id: d._id,
        name: d.name,
        businessName: d.businessName,
        mobile: d.mobile,
        area: d.area,
        bookNo: d.bookNo,
        physicalReceiptNo: d.physicalReceiptNo,
        promisedAmount: promised,
        totalPaid,
        remaining,
        status: calcStatus,
        installmentCount: dPayments.length,
        installments: dPayments.map((p) => ({
          receiptNo: p.receiptNo,
          amount: p.amount,
          date: p.paymentDate,
          method: p.paymentMethod,
        })),
      };
    });

    if (status && status !== 'all') {
      donorLedger = donorLedger.filter((d) => d.status === status);
    }

    res.json(donorLedger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/expenses-summary?festivalId=...
router.get('/expenses-summary', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const expenses = await Expense.find({ festivalId: festival._id }).sort({ date: -1 });

    const categoryMap = {};
    expenses.forEach((e) => {
      if (!categoryMap[e.category]) {
        categoryMap[e.category] = { category: e.category, total: 0, items: [] };
      }
      categoryMap[e.category].total += e.amount;
      categoryMap[e.category].items.push(e);
    });

    const categoryBreakdown = Object.values(categoryMap);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    res.json({
      totalExpenses,
      expenseCount: expenses.length,
      categoryBreakdown,
      expenses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/monthly?festivalId=...
router.get('/monthly', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const payments = await Payment.find({
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).sort({ paymentDate: 1 });

    const monthlyMap = {};
    payments.forEach((p) => {
      const monthKey = new Date(p.paymentDate).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, total: 0, count: 0 };
      }
      monthlyMap[monthKey].total += p.amount;
      monthlyMap[monthKey].count += 1;
    });

    const monthlyList = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));
    res.json(monthlyList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/pending-vargani?festivalId=...
router.get('/pending-vargani', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const donors = await Donor.find({ festivalId: festival._id }).lean();
    const payments = await Payment.find({
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).lean();

    const paymentsByDonor = {};
    payments.forEach((p) => {
      const id = p.donorId.toString();
      paymentsByDonor[id] = (paymentsByDonor[id] || 0) + p.amount;
    });

    const pendingList = [];
    let totalPendingAmount = 0;

    donors.forEach((d) => {
      const promised = d.promisedAmount || 0;
      const paid = paymentsByDonor[d._id.toString()] || 0;
      const remaining = Math.max(0, promised - paid);

      if (remaining > 0) {
        totalPendingAmount += remaining;
        pendingList.push({
          donorId: d._id,
          name: d.name,
          businessName: d.businessName,
          mobile: d.mobile,
          area: d.area,
          bookNo: d.bookNo,
          promisedAmount: promised,
          totalPaid: paid,
          remaining,
          status: paid > 0 ? 'partially_paid' : 'pending',
        });
      }
    });

    pendingList.sort((a, b) => b.remaining - a.remaining);

    res.json({
      totalPendingAmount,
      count: pendingList.length,
      donors: pendingList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/fully-paid?festivalId=...
router.get('/fully-paid', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const donors = await Donor.find({ festivalId: festival._id }).lean();
    const payments = await Payment.find({
      festivalId: festival._id,
      isReversed: { $ne: true },
    }).lean();

    const paymentsByDonor = {};
    payments.forEach((p) => {
      const id = p.donorId.toString();
      paymentsByDonor[id] = (paymentsByDonor[id] || 0) + p.amount;
    });

    const fullyPaidList = [];
    let totalCollectedFromFull = 0;

    donors.forEach((d) => {
      const promised = d.promisedAmount || 0;
      const paid = paymentsByDonor[d._id.toString()] || 0;
      const remaining = Math.max(0, promised - paid);

      if ((promised > 0 && paid >= promised) || (promised === 0 && paid > 0)) {
        totalCollectedFromFull += paid;
        fullyPaidList.push({
          donorId: d._id,
          name: d.name,
          businessName: d.businessName,
          mobile: d.mobile,
          area: d.area,
          promisedAmount: promised,
          totalPaid: paid,
          remaining: 0,
          status: 'fully_paid',
        });
      }
    });

    res.json({
      totalCollectedFromFull,
      count: fullyPaidList.length,
      donors: fullyPaidList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/backup?festivalId=... (Database Export Backup)
router.get('/backup', async (req, res) => {
  try {
    const { festivalId } = req.query;
    const festival = await getFestival(festivalId);

    const donors = await Donor.find({ festivalId: festival._id }).lean();
    const payments = await Payment.find({ festivalId: festival._id }).lean();
    const receipts = await Receipt.find({ festivalId: festival._id }).lean();
    const expenses = await Expense.find({ festivalId: festival._id }).lean();

    const totalCollection = payments
      .filter((p) => !p.isReversed)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      mandal: 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर',
      festival,
      summary: {
        openingBalance: festival.openingBalance || 0,
        totalCollection,
        totalExpenses,
        currentBalance: (festival.openingBalance || 0) + totalCollection - totalExpenses,
        donorsCount: donors.length,
        paymentsCount: payments.length,
        receiptsCount: receipts.length,
        expensesCount: expenses.length,
      },
      donors,
      payments,
      receipts,
      expenses,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Mandal_Backup_${festival.year || 2026}_${new Date().toISOString().split('T')[0]}.json"`
    );
    res.json(backupData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
