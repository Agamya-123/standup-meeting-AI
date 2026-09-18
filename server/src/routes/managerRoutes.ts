import { Router } from 'express';
import { getManagerDashboard } from '../controllers/managerController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);
router.use(requireRole(['MANAGER', 'ADMIN', 'TEAM_LEAD', 'TEAM_MEMBER']));

router.get('/dashboard', getManagerDashboard);

export default router;
