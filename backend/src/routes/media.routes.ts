import { Router } from 'express';
import { getMessageMedia } from '../controllers/media.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/:messageId', authMiddleware, getMessageMedia);

export default router;
