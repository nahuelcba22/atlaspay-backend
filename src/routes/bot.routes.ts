import { Router } from 'express';
import { conversarConBot } from '../controllers/bot.controller';

const router = Router();
router.post('/chat', conversarConBot);

export default router;