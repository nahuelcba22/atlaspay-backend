import { Router } from 'express';
import { getHistorial } from '../controllers/historial.controller';
import { validarToken } from '../middlewares/validarToken';

const router = Router();

router.get('/', validarToken, getHistorial);

export default router;
