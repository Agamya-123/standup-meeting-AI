import { Router } from 'express';
import { getDailyAISummary } from '../controllers/aiController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);
router.get('/summary', getDailyAISummary);

export default router;
