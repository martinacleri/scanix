import { Router } from 'express';
import { createTransfer } from '../controllers/transferController';

const router = Router();

router.post('/', createTransfer);

export default router;