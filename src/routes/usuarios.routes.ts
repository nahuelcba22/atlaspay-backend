import { Router } from 'express';
import { crearUsuario, login } from '../controllers/usuario.controller';

const router = Router();

router.post('/', crearUsuario);
router.post('/login', login);

export default router;