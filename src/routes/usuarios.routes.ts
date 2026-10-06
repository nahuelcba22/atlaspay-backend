import { Router } from 'express';
import { crearUsuario, login } from '../controllers/usuario.controller';
import { loginGoogle } from '../controllers/googleAuth.controller';

const router = Router();

router.post('/', crearUsuario);
router.post('/login', login);
router.post('/google', loginGoogle);

export default router;