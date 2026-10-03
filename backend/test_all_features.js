// Full Backend Audit and Comprehensive Test Script
import { strict as assert } from 'node:assert';

const BASE = 'http://localhost:5000/api';

async function testBackend() {
  console.log('🚀 Starting Comprehensive Backend Feature & API Audit...\n');

  // 1. Health check
  console.log('1. Health Check Endpoint');
  const healthRes = await fetch(`${BASE}/health`);
  assert.equal(healthRes.status, 200, 'Health check should return 200');
  const health = await healthRes.json();
  assert.equal(health.status, 'ok', 'Health status should be ok');
  console.log('  ✓ /api/health passed\n');

  // 2. Authentication & Admin Login
  console.log('2. Admin Authentication');
  const loginRes = await fetch(`${BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gururajkaki2205@gmail.com', password: 'admin' }),
  });
  assert.equal(loginRes.status, 200, 'Login should succeed');
  const authData = await loginRes.json();
  assert.ok(authData.token, 'Should return JWT token');
  assert.equal(authData.role, 'Admin');
  console.log('  ✓ Admin login successful with valid JWT token');

  // Wrong password check
  const badLogin = await fetch(`${BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gururajkaki2205@gmail.com', password: 'wrongpassword' }),
  });
  assert.equal(badLogin.status, 401, 'Bad password should return 401');
  console.log('  ✓ Invalid password rejected with 401\n');

  // 3. User & Karyakarta Management
  console.log('3. Karyakarta & User Profile Management');
  const karyakartaListRes = await fetch(`${BASE}/users/karyakartas`);
  assert.equal(karyakartaListRes.status, 200);
  const karyakartas = await karyakartaListRes.json();
  assert.ok(Array.isArray(karyakartas), 'Should return array of karyakartas');
  console.log(`  ✓ Retrieved ${karyakartas.length} karyakartas`);

  const meRes = await fetch(`${BASE}/users/me`, {
    headers: { Authorization: `Bearer ${authData.token}` },
  });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  assert.equal(me.email, 'gururajkaki2205@gmail.com');
  console.log('  ✓ GET /api/users/me verified\n');

  // 4. Festival Management
  console.log('4. Festival Management');
  const activeFestRes = await fetch(`${BASE}/festivals/active`);
  assert.equal(activeFestRes.status, 200);
  const activeFest = await activeFestRes.json();
  assert.ok(activeFest._id, 'Active festival must have ID');
  console.log(`  ✓ Active Festival: "${activeFest.name}" (Year: ${activeFest.year})`);

  let testDonor;
  try {
    // 5. Donor Creation & Validation
    console.log('\n5. Donor Management');
    const testDonorRes = await fetch(`${BASE}/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      festivalId: activeFest._id,
      name: 'ऑडिट टेस्ट देणगीदार (Audit Test Donor)',
      businessName: 'सोलापूर स्टील',
      mobile: '9988776655',
      address: 'इंदिरा नगर, सोलापूर',
      area: 'सोलापूर',
      promisedAmount: 3000,
      bookNo: 'Book-99',
      physicalReceiptNo: 'PR-999',
      notes: 'Backend automated test',
    }),
  });
  assert.equal(testDonorRes.status, 201);
  testDonor = await testDonorRes.json();
  assert.equal(testDonor.promisedAmount, 3000);
  assert.equal(testDonor.status, 'pending');
  assert.equal(testDonor.remaining, 3000);
  console.log('  ✓ Donor successfully created with initial pending status');

  // Search donor
  const searchRes = await fetch(`${BASE}/donors?q=सोलापूर स्टील`);
  const searchResults = await searchRes.json();
  assert.ok(searchResults.some((d) => d._id === testDonor._id));
  console.log('  ✓ Donor search by businessName verified');

  // 6. Multi-installment Payments, Sequential Receipt Numbers, and Marathi Words
  console.log('\n6. Payment & Sequential Receipt Generation');
  // Installment 1: ₹1,000
  const pay1Res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      festivalId: activeFest._id,
      donorId: testDonor._id,
      amount: 1000,
      paymentMethod: 'UPI',
      transactionRef: 'UPI1234567890',
      collectedBy: 'Gururaj',
    }),
  });
  assert.equal(pay1Res.status, 201);
  const pay1 = await pay1Res.json();
  assert.equal(pay1.amount, 1000);
  assert.equal(pay1.installmentNumber, 1);
  assert.equal(pay1.remainingBalance, 2000);
  assert.equal(pay1.isFullyPaid, false);
  assert.equal(pay1.amountInMarathiWords, 'एक हजार रुपये फक्त');
  console.log(`  ✓ Installment 1 recorded: ₹1,000 | Marathi: "${pay1.amountInMarathiWords}" | Remaining: ₹${pay1.remainingBalance}`);

  // Installment 2: ₹2,000 -> Marks fully paid
  const pay2Res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      festivalId: activeFest._id,
      donorId: testDonor._id,
      amount: 2000,
      paymentMethod: 'Cash',
      collectedBy: 'Gururaj',
    }),
  });
  assert.equal(pay2Res.status, 201);
  const pay2 = await pay2Res.json();
  assert.equal(pay2.amount, 2000);
  assert.equal(pay2.installmentNumber, 2);
  assert.equal(pay2.remainingBalance, 0);
  assert.equal(pay2.isFullyPaid, true);
  assert.equal(pay2.amountInMarathiWords, 'दोन हजार रुपये फक्त');
  console.log(`  ✓ Installment 2 recorded: ₹2,000 | Marathi: "${pay2.amountInMarathiWords}" | Remaining: ₹${pay2.remainingBalance} | Fully Paid: true`);

  // Overpayment check
  const overpayRes = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      festivalId: activeFest._id,
      donorId: testDonor._id,
      amount: 500,
      paymentMethod: 'Cash',
    }),
  });
  assert.equal(overpayRes.status, 400, 'Overpayment without allowOverpayment flag must be blocked');
  console.log('  ✓ Server-side overpayment protection verified (rejected with 400)');

  // 7. Receipts Collection & Public QR Verification
  console.log('\n7. Receipt Retrieval & Public QR Verification');
  const receiptsRes = await fetch(`${BASE}/receipts?donorId=${testDonor._id}`);
  assert.equal(receiptsRes.status, 200);
  const donorReceipts = await receiptsRes.json();
  assert.equal(donorReceipts.length, 2);
  console.log(`  ✓ Found ${donorReceipts.length} receipts for donor in Receipts collection`);

  const verifyRes = await fetch(`${BASE}/receipts/verify/${pay2.receiptNo}`);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.verified, true);
  assert.equal(verifyData.receiptNo, pay2.receiptNo);
  assert.equal(verifyData.isFullyPaid, true);
  console.log(`  ✓ QR verification endpoint verified for receipt #${pay2.receiptNo}`);

  // 8. Expense Management with Audit History
  console.log('\n8. Expense Management & Audit Trail');
  const expenseRes = await fetch(`${BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      festivalId: activeFest._id,
      title: 'ऑडिट टेस्ट पूजा साहित्य',
      category: 'Pooja materials',
      amount: 450,
      paymentMethod: 'Cash',
      paidTo: 'शर्मा पूजा भांडार',
      description: 'हार, फुले व नारळ',
    }),
  });
  assert.equal(expenseRes.status, 201);
  const expense = await expenseRes.json();
  assert.equal(expense.amount, 450);
  console.log(`  ✓ Expense created: ₹${expense.amount} (${expense.title})`);

  // Edit expense with audit history tracking
  const editExpenseRes = await fetch(`${BASE}/expenses/${expense._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 500,
      changeReason: 'बिल तपासणीनंतर ५० रुपये वाढवले (Bill revision)',
      modifiedBy: 'Gururaj (Admin)',
    }),
  });
  assert.equal(editExpenseRes.status, 200);
  const editedExpense = await editExpenseRes.json();
  assert.equal(editedExpense.amount, 500);
  assert.equal(editedExpense.editHistory.length, 1);
  assert.equal(editedExpense.editHistory[0].previousAmount, 450);
  console.log(`  ✓ Expense edit recorded with audit trail (previous: ₹450 -> new: ₹500)`);

  // 9. Dashboard Statistics
  console.log('\n9. Real-Time Dashboard Statistics');
  const dashRes = await fetch(`${BASE}/dashboard/stats?festivalId=${activeFest._id}`);
  assert.equal(dashRes.status, 200);
  const dash = await dashRes.json();
  assert.ok(dash.totalCollection > 0, 'Total collection must be positive');
  assert.ok(dash.totalExpenses > 0, 'Total expenses must be positive');
  assert.ok(dash.availableBalance !== undefined, 'Available balance must exist');
  assert.ok(dash.categoryBreakdown.length > 0, 'Category breakdown must exist');
  console.log(`  ✓ Dashboard: Collection: ₹${dash.totalCollection} | Expenses: ₹${dash.totalExpenses} | Available Balance: ₹${dash.availableBalance}`);

  // 10. Financial Reports & Database Backup
  console.log('\n10. Reports & Database Backup');
  const summaryRes = await fetch(`${BASE}/reports/financial-summary?festivalId=${activeFest._id}`);
  assert.equal(summaryRes.status, 200);
  const summary = await summaryRes.json();
  assert.equal(summary.totalVargani, dash.totalCollection);
  console.log(`  ✓ Financial Summary report matches dashboard totals`);

  const backupRes = await fetch(`${BASE}/reports/backup?festivalId=${activeFest._id}`);
  assert.equal(backupRes.status, 200);
  const backup = await backupRes.json();
  assert.ok(backup.donors.length > 0);
  assert.ok(backup.payments.length > 0);
  assert.ok(backup.receipts.length > 0);
  assert.ok(backup.expenses.length > 0);
  console.log(`  ✓ Complete JSON Database Backup generated with all collections`);

  // 11. Traceable Reversal & Safe Delete Cleanup
  console.log('\n11. Traceable Reversal & Deletion Constraints');
  // Attempting to delete donor with payments must fail
  const deleteFailRes = await fetch(`${BASE}/donors/${testDonor._id}`, { method: 'DELETE' });
  assert.equal(deleteFailRes.status, 400, 'Cannot delete donor with existing payments');
  console.log('  ✓ Safe delete protection prevents deleting donor with payments');

  // Reverse payment 1
  const reverseRes = await fetch(`${BASE}/payments/${pay1._id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversalReason: 'चाचणी पेमेंट उलटवले (Test cleanup reversal)',
      reversedBy: 'Gururaj (Admin)',
    }),
  });
  assert.equal(reverseRes.status, 200);
  const reversed = await reverseRes.json();
  assert.equal(reversed.payment.isReversed, true);
  console.log('  ✓ Payment #1 safely reversed with audit log preserved');

  // Clean up test expense
  await fetch(`${BASE}/expenses/${expense._id}`, { method: 'DELETE' });
  console.log('  ✓ Test expense deleted');

  } finally {
    // Clean up test donor, payments and receipts
    try {
      if (testDonor?._id) {
        const mongoose = await import('mongoose');
        if (mongoose.default.connection.readyState === 0) {
          await mongoose.default.connect('mongodb://127.0.0.1:27017/jyoti_mandal_vargani');
        }
        const Donor = mongoose.default.model('Donor');
        const Payment = mongoose.default.model('Payment');
        const Receipt = mongoose.default.model('Receipt');
        await Payment.deleteMany({ donorId: testDonor._id });
        await Receipt.deleteMany({ donorId: testDonor._id });
        await Donor.findByIdAndDelete(testDonor._id);
        await mongoose.default.disconnect();
      }
    } catch (e) {}
  }
  console.log('\n🌟 ALL BACKEND MODULES AND VERIFICATIONS PASSED 100%! 🌟\n');
}

testBackend()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  });
