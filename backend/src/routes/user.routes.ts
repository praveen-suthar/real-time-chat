import { Router } from 'express';
import { getAllUsers } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, getAllUsers);

export default router;
