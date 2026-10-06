import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants.js';

const receiptSchema = new mongoose.Schema(
  { filename: String, originalName: String, mimeType: String, size: Number },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
    category: { type: String, required: true, enum: EXPENSE_CATEGORIES },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, required: true, enum: PAYMENT_METHODS },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    tags: { type: [String], default: [] },
    receipt: { type: receiptSchema, default: null },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction', default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1, date: -1 });
expenseSchema.index({ userId: 1, paymentMethod: 1 });
expenseSchema.index({ userId: 1, tags: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);
