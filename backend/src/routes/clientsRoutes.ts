import { Router } from 'express';
import { getClientByDni, getAllClients, deleteClient } from '../controllers/clientsController';

const router = Router();
router.get('/dni/:dni', getClientByDni);
router.get('/', getAllClients);
router.delete('/:id', deleteClient);

export default router;