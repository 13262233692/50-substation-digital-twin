import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '@/components/ui/TopNav'
import { useDeviceStore } from '@/stores/deviceStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { deviceTypeName, formatCurrent, formatVoltage, deviceStatusColor } from '@/lib/utils'
import { DeviceType } from '@/shared/types'
import type { Device } from '@/shared/types'

const MAX_HISTORY = 50

interface HistoryPoint {
  t: number
  a: number
  b: number
  c: number
}

export default function Monitor() {
  useWebSocket()
  const devices = useDeviceStore((s) => s.devices)
  const deviceList = Object.values(devices)
  const navigate = useNavigate()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const historyRef = useRef<Map<number, HistoryPoint[]>>(new Map())
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const updateHistory = useCallback((list: Device[]) => {
    const now = Date.now()
    for (const d of list) {
      const arr = historyRef.current.get(d.id) ?? []
      arr.push({ t: now, a: d.currentA, b: d.currentB, c: d.currentC })
      if (arr.length > MAX_HISTORY) arr.shift()
      historyRef.current.set(d.id, arr)
    }
  }, [])

  useEffect(() => {
    updateHistory(deviceList)
  }, [devices, updateHistory, deviceList])

  useEffect(() => {
    if (selectedId == null || !canvasRef.current) return
    const history = historyRef.current.get(selectedId) ?? []
    if (history.length < 2) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const pad = { top: 20, right: 20, bottom: 30, left: 50 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    ctx.fillStyle = '#0A0E17'
    ctx.fillRect(0, 0, w, h)

    const allVals = history.flatMap((p) => [p.a, p.b, p.c])
    const maxVal = Math.max(...allVals, 1) * 1.1

    ctx.strokeStyle = '#1A1F2E'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + cw, y)
      ctx.stroke()
      ctx.fillStyle = '#4b5563'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(((maxVal * (4 - i)) / 4).toFixed(1), pad.left - 6, y + 4)
    }

    const drawLine = (key: 'a' | 'b' | 'c', color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < history.length; i++) {
        const x = pad.left + (i / (MAX_HISTORY - 1)) * cw
        const y = pad.top + ch - (history[i][key] / maxVal) * ch
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    drawLine('a', '#ef4444')
    drawLine('b', '#00E676')
    drawLine('c', '#3b82f6')

    const legendY = h - 8
    const legends = [
      { label: 'A相', color: '#ef4444' },
      { label: 'B相', color: '#00E676' },
      { label: 'C相', color: '#3b82f6' },
    ]
    ctx.font = '11px JetBrains Mono, monospace'
    let lx = pad.left + cw - legends.length * 60
    for (const l of legends) {
      ctx.fillStyle = l.color
      ctx.fillRect(lx, legendY - 8, 12, 3)
      ctx.fillStyle = '#9ca3af'
      ctx.textAlign = 'left'
      ctx.fillText(l.label, lx + 16, legendY)
      lx += 60
    }
  }, [selectedId, devices])

  const breakers = deviceList.filter((d) => d.type === DeviceType.Breaker)
  const disconnectors = deviceList.filter((d) => d.type === DeviceType.Disconnector)
  const transformers = deviceList.filter((d) => d.type === DeviceType.Transformer)

  const summaryCard = (label: string, list: Device[]) => {
    const openCount = list.filter((d) => d.isOpen).length
    const alarmCount = list.filter((d) => d.alarm).length
    return (
      <div className="bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg p-4 flex-1">
        <div className="text-sm font-semibold tracking-wider text-gray-300 mb-3">{label}</div>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-mono text-[#00E5FF]">{list.length}</div>
            <div className="text-xs text-gray-500">总数</div>
          </div>
          <div>
            <div className="text-2xl font-mono text-[#00E676]">
              {list.length > 0 ? Math.round((openCount / list.length) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500">分闸率</div>
          </div>
          <div>
            <div className="text-2xl font-mono text-[#f97316]">{alarmCount}</div>
            <div className="text-xs text-gray-500">告警</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-[#0A0E17] flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-auto mt-14 p-6 space-y-6">
        <div className="flex gap-4">
          {summaryCard('断路器', breakers)}
          {summaryCard('隔离开关', disconnectors)}
          {summaryCard('变压器', transformers)}
        </div>

        <div className="bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A3040]">
            <span className="text-sm font-semibold tracking-wider text-gray-300">设备列表</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#2A3040]">
                  <th className="px-4 py-2 text-left">设备ID</th>
                  <th className="px-4 py-2 text-left">名称</th>
                  <th className="px-4 py-2 text-left">类型</th>
                  <th className="px-4 py-2 text-left">开合</th>
                  <th className="px-4 py-2 text-left">A相电流</th>
                  <th className="px-4 py-2 text-left">B相电流</th>
                  <th className="px-4 py-2 text-left">C相电流</th>
                  <th className="px-4 py-2 text-left">A相电压</th>
                  <th className="px-4 py-2 text-left">B相电压</th>
                  <th className="px-4 py-2 text-left">C相电压</th>
                  <th className="px-4 py-2 text-left">告警</th>
                  <th className="px-4 py-2 text-left">故障</th>
                </tr>
              </thead>
              <tbody>
                {deviceList.map((d, i) => {
                  const sc = deviceStatusColor(d.isOpen, d.alarm, d.fault)
                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-[#2A3040] cursor-pointer transition-colors ${
                        i % 2 === 0 ? 'bg-[#0A0E17]/40' : 'bg-[#0A0E17]/20'
                      } ${selectedId === d.id ? 'ring-1 ring-[#00E5FF]/30' : ''} hover:bg-[#1A1F2E]`}
                      onClick={() => {
                        setSelectedId(d.id)
                        useDeviceStore.getState().selectDevice(d.id)
                        navigate('/')
                      }}
                    >
                      <td className="px-4 py-2 font-mono text-gray-400">{d.id}</td>
                      <td className="px-4 py-2 text-gray-200">{d.name}</td>
                      <td className="px-4 py-2 text-gray-400">{deviceTypeName(d.type)}</td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc }} />
                          <span style={{ color: sc }}>{d.isOpen ? '分闸' : '合闸'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[#00E5FF]">{formatCurrent(d.currentA)}</td>
                      <td className="px-4 py-2 font-mono text-[#00E5FF]">{formatCurrent(d.currentB)}</td>
                      <td className="px-4 py-2 font-mono text-[#00E5FF]">{formatCurrent(d.currentC)}</td>
                      <td className="px-4 py-2 font-mono text-[#00E5FF]">{formatVoltage(d.voltageA)}</td>
                      <td className="px-4 py-2 font-mono text-[#00E5FF]">{formatVoltage(d.voltageB)}</td>
                      <td className="px-4 py-2 font-mono text-[#00E5FF]">{formatVoltage(d.voltageC)}</td>
                      <td className="px-4 py-2">
                        <span style={{ color: d.alarm ? '#f97316' : '#4b5563' }}>
                          {d.alarm ? '告警' : '正常'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span style={{ color: d.fault ? '#ef4444' : '#4b5563' }}>
                          {d.fault ? '故障' : '正常'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A3040]">
            <span className="text-sm font-semibold tracking-wider text-gray-300">
              三相电流趋势 {selectedId != null ? `- ${devices[selectedId]?.name ?? ''}` : '- 请选择设备'}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: 240 }}
          />
        </div>
      </div>
    </div>
  )
}
