import { Router } from 'express';
import { getExchangeRates, realizarExchange, getExchangeStats } from '../controllers/exchange.controller';
import { validarToken } from '../middlewares/validarToken'; 

const router = Router();

router.get('/rates', getExchangeRates); 
router.get('/stats', validarToken, getExchangeStats);
router.post('/procesar', validarToken, realizarExchange);

export default router;
