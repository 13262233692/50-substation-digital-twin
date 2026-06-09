import { Router, type Request, type Response } from 'express';
import * as configService from '../services/configService.js';

const router = Router();

router.get('/modbus', (_req: Request, res: Response): void => {
  const config = configService.getModbusConfig();
  res.json({ success: true, data: config });
});

router.put('/modbus', (req: Request, res: Response): void => {
  const updated = configService.updateModbusConfig(req.body);
  res.json({ success: true, data: updated });
});

router.get('/push', (_req: Request, res: Response): void => {
  const config = configService.getPushConfig();
  res.json({ success: true, data: config });
});

router.put('/push', (req: Request, res: Response): void => {
  const updated = configService.updatePushConfig(req.body);
  res.json({ success: true, data: updated });
});

export default router;
