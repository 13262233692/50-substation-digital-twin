import { Router, type Request, type Response } from 'express';
import * as modbusPoller from '../services/modbusPoller.js';
import * as deviceService from '../services/deviceService.js';
import * as wsServer from '../websocket/wsServer.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      modbusConnected: modbusPoller.isModbusConnected(),
      wsClientCount: wsServer.getClientCount(),
      pollCycleMs: modbusPoller.getPollCycleMs(),
      lastPollTimestamp: modbusPoller.getLastPollTimestamp(),
      deviceCount: deviceService.getDeviceCount(),
      uptime: modbusPoller.getUptime(),
    },
  });
});

export default router;
