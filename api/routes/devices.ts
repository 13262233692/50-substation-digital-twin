import { Router, type Request, type Response } from 'express';
import * as deviceService from '../services/deviceService.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  const devices = deviceService.getAllDevices();
  res.json({ success: true, data: devices });
});

router.get('/:id', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: 'Invalid device id' });
    return;
  }
  const device = deviceService.getDevice(id);
  if (!device) {
    res.status(404).json({ success: false, error: 'Device not found' });
    return;
  }
  res.json({ success: true, data: device });
});

export default router;
