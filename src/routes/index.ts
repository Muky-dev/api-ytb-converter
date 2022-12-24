import { Router } from 'express';

import apiController from '../controllers';

//setup express router
const router = Router();
router.use('/api', apiController);

export default router;
