import { Router } from 'express';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  requestDepartmentAccess,
  getAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  revokeAccess,
  grantDirectAccess
} from '../controllers/teamController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  getTeamsQuerySchema,
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  teamMemberParamsSchema,
  addTeamMemberSchema,
  requestAccessSchema,
  requestIdParamSchema,
  approveAccessSchema,
} from '../validators/teamSchemas.js';

const router = Router();

router.use(authenticateJWT);

// Team & Department roster
router.get('/', validateQuery(getTeamsQuerySchema), getTeams);
router.post(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  validateBody(createTeamSchema),
  createTeam
);
router.put(
  '/:teamId',
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(teamIdParamSchema),
  validateBody(updateTeamSchema),
  updateTeam
);
router.delete(
  '/:teamId',
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(teamIdParamSchema),
  deleteTeam
);
router.post(
  '/:teamId/members',
  requireRole(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
  validateParams(teamIdParamSchema),
  validateBody(addTeamMemberSchema),
  addTeamMember
);
router.delete(
  '/:teamId/members/:userId',
  requireRole(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
  validateParams(teamMemberParamsSchema),
  removeTeamMember
);

// Cross-Department Temporary Access Control
router.get('/access-requests', getAccessRequests);
router.post(
  '/:teamId/request-access',
  validateParams(teamIdParamSchema),
  validateBody(requestAccessSchema),
  requestDepartmentAccess
);
router.post(
  '/access-requests/:requestId/approve',
  validateParams(requestIdParamSchema),
  validateBody(approveAccessSchema),
  approveAccessRequest
);
router.post(
  '/access-requests/:requestId/reject',
  validateParams(requestIdParamSchema),
  rejectAccessRequest
);
router.post(
  '/access-requests/:requestId/revoke',
  validateParams(requestIdParamSchema),
  revokeAccess
);
router.post(
  '/:teamId/grant-access',
  requireRole(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
  validateParams(teamIdParamSchema),
  grantDirectAccess
);

export default router;
