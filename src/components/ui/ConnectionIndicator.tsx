import { Wifi, WifiOff, Activity } from 'lucide-react'
import { useDeviceStore } from '@/stores/deviceStore'
import { useConnectionStore } from '@/stores/connectionStore'

export default function ConnectionIndicator() {
  const connected = useDeviceStore((s) => s.connected)
  const lastUpdate = useDeviceStore((s) => s.lastUpdate)
  const modbusConnected = useConnectionStore((s) => s.modbusConnected)
  const pollCycleMs = useConnectionStore((s) => s.pollCycleMs)

  const lastUpdateStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString('zh-CN')
    : '--:--:--'

  return (
    <div className="flex items-center gap-4 bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <Wifi className="w-4 h-4 text-[#00E676]" />
            <span className="text-[#00E676]">已连接</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-[#FF3D00]" />
            <span className="text-[#FF3D00]">已断开</span>
          </>
        )}
      </div>

      <div className="w-px h-4 bg-[#2A3040]" />

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${modbusConnected ? 'bg-[#00E676]' : 'bg-[#FF3D00]'}`} />
        <span className="text-gray-400">Modbus</span>
        <span className={modbusConnected ? 'text-[#00E676]' : 'text-[#FF3D00]'}>
          {modbusConnected ? '在线' : '离线'}
        </span>
      </div>

      <div className="w-px h-4 bg-[#2A3040]" />

      <div className="flex items-center gap-1 text-gray-400">
        <Activity className="w-3.5 h-3.5" />
        <span>{lastUpdateStr}</span>
      </div>

      <div className="w-px h-4 bg-[#2A3040]" />

      <div className="flex items-center gap-1">
        <span className="text-gray-400">轮询</span>
        <span className="font-mono text-[#00E5FF]">{pollCycleMs}ms</span>
      </div>
    </div>
  )
}
