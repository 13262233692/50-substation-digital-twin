import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '..', 'data', 'devices.json');

export interface ModbusConfig {
  host: string;
  port: number;
  pollIntervalMs: number;
  slaveStart: number;
  slaveEnd: number;
  timeoutMs: number;
}

export interface PushConfig {
  wsPort: number;
  pushIntervalMs: number;
  maxConnections: number;
}

interface FullConfig {
  modbus: ModbusConfig;
  push: PushConfig;
  devices: unknown[];
}

function loadConfig(): FullConfig {
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

function saveConfig(config: FullConfig): void {
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function getModbusConfig(): ModbusConfig {
  const config = loadConfig();
  return config.modbus;
}

export function updateModbusConfig(updates: Partial<ModbusConfig>): ModbusConfig {
  const config = loadConfig();
  config.modbus = { ...config.modbus, ...updates };
  saveConfig(config);
  return config.modbus;
}

export function getPushConfig(): PushConfig {
  const config = loadConfig();
  return config.push;
}

export function updatePushConfig(updates: Partial<PushConfig>): PushConfig {
  const config = loadConfig();
  config.push = { ...config.push, ...updates };
  saveConfig(config);
  return config.push;
}
