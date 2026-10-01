import { Router } from 'express';
import { getExchangeRates, realizarExchange } from '../controllers/exchange.controller';
import { validarToken } from '../middlewares/validarToken'; 

const router = Router();

router.get('/rates', getExchangeRates); 
router.post('/procesar', validarToken, realizarExchange);

export default router;