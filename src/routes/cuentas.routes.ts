import { Router } from 'express';
import { getCuenta } from '../controllers/cuenta.controller';
import { validarToken } from '../middlewares/validarToken';

const router = Router();

router.get('/mi-cuenta', validarToken, getCuenta);

export default router;