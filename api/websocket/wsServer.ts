import { WebSocketServer, WebSocket } from 'ws';
import * as deviceService from '../services/deviceService.js';
import {
  encodeSnapshot,
  encodeDelta,
} from '../services/binaryEncoder.js';
import type { DeviceFrameData } from '../services/binaryEncoder.js';
import type { DeviceState } from '../services/deviceService.js';

let wss: WebSocketServer | null = null;
let clientCount = 0;

function deviceToFrameData(device: DeviceState): DeviceFrameData {
  return {
    id: device.id,
    type: device.type,
    isOpen: device.isOpen,
    alarm: device.alarm,
    fault: device.fault,
    currentA: device.currentA,
    currentB: device.currentB,
    currentC: device.currentC,
    voltageA: device.voltageA,
    voltageB: device.voltageB,
    voltageC: device.voltageC,
  };
}

export function start(port: number, maxConnections: number): void {
  wss = new WebSocketServer({ port, maxPayload: 1024 * 1024 });

  wss.on('connection', (ws: WebSocket) => {
    if (clientCount >= maxConnections) {
      ws.close(1013, 'Max connections reached');
      return;
    }

    clientCount++;
    console.log(`WebSocket client connected. Total: ${clientCount}`);

    try {
      const allDevices = deviceService.getAllDevices();
      const frameData = allDevices.map(deviceToFrameData);
      const snapshot = encodeSnapshot(frameData);
      ws.send(snapshot);
    } catch (err) {
      console.error('Failed to send snapshot:', err);
    }

    ws.on('close', () => {
      clientCount--;
      console.log(`WebSocket client disconnected. Total: ${clientCount}`);
    });

    ws.on('error', () => {
      clientCount--;
    });
  });

  console.log(`WebSocket server started on port ${port}`);
}

export function broadcastDelta(devices: DeviceState[]): void {
  if (!wss) return;
  if (devices.length === 0) return;

  const frameData = devices.map(deviceToFrameData);
  const delta = encodeDelta(frameData);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(delta);
    }
  }
}

export function getClientCount(): number {
  return clientCount;
}

export function stop(): void {
  if (!wss) return;
  for (const client of wss.clients) {
    client.close();
  }
  wss.close();
  wss = null;
  clientCount = 0;
}
