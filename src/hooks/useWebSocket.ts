import { useEffect, useRef, useCallback } from 'react'
import { parseFrame } from '@/hooks/useBinaryParser'
import { useDeviceStore } from '@/stores/deviceStore'
import { useConnectionStore } from '@/stores/connectionStore'

const WS_URL = 'ws://localhost:8081'
const RECONNECT_DELAY = 3000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateDevices = useDeviceStore((s) => s.updateDevices)
  const setConnected = useDeviceStore((s) => s.setConnected)
  const setLastUpdate = useDeviceStore((s) => s.setLastUpdate)
  const setWsConnected = useConnectionStore((s) => s.setWsConnected)
  const connected = useDeviceStore((s) => s.connected)
  const lastUpdate = useDeviceStore((s) => s.lastUpdate)
  const devices = useDeviceStore((s) => s.devices)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    clearTimer()

    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
    }

    const ws = new WebSocket(WS_URL)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setWsConnected(true)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const { devices: parsed, timestamp } = parseFrame(event.data as ArrayBuffer)
        const partials = parsed.map((d) => ({
          id: d.id,
          type: d.type,
          isOpen: d.isOpen,
          alarm: d.alarm,
          fault: d.fault,
          currentA: d.currentA,
          currentB: d.currentB,
          currentC: d.currentC,
          voltageA: d.voltageA,
          voltageB: d.voltageB,
          voltageC: d.voltageC,
          lastUpdate: d.lastUpdate,
        }))
        updateDevices(partials)
        setLastUpdate(timestamp)
      } catch (err) {
        console.error('Failed to parse frame:', err)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setWsConnected(false)
      timerRef.current = setTimeout(connect, RECONNECT_DELAY)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [clearTimer, updateDevices, setConnected, setLastUpdate, setWsConnected])

  const reconnect = useCallback(() => {
    connect()
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      clearTimer()
      if (wsRef.current) {
        wsRef.current.onopen = null
        wsRef.current.onmessage = null
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, clearTimer])

  return {
    connected,
    devices: Object.values(devices),
    lastUpdate,
    reconnect,
  }
}
