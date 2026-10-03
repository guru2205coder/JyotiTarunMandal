import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Donor } from './models/Donor.js';
import { Payment } from './models/Payment.js';
import { Receipt } from './models/Receipt.js';
import { Expense } from './models/Expense.js';
import { Festival } from './models/Festival.js';
import { User } from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jyoti_mandal_vargani';

async function resetDatabase() {
  console.log('🔄 Connecting to MongoDB to reset database...');
  await mongoose.connect(MONGO_URI);

  console.log('🗑️ Clearing all transaction, donor, and receipt records...');
  const donorsDeleted = await Donor.deleteMany({});
  const paymentsDeleted = await Payment.deleteMany({});
  const receiptsDeleted = await Receipt.deleteMany({});
  const expensesDeleted = await Expense.deleteMany({});

  console.log(`  - Donors cleared: ${donorsDeleted.deletedCount}`);
  console.log(`  - Payments cleared: ${paymentsDeleted.deletedCount}`);
  console.log(`  - Receipts cleared: ${receiptsDeleted.deletedCount}`);
  console.log(`  - Expenses cleared: ${expensesDeleted.deletedCount}`);

  // Reset festivals to a single clean active festival with ₹0 opening balance
  console.log('🏛️ Resetting festival to clean default (Opening Balance: ₹0)...');
  await Festival.deleteMany({});
  const defaultFestival = await Festival.create({
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
  console.log(`  ✓ Active festival set: "${defaultFestival.name}" (Opening Balance: ₹0)`);

  // Ensure clean admin account exists
  console.log('👤 Ensuring clean Admin account...');
  await User.deleteMany({});
  const admin = await User.create({
    name: 'Gururaj',
    email: 'gururajkaki2205@gmail.com',
    mobile: '9876543210',
    password: 'admin',
    role: 'Admin',
    title: 'registered the mandal',
  });
  console.log(`  ✓ Default Admin ready: ${admin.email} (Password: admin)`);

  console.log('\n✨ DATABASE SUCCESSFULLY CLEARED & RESET TO BLANK! ✨');
  console.log('Summary:');
  console.log('  - Donors: 0');
  console.log('  - Payments: 0');
  console.log('  - Receipts: 0');
  console.log('  - Expenses: 0');
  console.log('  - Total Collection: ₹0');
  console.log('  - Total Expenses: ₹0');
  console.log('  - Opening Balance: ₹0');
  console.log('  - Available Balance: ₹0\n');

  await mongoose.disconnect();
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
