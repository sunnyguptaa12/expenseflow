import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, INCOME_SOURCES, FREQUENCIES, PAYMENT_METHODS } from '../utils/constants.js';

const recurringSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['expense', 'income'], default: 'expense' },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, enum: [...new Set([...EXPENSE_CATEGORIES, ...INCOME_SOURCES])] },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    frequency: { type: String, required: true, enum: FREQUENCIES },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Bank Transfer' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextRunDate: { type: Date, required: true },
    lastRunDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringSchema.index({ userId: 1, isActive: 1, nextRunDate: 1 });
recurringSchema.index({ isActive: 1, nextRunDate: 1 });

export const RecurringTransaction = mongoose.model('RecurringTransaction', recurringSchema);
