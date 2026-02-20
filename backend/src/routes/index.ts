import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { createPatientController, getPatientController } from '../controllers/patientController.js';
import { createPatientRecordController } from '../controllers/recordController.js';
import { uploadMedicalReportController } from '../controllers/reportController.js';
import {
  aiChatController,
  aiMedicationSuggestionsController,
  aiValidateDocumentController
} from '../controllers/aiController.js';
import { ocrExtractController } from '../controllers/ocrController.js';
import { mlAnalyzeController } from '../controllers/mlController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validationMiddleware } from '../middleware/validationMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(authMiddleware);

router.post(
  '/patients',
  requireRole('doctor'),
  body('fullName').isString().trim().notEmpty(),
  body('email').isEmail(),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isString(),
  validationMiddleware,
  asyncHandler(createPatientController)
);

router.get(
  '/patients/:id',
  param('id').isUUID(),
  validationMiddleware,
  asyncHandler(getPatientController)
);

router.post(
  '/patient-records',
  requireRole('doctor'),
  body('patientId').isUUID(),
  body('diagnosis').isString().notEmpty(),
  body('clinicalNotes').isString().notEmpty(),
  validationMiddleware,
  asyncHandler(createPatientRecordController)
);

router.post(
  '/reports/upload',
  requireRole('doctor'),
  upload.single('file'),
  body('patientId').isUUID(),
  body('extractedText').optional().isString(),
  validationMiddleware,
  asyncHandler(uploadMedicalReportController)
);

router.post('/ai/chat', body('message').isString().notEmpty(), validationMiddleware, asyncHandler(aiChatController));

router.post(
  '/ai/medication-suggestions',
  body('context').isString().notEmpty(),
  validationMiddleware,
  asyncHandler(aiMedicationSuggestionsController)
);

router.post(
  '/ai/validate-document',
  body('metadata').isObject(),
  validationMiddleware,
  asyncHandler(aiValidateDocumentController)
);

router.post('/ocr/extract', body('fileUrl').isURL(), validationMiddleware, asyncHandler(ocrExtractController));

router.post('/ml/analyze', body('payload').isObject(), validationMiddleware, asyncHandler(mlAnalyzeController));

export default router;
