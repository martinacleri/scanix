import { Router } from 'express';
import { getClientByDni, getAllClients } from '../controllers/clientsController';

const router = Router();
router.get('/dni/:dni', getClientByDni);
router.get('/', getAllClients);

export default router;