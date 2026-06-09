import ModbusRTU from 'modbus-serial';
import * as deviceService from './deviceService.js';
import * as configService from './configService.js';
import type { DeviceState } from './deviceService.js';

let polling = false;
let modbusConnected = false;
let usingMockData = false;
let lastPollTimestamp = 0;
let pollCycleMs = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let onDeltaCallback: ((devices: DeviceState[]) => void) | null = null;
let connections: InstanceType<typeof ModbusRTU>[] = [];
const startTime = Date.now();
const CONNECTION_POOL_SIZE = 4;
const REGISTER_COUNT = 7;

async function createConnection(
  host: string,
  port: number,
  timeoutMs: number
): Promise<InstanceType<typeof ModbusRTU>> {
  const client = new ModbusRTU();
  client.setTimeout(timeoutMs);
  await client.connectTCP(host, { port });
  return client;
}

async function ensureConnections(): Promise<boolean> {
  const config = configService.getModbusConfig();
  if (connections.length > 0 && modbusConnected) return true;

  try {
    connections = [];
    for (let i = 0; i < CONNECTION_POOL_SIZE; i++) {
      const client = await createConnection(
        config.host,
        config.port,
        config.timeoutMs
      );
      connections.push(client);
    }
    modbusConnected = true;
    usingMockData = false;
    console.log(`Modbus connected to ${config.host}:${config.port}`);
    return true;
  } catch (err) {
    console.error('Modbus connection failed, using mock data:', err);
    modbusConnected = false;
    usingMockData = true;
    connections = [];
    return false;
  }
}

async function pollSlave(
  client: InstanceType<typeof ModbusRTU>,
  slaveId: number,
  registerBase: number
): Promise<number[]> {
  client.setID(slaveId);
  const result = await client.readHoldingRegisters(registerBase, REGISTER_COUNT);
  return result.data;
}

async function pollCycle(): Promise<void> {
  const cycleStart = Date.now();

  if (!modbusConnected || connections.length === 0) {
    const changed = deviceService.generateMockData();
    if (changed.length > 0 && onDeltaCallback) {
      onDeltaCallback(changed);
    }
    lastPollTimestamp = Date.now();
    pollCycleMs = Date.now() - cycleStart;
    return;
  }

  const allDevices = deviceService.getAllDevices();
  const groups: number[][] = Array.from({ length: connections.length }, () => []);

  for (const device of allDevices) {
    const groupIdx = (device.id - 1) % connections.length;
    groups[groupIdx].push(device.id);
  }

  await Promise.all(
    groups.map(async (group, connIdx) => {
      const client = connections[connIdx];
      if (!client) return;
      for (const deviceId of group) {
        const device = deviceService.getDevice(deviceId);
        if (!device) continue;
        try {
          const registerBase = (deviceId - 1) * 10;
          const values = await pollSlave(client, deviceId, registerBase);
          deviceService.updateDevice(deviceId, values);
        } catch {
          // skip failed slave read
        }
      }
    })
  );

  const changed = deviceService.getChangedDevices();
  if (changed.length > 0 && onDeltaCallback) {
    onDeltaCallback(changed);
  }

  lastPollTimestamp = Date.now();
  pollCycleMs = Date.now() - cycleStart;
}

function scheduleNextPoll(): void {
  if (!polling) return;
  const config = configService.getModbusConfig();
  pollTimer = setTimeout(async () => {
    if (!polling) return;
    try {
      await pollCycle();
    } catch (err) {
      console.error('Poll cycle error:', err);
    }
    scheduleNextPoll();
  }, config.pollIntervalMs);
}

export async function startPolling(
  onDelta: (devices: DeviceState[]) => void
): Promise<void> {
  if (polling) return;
  onDeltaCallback = onDelta;
  polling = true;
  await ensureConnections();
  scheduleNextPoll();
  console.log('Modbus polling started');
}

export function stopPolling(): void {
  polling = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  for (const client of connections) {
    try {
      client.close();
    } catch {
      // ignore close errors
    }
  }
  connections = [];
  modbusConnected = false;
  console.log('Modbus polling stopped');
}

export function isModbusConnected(): boolean {
  return modbusConnected;
}

export function isUsingMockData(): boolean {
  return usingMockData;
}

export function getLastPollTimestamp(): number {
  return lastPollTimestamp;
}

export function getPollCycleMs(): number {
  return pollCycleMs;
}

export function getUptime(): number {
  return Date.now() - startTime;
}
