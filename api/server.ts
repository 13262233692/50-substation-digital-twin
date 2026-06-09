import app from './app.js';
import * as deviceService from './services/deviceService.js';
import * as modbusPoller from './services/modbusPoller.js';
import * as configService from './services/configService.js';
import * as wsServer from './websocket/wsServer.js';

const PORT = process.env.PORT || 3001;

deviceService.init();

const pushConfig = configService.getPushConfig();
wsServer.start(pushConfig.wsPort, pushConfig.maxConnections);

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

modbusPoller.startPolling((changedDevices) => {
  wsServer.broadcastDelta(changedDevices);
});

function gracefulShutdown(signal: string): void {
  console.log(`${signal} signal received`);
  modbusPoller.stopPolling();
  wsServer.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
