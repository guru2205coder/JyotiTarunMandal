import mongoose from 'mongoose';

const festivalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Festival name is required'],
      trim: true,
      default: 'नवरात्र उत्सव २०२६',
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      default: 2026,
    },
    mandalNameMarathi: {
      type: String,
      default: 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
    },
    mandalAddress: {
      type: String,
      default: '१९३, एम.आय.डी.सी.रोड, सोलापूर',
    },
    registrationNo: {
      type: String,
      default: 'महा./६१३/सोलापूर',
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetCollection: {
      type: Number,
      default: 100000,
    },
    joinCode: {
      type: String,
      default: 'VXEVQE',
      uppercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Festival = mongoose.model('Festival', festivalSchema);
