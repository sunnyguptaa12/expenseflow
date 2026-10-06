import { z } from 'zod';
import { EXPENSE_CATEGORIES, INCOME_SOURCES, PAYMENT_METHODS, FREQUENCIES } from './constants.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');
const password = z.string().min(8, 'Password must be at least 8 characters.').max(72).regex(/[A-Za-z]/, 'Password must contain a letter.').regex(/\d/, 'Password must contain a number.');

export const registerSchema = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60), email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required.'), remember: z.boolean().optional() });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(10, 'Reset token is missing.'), password });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Current password is required.'), newPassword: password });
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: email.optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD', 'JPY']).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
});

const receipt = z.object({
  filename: z.string().regex(/^[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/i, 'Invalid receipt reference.'),
  originalName: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().nonnegative(),
});

const common = {
  amount: z.coerce.number({ invalid_type_error: 'Amount must be a number.' }).positive('Amount must be greater than zero.').max(1e9),
  description: z.string().trim().min(1, 'Description is required.').max(200),
  date: z.coerce.date({ invalid_type_error: 'Enter a valid date.' }),
  paymentMethod: z.string({ required_error: 'Select a valid payment method.', invalid_type_error: 'Select a valid payment method.' }).trim()
    .transform((value) => PAYMENT_METHODS.find((method) => method.toLowerCase() === value.toLowerCase()) || value)
    .pipe(z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Select a valid payment method.' }) })),
  notes: z.string().trim().max(1000).optional().default(''),
};

export const expenseSchema = z.object({
  ...common,
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Select a valid category.' }) }),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).optional().default([]),
  receipt: receipt.nullable().optional(),
});
export const incomeSchema = z.object({
  ...common,
  source: z.enum(INCOME_SOURCES, { errorMap: () => ({ message: 'Select a valid income source.' }) }),
});
export const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format.'),
  category: z.enum(['Overall', ...EXPENSE_CATEGORIES]).default('Overall'),
  amount: z.coerce.number().min(1, 'Budget must be at least 1.').max(1e9),
});
export const recurringSchema = z.object({
  type: z.enum(['expense', 'income']).default('expense'),
  amount: common.amount,
  category: z.string().refine((v) => EXPENSE_CATEGORIES.includes(v) || INCOME_SOURCES.includes(v), 'Select a valid category.'),
  description: common.description,
  frequency: z.enum(FREQUENCIES),
  paymentMethod: common.paymentMethod.optional().default('Bank Transfer'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((v) => !v.endDate || v.endDate >= v.startDate, { message: 'End date must be after the start date.', path: ['endDate'] })
  .refine((v) => (v.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES).includes(v.category), { message: 'Category does not match the transaction type.', path: ['category'] });
