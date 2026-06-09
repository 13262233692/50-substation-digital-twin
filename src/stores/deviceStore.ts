import { create } from 'zustand';
import type { Device, Alert } from '@/shared/types';

const BRK_X = [3, 6, 9, 12, 15, 18];
const DS_X = [21, 24, 27, 30, 33, 36];
const TR_X = [39, 42, 45, 48];
const BAY_COUNT = 8;
const MAX_ALERTS = 200;

function createInitialDevices(): Record<number, Device> {
  const devices: Record<number, Device> = {};
  let id = 1;
  for (let bay = 1; bay <= BAY_COUNT; bay++) {
    for (let i = 0; i < BRK_X.length; i++) {
      devices[id] = {
        id, type: 0, name: `Bay-${bay}-BRK-${i + 1}`,
        position: [BRK_X[i], 0, bay],
        isOpen: true, alarm: false, fault: false,
        currentA: 0, currentB: 0, currentC: 0,
        voltageA: 0, voltageB: 0, voltageC: 0,
        lastUpdate: 0,
      };
      id++;
    }
    for (let i = 0; i < DS_X.length; i++) {
      devices[id] = {
        id, type: 1, name: `Bay-${bay}-DS-${i + 1}`,
        position: [DS_X[i], 3, bay],
        isOpen: true, alarm: false, fault: false,
        currentA: 0, currentB: 0, currentC: 0,
        voltageA: 0, voltageB: 0, voltageC: 0,
        lastUpdate: 0,
      };
      id++;
    }
    for (let i = 0; i < TR_X.length; i++) {
      devices[id] = {
        id, type: 2, name: `Bay-${bay}-TR-${i + 1}`,
        position: [TR_X[i], 6, bay],
        isOpen: true, alarm: false, fault: false,
        currentA: 0, currentB: 0, currentC: 0,
        voltageA: 0, voltageB: 0, voltageC: 0,
        lastUpdate: 0,
      };
      id++;
    }
  }
  return devices;
}

interface DeviceStore {
  devices: Record<number, Device>;
  selectedDeviceId: number | null;
  alerts: Alert[];
  connected: boolean;
  lastUpdate: number;
  setDevices: (devices: Device[]) => void;
  updateDevice: (id: number, update: Partial<Device>) => void;
  updateDevices: (incoming: Partial<Device>[]) => void;
  selectDevice: (id: number | null) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  setConnected: (val: boolean) => void;
  setLastUpdate: (ts: number) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: createInitialDevices(),
  selectedDeviceId: null,
  alerts: [],
  connected: false,
  lastUpdate: 0,
  setDevices: (incoming) =>
    set((state) => {
      const next = { ...state.devices };
      for (const d of incoming) {
        next[d.id] = d;
      }
      return { devices: next };
    }),
  updateDevice: (id, update) =>
    set((state) => {
      const existing = state.devices[id];
      if (!existing) return state;
      return { devices: { ...state.devices, [id]: { ...existing, ...update } } };
    }),
  updateDevices: (incoming) =>
    set((state) => {
      const next = { ...state.devices };
      const newAlerts: Alert[] = [];
      for (const d of incoming) {
        const existing = next[d.id];
        if (existing) {
          if (d.isOpen !== undefined && d.isOpen !== existing.isOpen) {
            newAlerts.push({
              id: `status-${d.id}-${Date.now()}`,
              deviceId: d.id,
              deviceName: existing.name,
              message: d.isOpen ? '设备分闸' : '设备合闸',
              timestamp: Date.now(),
              type: 'status_change',
              acknowledged: false,
            });
          }
          if (d.alarm !== undefined && d.alarm && !existing.alarm) {
            newAlerts.push({
              id: `alarm-${d.id}-${Date.now()}`,
              deviceId: d.id,
              deviceName: existing.name,
              message: '设备告警',
              timestamp: Date.now(),
              type: 'alarm',
              acknowledged: false,
            });
          }
          if (d.fault !== undefined && d.fault && !existing.fault) {
            newAlerts.push({
              id: `fault-${d.id}-${Date.now()}`,
              deviceId: d.id,
              deviceName: existing.name,
              message: '设备故障',
              timestamp: Date.now(),
              type: 'fault',
              acknowledged: false,
            });
          }
          next[d.id] = { ...existing, ...d };
        }
      }
      const alerts = [...newAlerts, ...state.alerts].slice(0, MAX_ALERTS);
      return { devices: next, alerts };
    }),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, MAX_ALERTS),
    })),
  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    })),
  setConnected: (val) => set({ connected: val }),
  setLastUpdate: (ts) => set({ lastUpdate: ts }),
}));
