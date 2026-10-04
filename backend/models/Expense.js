import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    festivalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Festival',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Decoration',
        'Lighting',
        'Sound system',
        'Food',
        'Pooja materials',
        'Transportation',
        'Other',
      ],
      default: 'Other',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
      default: 'Cash',
    },
    paidTo: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    billUrl: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: String,
      default: 'Gururaj',
    },
    // Audit edit history
    editHistory: [
      {
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
        modifiedBy: {
          type: String,
          default: 'Admin',
        },
        previousTitle: String,
        previousCategory: String,
        previousAmount: Number,
        previousPaidTo: String,
        changeReason: {
          type: String,
          default: '',
        },
      },
    ],
  },
  { timestamps: true }
);

// Compound indexes for rapid festival-level expense queries
expenseSchema.index({ festivalId: 1, date: -1 });
expenseSchema.index({ festivalId: 1, category: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);
