import { Router } from 'express';
import { getProfile } from '../controllers/profile.controller';
import { validarToken } from '../middlewares/validarToken';

const router = Router();

router.get('/', validarToken, getProfile);

export default router;