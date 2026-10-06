import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true, match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'] },
    category: { type: String, required: true, enum: ['Overall', ...EXPENSE_CATEGORIES], default: 'Overall' },
    amount: { type: Number, required: true, min: [1, 'Budget must be at least 1'] },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model('Budget', budgetSchema);
