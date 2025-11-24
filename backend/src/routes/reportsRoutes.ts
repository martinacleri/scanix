import { Router } from 'express';
import { getDashboardStats } from '../controllers/reportsController';

const router = Router();

router.get('/dashboard', getDashboardStats);

export default router;