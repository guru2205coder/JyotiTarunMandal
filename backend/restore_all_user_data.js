import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Donor } from './models/Donor.js';
import { Payment } from './models/Payment.js';
import { Receipt } from './models/Receipt.js';
import { Expense } from './models/Expense.js';
import { Festival } from './models/Festival.js';
import { User } from './models/User.js';
import { numberToMarathiWords, numberToEnglishWords } from './utils/marathiNumbers.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jyoti_mandal_vargani';

const donorDataRaw = [
  { sr: 1, name: "आनंद ट्रेडर्स", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 3100, paid: 100, remaining: 3000, status: "partially_paid", count: 1 },
  { sr: 2, name: "बालाजी  हॉट चिप", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 2100, paid: 0, remaining: 2100, status: "pending", count: 0 },
  { sr: 3, name: "ए के फूटवेअर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 501, paid: 0, remaining: 501, status: "pending", count: 0 },
  { sr: 4, name: "मोरया इलेक्ट्रिकल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1100, paid: 0, remaining: 1100, status: "pending", count: 0 },
  { sr: 5, name: "मोहक जनरल स्टोर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1500, paid: 0, remaining: 1500, status: "pending", count: 0 },
  { sr: 6, name: "सूप्रीम Mens Palour", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1500, paid: 0, remaining: 1500, status: "pending", count: 0 },
  { sr: 7, name: "इकबाल ट्रेडर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1500, paid: 0, remaining: 1500, status: "pending", count: 0 },
  { sr: 8, name: "चविवले", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1100, paid: 0, remaining: 1100, status: "pending", count: 0 },
  { sr: 9, name: "आसरा मटण शॉप", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 3100, paid: 0, remaining: 3100, status: "pending", count: 0 },
  { sr: 10, name: "इंदौर जिलेबी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 701, paid: 0, remaining: 701, status: "pending", count: 0 },
  { sr: 11, name: "M P Mobiles", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 801, paid: 0, remaining: 801, status: "pending", count: 0 },
  { sr: 12, name: "कृष्ण मेडिकल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 301, paid: 0, remaining: 301, status: "pending", count: 0 },
  { sr: 13, name: "आतणुरे ट्रेडर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1111, paid: 0, remaining: 1111, status: "pending", count: 0 },
  { sr: 14, name: "सुभाम ट्रेडर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 3500, paid: 0, remaining: 3500, status: "pending", count: 0 },
  { sr: 15, name: "दुर्गा  ट्रेडर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 601, paid: 601, remaining: 0, status: "fully_paid", count: 1 },
  { sr: 16, name: "बुवाजी मेडिकल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 2500, paid: 0, remaining: 2500, status: "pending", count: 0 },
  { sr: 17, name: "लोकेश ट्रेडर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 3100, paid: 0, remaining: 3100, status: "pending", count: 0 },
  { sr: 18, name: "रेणुका इंजीनीरिंग वर्क्स", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 5000, paid: 0, remaining: 5000, status: "pending", count: 0 },
  { sr: 19, name: "मुल्ला चिकन शॉप", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 751, paid: 0, remaining: 751, status: "pending", count: 0 },
  { sr: 20, name: "नवरंग कारपेट", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 401, paid: 0, remaining: 401, status: "pending", count: 0 },
  { sr: 21, name: "सिद्धेश्वर दूध डेयरी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 2100, paid: 0, remaining: 2100, status: "pending", count: 0 },
  { sr: 22, name: "पवार सायकल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 901, paid: 0, remaining: 901, status: "pending", count: 0 },
  { sr: 23, name: "केक क्रीमी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 501, paid: 501, remaining: 0, status: "fully_paid", count: 1 },
  { sr: 24, name: "गुरुकृपा दूध डेअरी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 2500, paid: 0, remaining: 2500, status: "pending", count: 0 },
  { sr: 25, name: "राहुल प्लॅस्टिक", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1500, paid: 0, remaining: 1500, status: "pending", count: 0 },
  { sr: 26, name: "जयशांकर विडियो गेम", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1001, paid: 0, remaining: 1001, status: "pending", count: 0 },
  { sr: 27, name: "डी आर सी मटका", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 501, paid: 501, remaining: 0, status: "fully_paid", count: 1 },
  { sr: 28, name: "पुना एंटरप्राइजेस", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 301, paid: 301, remaining: 0, status: "fully_paid", count: 1 },
  { sr: 29, name: "लक्ष्मी स्वीट मार्ट", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1100, paid: 0, remaining: 1100, status: "pending", count: 0 },
  { sr: 30, name: "बालाजी हार्डवेअर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 3100, paid: 0, remaining: 3100, status: "pending", count: 0 },
  { sr: 31, name: "हरिप्रिया इमिटेशन", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 201, paid: 0, remaining: 201, status: "pending", count: 0 },
  { sr: 32, name: "विश्वनाथ हेयर स्टाइल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 101, paid: 0, remaining: 101, status: "pending", count: 0 },
  { sr: 33, name: "स्वामी समर्थ भजी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 201, paid: 0, remaining: 201, status: "pending", count: 0 },
  { sr: 34, name: "लक्ष्मी पूजा साहित्य", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 201, paid: 0, remaining: 201, status: "pending", count: 0 },
  { sr: 35, name: "किंग फॅशन", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 251, paid: 0, remaining: 251, status: "pending", count: 0 },
  { sr: 36, name: "माधव फ्लोउर अँड साडी सेंटर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 301, paid: 0, remaining: 301, status: "pending", count: 0 },
  { sr: 37, name: "भुलक्ष्मी भजी सेंटर", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 201, paid: 0, remaining: 201, status: "pending", count: 0 },
  { sr: 38, name: "श्री समर्थ एंटरप्रायझेस", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 201, paid: 201, remaining: 0, status: "fully_paid", count: 1 },
  { sr: 39, name: "हरेकृष्ण मेडिकल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 501, paid: 0, remaining: 501, status: "pending", count: 0 },
  { sr: 40, name: "अक्षय सॅनिटरी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 1100, paid: 0, remaining: 1100, status: "pending", count: 0 },
  { sr: 41, name: "नंदाल बेंकरी", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 2500, paid: 0, remaining: 2500, status: "pending", count: 0 },
  { sr: 42, name: "श्रावणी फोटो स्टुडिओ", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 201, paid: 0, remaining: 201, status: "pending", count: 0 },
  { sr: 43, name: "मोहन सायकल", businessName: "", mobile: "", area: "इंदिरा नगर, सोलापूर", promised: 3000, paid: 0, remaining: 3000, status: "pending", count: 0 },
];

async function restoreAllData() {
  console.log('🔄 Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  // 1. Get or create active Festival
  let festival = await Festival.findOne({ name: 'नवरात्र उत्सव २०२६' });
  if (!festival) {
    festival = await Festival.create({
      name: 'नवरात्र उत्सव २०२६',
      year: 2026,
      mandalNameMarathi: 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
      mandalAddress: '१९३, एम.आय.डी.सी.रोड, सोलापूर',
      registrationNo: 'महा./६१३/सोलापूर',
      openingBalance: 0,
      targetCollection: 100000,
      joinCode: 'VXEVQE',
      isActive: true,
    });
  } else {
    festival.isActive = true;
    await festival.save();
    // Deactivate any other test festivals
    await Festival.updateMany({ _id: { $ne: festival._id } }, { isActive: false });
  }

  console.log(`🏛️ Active Festival: "${festival.name}" (ID: ${festival._id})`);

  // 2. Clear old donors, payments, receipts for this festival to avoid duplicates
  console.log('🧹 Cleaning old donor, payment, and receipt records for active festival...');
  await Donor.deleteMany({ festivalId: festival._id });
  await Payment.deleteMany({ festivalId: festival._id });
  await Receipt.deleteMany({ festivalId: festival._id });

  // Ensure Admin user
  let admin = await User.findOne({ email: 'gururajkaki2205@gmail.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Gururaj',
      email: 'gururajkaki2205@gmail.com',
      mobile: '9876543210',
      password: 'admin',
      role: 'Admin',
      title: 'registered the mandal',
    });
  }

  // 3. Insert all 43 donors
  console.log(`📝 Inserting ${donorDataRaw.length} donors...`);
  let receiptCounter = 1;
  let totalCollection = 0;
  let fullyPaidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  for (const item of donorDataRaw) {
    const donor = await Donor.create({
      festivalId: festival._id,
      name: item.name,
      businessName: item.businessName || '',
      mobile: item.mobile || '',
      area: item.area || 'इंदिरा नगर, सोलापूर',
      promisedAmount: item.promised,
      bookNo: 'Book-1',
      physicalReceiptNo: '',
      notes: '',
      createdBy: 'Gururaj',
    });

    if (item.paid > 0) {
      const receiptNo = receiptCounter++;
      const isFully = item.paid >= item.promised;
      const remainingBal = Math.max(0, item.promised - item.paid);

      const marathiWords = numberToMarathiWords(item.paid);
      const englishWords = numberToEnglishWords(item.paid);

      const payment = await Payment.create({
        festivalId: festival._id,
        donorId: donor._id,
        receiptNo: receiptNo,
        receiptCode: `No. ${receiptNo}`,
        installmentNumber: 1,
        amount: item.paid,
        paymentDate: new Date(),
        paymentMethod: 'Cash',
        transactionRef: '',
        bookNo: 'Book-1',
        physicalReceiptNo: '',
        collectedBy: 'Gururaj',
        notes: isFully ? 'पूर्ण भरणा' : 'प्रथम हप्ता',
      });

      const verificationCode = `PAV-2026-${receiptNo}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      await Receipt.create({
        festivalId: festival._id,
        donorId: donor._id,
        paymentId: payment._id,
        receiptNo: receiptNo,
        receiptCode: `No. ${receiptNo}`,
        installmentNumber: 1,
        amount: item.paid,
        amountInMarathiWords: marathiWords,
        amountInEnglishWords: englishWords,
        promisedAmount: item.promised,
        previouslyPaid: 0,
        totalPaidSoFar: item.paid,
        remainingBalance: remainingBal,
        isFullyPaid: isFully,
        paymentDate: payment.paymentDate,
        paymentMethod: 'Cash',
        transactionRef: '',
        bookNo: 'Book-1',
        physicalReceiptNo: '',
        collectedBy: 'Gururaj',
        verificationCode: verificationCode,
      });

      totalCollection += item.paid;
      if (isFully) fullyPaidCount++;
      else partialCount++;

      console.log(`  ✓ Added ${donor.name}: Promised ₹${item.promised} | Paid ₹${item.paid} | Receipt #${receiptNo}`);
    } else {
      pendingCount++;
    }
  }

  // 4. Ensure expenses are recorded cleanly
  const existingExpenses = await Expense.find({ festivalId: festival._id });
  if (existingExpenses.length === 0) {
    await Expense.create({
      festivalId: festival._id,
      title: 'मंडप उभारणी व स्टेज डेकोरेशन',
      category: 'Decoration',
      amount: 600,
      paymentMethod: 'Cash',
      paidTo: 'राहुल डेकोरेटर्स',
      description: 'मंडप सजावट प्रथम बिल',
      recordedBy: 'Gururaj',
    });
    console.log('  ✓ Added initial expense: ₹600 (मंडप उभारणी व स्टेज डेकोरेशन)');
  }

  console.log('\n=========================================');
  console.log('🎉 ALL 43 DONORS AND PAYMENTS RESTORED SUCCESSFULLY! 🎉');
  console.log('=========================================');
  console.log(`- Total Donors: ${donorDataRaw.length}`);
  console.log(`- Fully Paid Donors: ${fullyPaidCount}`);
  console.log(`- Partially Paid Donors: ${partialCount}`);
  console.log(`- Pending Donors: ${pendingCount}`);
  console.log(`- Total Receipts Created: ${receiptCounter - 1}`);
  console.log(`- Total Collection: ₹${totalCollection.toLocaleString('en-IN')}`);
  console.log('=========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

restoreAllData().catch((err) => {
  console.error('❌ Error restoring data:', err);
  process.exit(1);
});
