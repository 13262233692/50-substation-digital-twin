import { create } from 'zustand'
import type { SystemStatus } from '@/shared/types'

interface ConnectionState {
  modbusConnected: boolean
  wsConnected: boolean
  pollCycleMs: number
  lastPollTimestamp: number
  deviceCount: number
  uptime: number
  setModbusConnected: (val: boolean) => void
  setWsConnected: (val: boolean) => void
  setPollCycleMs: (val: number) => void
  setLastPollTimestamp: (val: number) => void
  setDeviceCount: (val: number) => void
  setUptime: (val: number) => void
  updateFromStatus: (status: SystemStatus) => void
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  modbusConnected: false,
  wsConnected: false,
  pollCycleMs: 0,
  lastPollTimestamp: 0,
  deviceCount: 0,
  uptime: 0,

  setModbusConnected: (val) => set({ modbusConnected: val }),
  setWsConnected: (val) => set({ wsConnected: val }),
  setPollCycleMs: (val) => set({ pollCycleMs: val }),
  setLastPollTimestamp: (val) => set({ lastPollTimestamp: val }),
  setDeviceCount: (val) => set({ deviceCount: val }),
  setUptime: (val) => set({ uptime: val }),

  updateFromStatus: (status) =>
    set({
      modbusConnected: status.modbusConnected,
      pollCycleMs: status.pollCycleMs,
      lastPollTimestamp: status.lastPollTimestamp,
      deviceCount: status.deviceCount,
      uptime: status.uptime,
    }),
}))
