import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import {
  getDepartments,
  getDepartmentById,
  getDepartmentHierarchy,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentIdParamSchema,
} from '../validators/departmentSchemas.js';

const router = Router();

router.use(authenticateJWT);

// View routes (Admin, Manager, Team Lead, Team Member)
router.get('/', getDepartments);
router.get('/:id', validateParams(departmentIdParamSchema), getDepartmentById);
router.get('/:id/hierarchy', validateParams(departmentIdParamSchema), getDepartmentHierarchy);

// Mutating routes (Admin only)
router.post(
  '/',
  requireRole(['ADMIN']),
  validateBody(createDepartmentSchema),
  createDepartment
);
router.put(
  '/:id',
  requireRole(['ADMIN']),
  validateParams(departmentIdParamSchema),
  validateBody(updateDepartmentSchema),
  updateDepartment
);
router.delete(
  '/:id',
  requireRole(['ADMIN']),
  validateParams(departmentIdParamSchema),
  deleteDepartment
);

export default router;
