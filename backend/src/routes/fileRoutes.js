import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { receiptUpload, csvUpload } from '../middleware/upload.js';
import * as c from '../controllers/fileController.js';

const router = Router();
router.use(protect);
router.post('/upload', receiptUpload, c.uploadReceipt);
router.post('/extract-pdf', receiptUpload, c.extractPdf);
router.post('/import-csv', csvUpload, c.importCsv);
router.get('/export-csv', c.exportCsv);
router.get('/report-pdf', c.reportPdf);
router.get('/receipts/:filename', c.getReceipt);
router.delete('/receipts/:filename', c.deleteReceipt);
export default router;
