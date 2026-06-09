import { X, Zap, AlertTriangle, Shield } from 'lucide-react'
import { useDeviceStore } from '@/stores/deviceStore'
import { deviceTypeName, formatCurrent, formatVoltage, deviceStatusColor } from '@/lib/utils'

export default function DeviceStatusPanel() {
  const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceId)
  const devices = useDeviceStore((s) => s.devices)
  const selectDevice = useDeviceStore((s) => s.selectDevice)

  const device = selectedDeviceId != null ? devices[selectedDeviceId] : null

  if (!device) {
    return (
      <div className="fixed right-4 top-20 w-80 bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg p-6 flex items-center justify-center">
        <span className="text-gray-500 text-sm">点击设备查看详情</span>
      </div>
    )
  }

  const statusColor = deviceStatusColor(device.isOpen, device.alarm, device.fault)

  return (
    <div className="fixed right-4 top-20 w-80 bg-[#1A1F2E]/80 backdrop-blur-md border border-[#2A3040] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3040]">
        <span className="font-semibold tracking-wider text-white">设备详情</span>
        <button onClick={() => selectDevice(null)} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Field label="设备名称" value={device.name} />
          <Field label="设备类型" value={deviceTypeName(device.type)} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">开合状态</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
              <span style={{ color: statusColor }}>{device.isOpen ? '分闸' : '合闸'}</span>
            </span>
          </div>
          <StatusField icon={<AlertTriangle className="w-3.5 h-3.5" />} label="告警状态" active={device.alarm} activeText="告警" activeColor="#f97316" />
          <StatusField icon={<Shield className="w-3.5 h-3.5" />} label="故障状态" active={device.fault} activeText="故障" activeColor="#ef4444" />
        </div>

        <div className="border-t border-[#2A3040] pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="text-sm font-semibold tracking-wider text-gray-300">三相电流</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PhaseValue label="A相" value={formatCurrent(device.currentA)} color="#ef4444" />
            <PhaseValue label="B相" value={formatCurrent(device.currentB)} color="#00E676" />
            <PhaseValue label="C相" value={formatCurrent(device.currentC)} color="#3b82f6" />
          </div>
        </div>

        <div className="border-t border-[#2A3040] pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="text-sm font-semibold tracking-wider text-gray-300">三相电压</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PhaseValue label="A相" value={formatVoltage(device.voltageA)} color="#ef4444" />
            <PhaseValue label="B相" value={formatVoltage(device.voltageB)} color="#00E676" />
            <PhaseValue label="C相" value={formatVoltage(device.voltageC)} color="#3b82f6" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono text-[#00E5FF]">{value}</span>
    </div>
  )
}

function StatusField({ icon, label, active, activeText, activeColor }: {
  icon: React.ReactNode
  label: string
  active: boolean
  activeText: string
  activeColor: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-gray-400">
        {icon}
        {label}
      </span>
      <span style={{ color: active ? activeColor : '#4b5563' }}>
        {active ? activeText : '正常'}
      </span>
    </div>
  )
}

function PhaseValue({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0A0E17] rounded px-2 py-1.5 text-center">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="font-mono text-xs" style={{ color }}>{value}</div>
    </div>
  )
}
