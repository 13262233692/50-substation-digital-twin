const MAGIC_BYTE_0 = 0x44;
const MAGIC_BYTE_1 = 0x54;
const FRAME_SNAPSHOT = 0x01;
const FRAME_DELTA = 0x02;
const DEVICE_BLOCK_SIZE = 15;

export interface DeviceFrameData {
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
}

function encodeDeviceBlock(device: DeviceFrameData): Buffer {
  const buf = Buffer.alloc(DEVICE_BLOCK_SIZE);
  let offset = 0;

  buf.writeUInt16BE(device.id, offset);
  offset += 2;

  const statusBits =
    (device.isOpen ? 0x01 : 0) |
    (device.alarm ? 0x02 : 0) |
    (device.fault ? 0x04 : 0);
  const typeStatus = (device.type << 4) | (statusBits & 0x0f);
  buf.writeUInt8(typeStatus, offset);
  offset += 1;

  buf.writeUInt16BE(Math.min(Math.round(device.currentA * 10), 0xffff), offset);
  offset += 2;
  buf.writeUInt16BE(Math.min(Math.round(device.currentB * 10), 0xffff), offset);
  offset += 2;
  buf.writeUInt16BE(Math.min(Math.round(device.currentC * 10), 0xffff), offset);
  offset += 2;

  buf.writeUInt16BE(Math.min(Math.round(device.voltageA), 0xffff), offset);
  offset += 2;
  buf.writeUInt16BE(Math.min(Math.round(device.voltageB), 0xffff), offset);
  offset += 2;
  buf.writeUInt16BE(Math.min(Math.round(device.voltageC), 0xffff), offset);
  offset += 2;

  return buf;
}

function encodeFrame(frameType: number, devices: DeviceFrameData[]): Buffer {
  const timestamp = BigInt(Date.now());
  const headerSize = 2 + 1 + 8 + 2;
  const totalSize = headerSize + devices.length * DEVICE_BLOCK_SIZE;
  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  buf.writeUInt8(MAGIC_BYTE_0, offset);
  offset += 1;
  buf.writeUInt8(MAGIC_BYTE_1, offset);
  offset += 1;

  buf.writeUInt8(frameType, offset);
  offset += 1;

  buf.writeBigUInt64BE(timestamp, offset);
  offset += 8;

  buf.writeUInt16BE(devices.length, offset);
  offset += 2;

  for (const device of devices) {
    const block = encodeDeviceBlock(device);
    block.copy(buf, offset);
    offset += DEVICE_BLOCK_SIZE;
  }

  return buf;
}

export function encodeSnapshot(devices: DeviceFrameData[]): Buffer {
  return encodeFrame(FRAME_SNAPSHOT, devices);
}

export function encodeDelta(devices: DeviceFrameData[]): Buffer {
  return encodeFrame(FRAME_DELTA, devices);
}
