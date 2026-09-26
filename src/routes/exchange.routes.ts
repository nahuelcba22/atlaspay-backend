import { Router } from 'express';
import { getExchangeRates } from '../controllers/exchange.controller';
// import { verifyToken } from '../middlewares/auth.middleware'; // Opcional por si lo quieren proteger

const router = Router();

// Endpoint que va a consumir el frontend
router.get('/rates', getExchangeRates); // Si usan middleware sería: router.get('/rates', verifyToken, getExchangeRates);

export default router;