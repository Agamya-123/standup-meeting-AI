import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  resolveBlocker
} from '../controllers/notificationController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);
router.post('/mark-all-read', markAllNotificationsRead);
router.delete('/:id', deleteNotification);

// Manager blocker resolution endpoint
router.post('/resolve-blocker/:id', requireRole(['MANAGER', 'ADMIN']), resolveBlocker);

export default router;
