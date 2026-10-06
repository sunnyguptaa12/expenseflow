import mongoose from 'mongoose';
import { INCOME_SOURCES, PAYMENT_METHODS } from '../utils/constants.js';

const incomeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
    source: { type: String, required: true, enum: INCOME_SOURCES },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, required: true, enum: PAYMENT_METHODS },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction', default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, source: 1, date: -1 });

export const Income = mongoose.model('Income', incomeSchema);
