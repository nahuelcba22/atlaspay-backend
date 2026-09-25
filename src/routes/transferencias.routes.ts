import { Router } from 'express';
import { getTransferencias, crearTransferencia } from '../controllers/transferencia.controller';
import { validarToken } from '../middlewares/validarToken';

const router = Router();

router.get('/', validarToken, getTransferencias);
router.post('/', validarToken, crearTransferencia);

export default router;