import { AlertTriangle, XCircle, Info, Check } from 'lucide-react'
import { useDeviceStore } from '@/stores/deviceStore'
import type { Alert } from '@/shared/types'

const TYPE_CONFIG: Record<Alert['type'], { icon: React.ReactNode; color: string }> = {
  alarm: { icon: <AlertTriangle className="w-4 h-4 shrink-0" />, color: '#f97316' },
  fault: { icon: <XCircle className="w-4 h-4 shrink-0" />, color: '#ef4444' },
  status_change: { icon: <Info className="w-4 h-4 shrink-0" />, color: '#00E5FF' },
}

export default function AlertBar() {
  const alerts = useDeviceStore((s) => s.alerts)
  const acknowledgeAlert = useDeviceStore((s) => s.acknowledgeAlert)

  const unack = alerts.filter((a) => !a.acknowledged)

  if (unack.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#1A1F2E]/60 backdrop-blur-md border-t border-[#2A3040] flex items-center justify-center">
        <span className="text-gray-600 text-xs">系统正常</span>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1A1F2E]/80 backdrop-blur-md border-t border-[#2A3040]">
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-thin">
        {unack.map((alert) => {
          const cfg = TYPE_CONFIG[alert.type]
          return (
            <div
              key={alert.id}
              className="flex items-center gap-2 shrink-0 bg-[#0A0E17] rounded px-3 py-1.5 text-sm"
            >
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span className="text-gray-300">{alert.deviceName}</span>
              <span className="text-gray-500">-</span>
              <span style={{ color: cfg.color }}>{alert.message}</span>
              <span className="text-gray-600 text-xs">
                {new Date(alert.timestamp).toLocaleTimeString('zh-CN')}
              </span>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="text-gray-500 hover:text-[#00E5FF] transition-colors ml-1"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
