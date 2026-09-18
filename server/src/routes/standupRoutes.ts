import { Router } from 'express';
import { submitStandup, getTodayStandup, updateStandup, getMyStandupHistory } from '../controllers/standupController.js';
import { toggleReaction, getStandupReactions } from '../controllers/reactionController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  submitStandupSchema,
  updateStandupSchema,
  standupIdParamSchema,
  standupIdPathParamSchema,
  toggleReactionSchema,
} from '../validators/standupSchemas.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', validateBody(submitStandupSchema), submitStandup);
router.get('/today', getTodayStandup);
router.get('/my-history', getMyStandupHistory);
router.put('/:id', validateParams(standupIdParamSchema), validateBody(updateStandupSchema), updateStandup);

// Reactions
router.post(
  '/:standupId/react',
  validateParams(standupIdPathParamSchema),
  validateBody(toggleReactionSchema),
  toggleReaction
);
router.get(
  '/:standupId/reactions',
  validateParams(standupIdPathParamSchema),
  getStandupReactions
);

export default router;
