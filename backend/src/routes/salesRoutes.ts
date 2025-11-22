import { Router } from 'express';
import { createSale } from '../controllers/salesController';

const router = Router();

router.post('/', createSale);

export default router;