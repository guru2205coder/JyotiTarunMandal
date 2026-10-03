import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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
    receiptNo: {
      type: Number,
      required: true,
    },
    receiptCode: {
      type: String,
      required: true,
    },
    installmentNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Cheque', 'Other'],
      default: 'Cash',
    },
    transactionRef: {
      type: String,
      trim: true,
      default: '',
    },
    bookNo: {
      type: String,
      trim: true,
      default: '',
    },
    physicalReceiptNo: {
      type: String,
      trim: true,
      default: '',
    },
    collectedBy: {
      type: String,
      default: 'Gururaj',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    // Audit & reversal tracking
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalReason: {
      type: String,
      default: '',
    },
    reversedAt: {
      type: Date,
    },
    reversedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for unique receipt number per festival
paymentSchema.index({ festivalId: 1, receiptNo: 1 }, { unique: true });

export const Payment = mongoose.model('Payment', paymentSchema);
