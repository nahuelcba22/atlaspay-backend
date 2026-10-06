import { Router } from 'express';
import { verifyAdmin } from '../middlewares/admin.middleware';
import { obtenerHistorialGlobal, obtenerOperacionesCambio } from '../controllers/admin.controller';

const router = Router();

// Todas las rutas de este archivo pasarán primero por el middleware verifyAdmin
router.get('/transferencias', verifyAdmin, obtenerHistorialGlobal);
router.get('/exchange', verifyAdmin, obtenerOperacionesCambio);

export default router;