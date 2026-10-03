import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
  {
    festivalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Festival',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      unique: true,
      index: true,
    },
    receiptNo: {
      type: Number,
      required: true,
      index: true,
    },
    receiptCode: {
      type: String,
      required: true,
    },
    installmentNumber: {
      type: Number,
      default: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    amountInMarathiWords: {
      type: String,
      required: true,
    },
    amountInEnglishWords: {
      type: String,
      default: '',
    },
    promisedAmount: {
      type: Number,
      default: 0,
    },
    previouslyPaid: {
      type: Number,
      default: 0,
    },
    totalPaidSoFar: {
      type: Number,
      required: true,
    },
    remainingBalance: {
      type: Number,
      required: true,
    },
    isFullyPaid: {
      type: Boolean,
      default: false,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      default: 'Cash',
    },
    transactionRef: {
      type: String,
      default: '',
    },
    bookNo: {
      type: String,
      default: '',
    },
    physicalReceiptNo: {
      type: String,
      default: '',
    },
    collectedBy: {
      type: String,
      default: 'Gururaj',
    },
    verificationCode: {
      type: String,
      required: true,
      index: true,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound index for fast receipt retrieval
receiptSchema.index({ festivalId: 1, receiptNo: 1 });

export const Receipt = mongoose.model('Receipt', receiptSchema);
