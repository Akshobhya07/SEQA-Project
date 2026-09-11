import { Router } from 'express';
import {
  getPostMortems,
  getPostMortemById,
  createPostMortem,
  updatePostMortem,
  addComment,
} from '../controllers/postMortemController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getPostMortems);
router.get('/:id', authenticate, getPostMortemById);
router.post('/', authenticate, authorize([Role.ADMIN, Role.SRE]), createPostMortem);
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.SRE, Role.DEVELOPER]), updatePostMortem);
router.post('/:id/comments', authenticate, authorize([Role.ADMIN, Role.SRE, Role.DEVELOPER]), addComment);

export default router;
