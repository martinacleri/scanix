import { Router } from 'express';
import { sendMassiveCampaign } from '../controllers/marketingController';

const router = Router();

router.post('/send-campaign', sendMassiveCampaign);

export default router;