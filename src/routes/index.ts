
import { Router } from 'express';
import authRouter from './auth.routes';
import { healthRouter } from './health.routes';
import { userRouter } from '../controllers/user.routes';

const apiRouter:Router = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/health', healthRouter);

export default apiRouter;