import { DeviceType } from '@/shared/types'
import type { Device } from '@/shared/types'

const MAGIC_0 = 0x44
const MAGIC_1 = 0x54
const HEADER_SIZE = 2 + 1 + 8 + 2
const DEVICE_BLOCK_SIZE = 15

export function parseFrame(buffer: ArrayBuffer): {
  frameType: number
  timestamp: number
  devices: Device[]
} {
  const view = new DataView(buffer)

  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error(`Frame too short: ${buffer.byteLength} bytes`)
  }

  const magic0 = view.getUint8(0)
  const magic1 = view.getUint8(1)
  if (magic0 !== MAGIC_0 || magic1 !== MAGIC_1) {
    throw new Error(`Invalid magic bytes: 0x${magic0.toString(16)} 0x${magic1.toString(16)}`)
  }

  const frameType = view.getUint8(2)
  const timestamp = Number(view.getBigUint64(3, false))
  const deviceCount = view.getUint16(11, false)

  const expectedSize = HEADER_SIZE + deviceCount * DEVICE_BLOCK_SIZE
  if (buffer.byteLength < expectedSize) {
    throw new Error(`Frame incomplete: expected ${expectedSize}, got ${buffer.byteLength}`)
  }

  const devices: Device[] = []

  for (let i = 0; i < deviceCount; i++) {
    const offset = HEADER_SIZE + i * DEVICE_BLOCK_SIZE

    const id = view.getUint16(offset, false)
    const typeStatus = view.getUint8(offset + 2)

    const type = (typeStatus >> 4) & 0x0f
    const statusBits = typeStatus & 0x0f

    const isOpen = (statusBits & 0x01) !== 0
    const alarm = (statusBits & 0x02) !== 0
    const fault = (statusBits & 0x04) !== 0

    const currentA = view.getUint16(offset + 3, false) / 10
    const currentB = view.getUint16(offset + 5, false) / 10
    const currentC = view.getUint16(offset + 7, false) / 10

    const voltageA = view.getUint16(offset + 9, false)
    const voltageB = view.getUint16(offset + 11, false)
    const voltageC = view.getUint16(offset + 13, false)

    devices.push({
      id,
      type: type as DeviceType,
      name: '',
      position: [0, 0, 0],
      isOpen,
      alarm,
      fault,
      currentA,
      currentB,
      currentC,
      voltageA,
      voltageB,
      voltageC,
      lastUpdate: timestamp,
    })
  }

  return { frameType, timestamp, devices }
}
