import fs from 'fs';
import path from 'path';
import { Expense } from '../models/Expense.js';
import { Income } from '../models/Income.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { parseFilters, listTransactions, asExpense, asIncome } from '../services/transactionService.js';
import { runExpenseChecks } from '../services/notificationService.js';
import { userDir } from '../middleware/upload.js';

const receiptPath = (userId, filename) => path.join(userDir(userId), path.basename(filename));
const deleteReceiptFile = (userId, receipt) => receipt?.filename && fs.promises.unlink(receiptPath(userId, receipt.filename)).catch(() => {});

// A receipt reference is only accepted if the file physically exists in this user's own folder.
function assertReceiptOwned(userId, receipt) {
  if (receipt && !fs.existsSync(receiptPath(userId, receipt.filename))) throw new ApiError(400, 'Receipt file was not found. Please upload it again.');
}

export const listAll = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listTransactions(req.user._id, parseFilters(req.query));
  sendSuccess(res, items, 'Transactions fetched.', 200, meta);
});

function makeController(kind) {
  const Model = kind === 'expense' ? Expense : Income;
  const decorate = kind === 'expense' ? asExpense : asIncome;
  const label = kind === 'expense' ? 'Expense' : 'Income';
  const findOwned = async (req) => {
    const doc = await Model.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) throw new ApiError(404, `${label} not found.`);
    return doc;
  };

  return {
    list: asyncHandler(async (req, res) => {
      const { items, ...meta } = await listTransactions(req.user._id, { ...parseFilters(req.query), type: kind });
      sendSuccess(res, items, `${label} list fetched.`, 200, meta);
    }),
    get: asyncHandler(async (req, res) => sendSuccess(res, decorate((await findOwned(req)).toObject()))),
    create: asyncHandler(async (req, res) => {
      if (kind === 'expense') assertReceiptOwned(req.user._id, req.body.receipt);
      const doc = await Model.create({ ...req.body, userId: req.user._id });
      if (kind === 'expense') await runExpenseChecks(req.user, doc);
      sendSuccess(res, decorate(doc.toObject()), `${label} added.`, 201);
    }),
    update: asyncHandler(async (req, res) => {
      const doc = await findOwned(req);
      const previousReceipt = kind === 'expense' ? doc.receipt : null;
      if (kind === 'expense' && req.body.receipt !== undefined) assertReceiptOwned(req.user._id, req.body.receipt);
      const { receipt, ...rest } = req.body;
      doc.set(rest);
      if (kind === 'expense' && receipt !== undefined) doc.receipt = receipt;
      await doc.save();
      if (previousReceipt && previousReceipt.filename !== doc.receipt?.filename) await deleteReceiptFile(req.user._id, previousReceipt);
      if (kind === 'expense') await runExpenseChecks(req.user, doc);
      sendSuccess(res, decorate(doc.toObject()), `${label} updated.`);
    }),
    remove: asyncHandler(async (req, res) => {
      const doc = await findOwned(req);
      await doc.deleteOne();
      if (kind === 'expense') await deleteReceiptFile(req.user._id, doc.receipt);
      sendSuccess(res, null, `${label} deleted.`);
    }),
  };
}

export const expenseController = makeController('expense');
export const incomeController = makeController('income');
