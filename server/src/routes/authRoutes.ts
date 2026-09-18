import { Router } from 'express';
import {
  registerCompany,
  lookupIdentifier,
  login,
  addEmployee,
  getCompanyEmployees,
  updateEmployee,
  getMe
} from '../controllers/authController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  registerCompanySchema,
  lookupIdentifierSchema,
  loginSchema,
  addEmployeeSchema,
  updateEmployeeSchema,
  employeeIdParamSchema,
} from '../validators/authSchemas.js';

const router = Router();

// Public Authentication & Lookup Endpoints (Rate limited + Schema validated)
router.post(
  '/register-company',
  authRateLimiter,
  validateBody(registerCompanySchema),
  registerCompany
);
router.post(
  '/register',
  authRateLimiter,
  validateBody(registerCompanySchema),
  registerCompany
); // Alias for convenience
router.post(
  '/lookup-identifier',
  authRateLimiter,
  validateBody(lookupIdentifierSchema),
  lookupIdentifier
);
router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  login
);

// Authenticated User & Employee Management Endpoints
router.get('/me', authenticateJWT, getMe);
router.post(
  '/employees',
  authenticateJWT,
  requireRole(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
  validateBody(addEmployeeSchema),
  addEmployee
);
router.patch(
  '/employees/:id',
  authenticateJWT,
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(employeeIdParamSchema),
  validateBody(updateEmployeeSchema),
  updateEmployee
);
router.put(
  '/employees/:id',
  authenticateJWT,
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(employeeIdParamSchema),
  validateBody(updateEmployeeSchema),
  updateEmployee
);
router.get('/employees', authenticateJWT, getCompanyEmployees);

export default router;
