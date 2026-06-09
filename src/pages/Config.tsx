import { useState, useEffect } from 'react'
import TopNav from '@/components/ui/TopNav'
import type { ModbusConfig, PushConfig } from '@/shared/types'

const DEFAULT_MODBUS: ModbusConfig = {
  host: '127.0.0.1',
  port: 502,
  pollIntervalMs: 1000,
  slaveStart: 1,
  slaveEnd: 128,
  timeoutMs: 3000,
}

const DEFAULT_PUSH: PushConfig = {
  wsPort: 8081,
  pushIntervalMs: 100,
  maxConnections: 10,
  binaryFormat: 'v1',
}

export default function Config() {
  const [modbus, setModbus] = useState<ModbusConfig>(DEFAULT_MODBUS)
  const [push, setPush] = useState<PushConfig>(DEFAULT_PUSH)
  const [modbusMsg, setModbusMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [pushMsg, setPushMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/config/modbus')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setModbus(d))
      .catch(() => {})

    fetch('/api/config/push')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPush(d))
      .catch(() => {})
  }, [])

  const saveModbus = async () => {
    setModbusMsg(null)
    try {
      const res = await fetch('/api/config/modbus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modbus),
      })
      setModbusMsg({ text: res.ok ? '保存成功' : '保存失败', ok: res.ok })
    } catch {
      setModbusMsg({ text: '网络错误', ok: false })
    }
  }

  const savePush = async () => {
    setPushMsg(null)
    try {
      const res = await fetch('/api/config/push', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(push),
      })
      setPushMsg({ text: res.ok ? '保存成功' : '保存失败', ok: res.ok })
    } catch {
      setPushMsg({ text: '网络错误', ok: false })
    }
  }

  const modbusFields: { key: keyof ModbusConfig; label: string; type: string }[] = [
    { key: 'host', label: '主机地址', type: 'text' },
    { key: 'port', label: '端口', type: 'number' },
    { key: 'pollIntervalMs', label: '轮询间隔 (ms)', type: 'number' },
    { key: 'slaveStart', label: '从站起始地址', type: 'number' },
    { key: 'slaveEnd', label: '从站结束地址', type: 'number' },
    { key: 'timeoutMs', label: '超时时间 (ms)', type: 'number' },
  ]

  const pushFields: { key: keyof PushConfig; label: string; type: string }[] = [
    { key: 'wsPort', label: 'WebSocket 端口', type: 'number' },
    { key: 'pushIntervalMs', label: '推送间隔 (ms)', type: 'number' },
    { key: 'maxConnections', label: '最大连接数', type: 'number' },
  ]

  return (
    <div className="w-screen h-screen bg-[#0A0E17] flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-auto mt-14 p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-6">
          <div className="bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg">
            <div className="px-6 py-4 border-b border-[#2A3040]">
              <h2 className="text-lg font-semibold tracking-wider text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Modbus 配置
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {modbusFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={modbus[f.key]}
                    onChange={(e) =>
                      setModbus({
                        ...modbus,
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="w-full bg-[#0A0E17] border border-[#2A3040] rounded px-3 py-2 text-sm font-mono text-[#00E5FF] focus:border-[#00E5FF] focus:outline-none transition-colors"
                  />
                </div>
              ))}
              {modbusMsg && (
                <div className={`text-sm ${modbusMsg.ok ? 'text-[#00E676]' : 'text-[#FF3D00]'}`}>
                  {modbusMsg.text}
                </div>
              )}
              <button
                onClick={saveModbus}
                className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] rounded px-4 py-2 text-sm font-semibold tracking-wider hover:bg-[#00E5FF]/20 transition-colors"
              >
                保存
              </button>
            </div>
          </div>

          <div className="bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg">
            <div className="px-6 py-4 border-b border-[#2A3040]">
              <h2 className="text-lg font-semibold tracking-wider text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                推送配置
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {pushFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={push[f.key]}
                    onChange={(e) =>
                      setPush({
                        ...push,
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="w-full bg-[#0A0E17] border border-[#2A3040] rounded px-3 py-2 text-sm font-mono text-[#00E5FF] focus:border-[#00E5FF] focus:outline-none transition-colors"
                  />
                </div>
              ))}
              {pushMsg && (
                <div className={`text-sm ${pushMsg.ok ? 'text-[#00E676]' : 'text-[#FF3D00]'}`}>
                  {pushMsg.text}
                </div>
              )}
              <button
                onClick={savePush}
                className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] rounded px-4 py-2 text-sm font-semibold tracking-wider hover:bg-[#00E5FF]/20 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
