import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      default: 'Gururaj',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      trim: true,
      default: '9876543210',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    initialPassword: {
      type: String,
      default: '123456',
    },
    role: {
      type: String,
      enum: ['Admin', 'Volunteer', 'Treasurer'],
      default: 'Admin',
    },
    title: {
      type: String,
      default: 'registered the mandal',
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
