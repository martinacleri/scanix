import { Router } from 'express';
import { createSale, sendTicketEmail } from '../controllers/salesController';

const router = Router();

router.post('/', createSale);
router.post('/send-ticket', sendTicketEmail);

export default router;