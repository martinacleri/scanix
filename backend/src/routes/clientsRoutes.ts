import { Router } from 'express';
import { getClientByDni } from '../controllers/clientsController';

const router = Router();
router.get('/dni/:dni', getClientByDni);

export default router;