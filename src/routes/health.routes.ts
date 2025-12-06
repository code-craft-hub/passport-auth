import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const healthRouter: Router = Router();

healthRouter.get('/', HealthController.check);

export { healthRouter };