export enum DeviceType {
  Breaker = 0,
  Disconnector = 1,
  Transformer = 2,
}

export interface Device {
  id: number;
  type: DeviceType;
  name: string;
  position: [number, number, number];
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
  binaryFormat: 'v1';
}

export interface SystemStatus {
  modbusConnected: boolean;
  wsClientCount: number;
  pollCycleMs: number;
  lastPollTimestamp: number;
  deviceCount: number;
  uptime: number;
}

export interface Alert {
  id: string;
  deviceId: number;
  deviceName: string;
  message: string;
  timestamp: number;
  type: 'alarm' | 'fault' | 'status_change';
  acknowledged: boolean;
}
