import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    festivalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Festival',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    area: {
      type: String,
      trim: true,
      default: '',
    },
    promisedAmount: {
      type: Number,
      default: 0,
      min: 0,
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
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: String,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for rapid queries and book category lookups
donorSchema.index({ festivalId: 1, bookNo: 1 });
donorSchema.index({ festivalId: 1, createdAt: -1 });

// Virtual for payments
donorSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'donorId',
});

export const Donor = mongoose.model('Donor', donorSchema);
