import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DeviceState {
  id: number;
  type: number;
  isOpen: boolean;
  alarm: boolean;
  fault: boolean;
  currentA: number;
  currentB: number;
  currentC: number;
  voltageA: number;
  voltageB: number;
  voltageC: number;
  lastUpdate: number;
}

interface DeviceConfig {
  id: number;
  type: number;
  name: string;
  slaveId: number;
  registerBase: number;
  position: [number, number, number];
}

const devices = new Map<number, DeviceState>();
const previousStates = new Map<number, string>();
let deviceConfigs: DeviceConfig[] = [];

function loadConfig(): { devices: DeviceConfig[] } {
  const configPath = join(__dirname, '..', 'data', 'devices.json');
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

export function init(): void {
  const config = loadConfig();
  deviceConfigs = config.devices;
  for (const dc of deviceConfigs) {
    devices.set(dc.id, {
      id: dc.id,
      type: dc.type,
      isOpen: true,
      alarm: false,
      fault: false,
      currentA: 0,
      currentB: 0,
      currentC: 0,
      voltageA: 0,
      voltageB: 0,
      voltageC: 0,
      lastUpdate: 0,
    });
    previousStates.set(dc.id, '');
  }
}

export function updateDevice(id: number, registerValues: number[]): void {
  const state = devices.get(id);
  if (!state) return;
  if (registerValues.length < 7) return;

  const statusWord = registerValues[0];
  state.isOpen = !!(statusWord & 0x01);
  state.alarm = !!(statusWord & 0x02);
  state.fault = !!(statusWord & 0x04);
  state.currentA = registerValues[1] / 10;
  state.currentB = registerValues[2] / 10;
  state.currentC = registerValues[3] / 10;
  state.voltageA = registerValues[4];
  state.voltageB = registerValues[5];
  state.voltageC = registerValues[6];
  state.lastUpdate = Date.now();
}

export function getAllDevices(): DeviceState[] {
  return Array.from(devices.values());
}

export function getDevice(id: number): DeviceState | undefined {
  return devices.get(id);
}

export function getChangedDevices(): DeviceState[] {
  const changed: DeviceState[] = [];
  for (const state of devices.values()) {
    const key = [
      state.isOpen, state.alarm, state.fault,
      state.currentA, state.currentB, state.currentC,
      state.voltageA, state.voltageB, state.voltageC,
    ].join(',');
    const prev = previousStates.get(state.id);
    if (key !== prev) {
      changed.push(state);
      previousStates.set(state.id, key);
    }
  }
  return changed;
}

export function generateMockData(): DeviceState[] {
  for (const state of devices.values()) {
    state.isOpen = Math.random() > 0.1;
    state.alarm = Math.random() > 0.95;
    state.fault = Math.random() > 0.97;
    state.currentA = Math.round(Math.random() * 5000) / 10;
    state.currentB = Math.round(Math.random() * 5000) / 10;
    state.currentC = Math.round(Math.random() * 5000) / 10;
    state.voltageA = Math.round(Math.random() * 23000);
    state.voltageB = Math.round(Math.random() * 23000);
    state.voltageC = Math.round(Math.random() * 23000);
    state.lastUpdate = Date.now();
  }
  return getChangedDevices();
}

export function getDeviceCount(): number {
  return devices.size;
}
