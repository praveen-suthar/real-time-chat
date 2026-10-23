import { Router } from 'express';
import {
  getConversations,
  createOrGetConversation,
  getConversationMessages,
  markConversationAsRead,
} from '../controllers/conversation.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();


router.use(authMiddleware);

router.get('/', getConversations);
router.post('/', createOrGetConversation);
router.get('/:id/messages', getConversationMessages);
router.patch('/:id/read', markConversationAsRead);

export default router;
