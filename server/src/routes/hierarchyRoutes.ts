import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import {
  getManagers,
  createManager,
  updateManager,
  deleteManager
} from '../controllers/managerAdminController.js';
import {
  getTeamLeads,
  createTeamLead
} from '../controllers/teamLeadController.js';
import {
  getTeamMembers,
  createTeamMember
} from '../controllers/teamMemberController.js';
import { getAuditLogs } from '../controllers/auditController.js';

const router = Router();

router.use(authenticateJWT);

// Manager management (Admin only)
router.get('/managers', requireRole(['ADMIN', 'MANAGER']), getManagers);
router.post('/managers', requireRole(['ADMIN']), createManager);
router.put('/managers/:id', requireRole(['ADMIN']), updateManager);
router.delete('/managers/:id', requireRole(['ADMIN']), deleteManager);

// Team Lead management (Admin & Manager)
router.get('/team-leads', requireRole(['ADMIN', 'MANAGER']), getTeamLeads);
router.post('/team-leads', requireRole(['ADMIN', 'MANAGER']), createTeamLead);

// Team Member management (Admin, Manager, Team Lead)
router.get('/team-members', requireRole(['ADMIN', 'MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'MEMBER']), getTeamMembers);
router.post('/team-members', requireRole(['ADMIN', 'MANAGER', 'TEAM_LEAD']), createTeamMember);

// Audit logs (Admin only)
router.get('/audit-logs', requireRole(['ADMIN']), getAuditLogs);

export default router;
