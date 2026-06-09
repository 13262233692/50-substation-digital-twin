import { Shield, Zap, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useTopologyStore } from '@/stores/topologyStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { TopoNodeType } from '@/utils/topologyEngine'
import type { TopoNode } from '@/utils/topologyEngine'

export default function MaintenancePanel() {
  const maintenanceMode = useTopologyStore((s) => s.maintenanceMode)
  const setMaintenanceMode = useTopologyStore((s) => s.setMaintenanceMode)
  const maintenanceTarget = useTopologyStore((s) => s.maintenanceTarget)
  const bfsResult = useTopologyStore((s) => s.bfsResult)
  const graph = useTopologyStore((s) => s.graph)
  const devices = useDeviceStore((s) => s.devices)
  const setMaintenanceTarget = useTopologyStore((s) => s.setMaintenanceTarget)
  const clearBFSResult = useTopologyStore((s) => s.clearBFSResult)

  if (!maintenanceMode) return null

  const busbarNodes: TopoNode[] = []
  graph.nodes.forEach((node) => {
    if (node.type === TopoNodeType.Busbar) {
      busbarNodes.push(node)
    }
  })

  const targetNode = maintenanceTarget ? graph.nodes.get(maintenanceTarget) : null

  return (
    <div className="fixed left-4 top-20 w-80 bg-[#1A1F2E]/90 backdrop-blur-md border border-[#2A3040] rounded-lg overflow-hidden z-30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3040] bg-[#FF3D00]/10">
        <span className="flex items-center gap-2 font-semibold tracking-wider text-[#FF3D00]">
          <Shield className="w-4 h-4" />
          模拟检修模式
        </span>
        <button
          onClick={() => { setMaintenanceMode(false); clearBFSResult() }}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xs text-gray-400 leading-relaxed">
          选择要检修的母线段，系统将沿闭合开关逆向 BFS 搜索导电路径，检测是否带电。
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 font-semibold tracking-wider">选择母线段</div>
          <div className="grid grid-cols-4 gap-1.5">
            {busbarNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setMaintenanceTarget(node.id, devices)}
                className={`px-2 py-1.5 text-xs font-mono rounded border transition-all ${
                  maintenanceTarget === node.id
                    ? 'bg-[#FF3D00]/20 border-[#FF3D00] text-[#FF3D00]'
                    : 'bg-[#0A0E17] border-[#2A3040] text-gray-400 hover:border-[#00E5FF] hover:text-[#00E5FF]'
                }`}
              >
                {node.name}
              </button>
            ))}
          </div>
        </div>

        {bfsResult && (
          <div className={`rounded border p-3 space-y-2 ${
            bfsResult.dangerLevel === 'deadly'
              ? 'bg-[#FF3D00]/10 border-[#FF3D00]'
              : 'bg-[#00E676]/10 border-[#00E676]'
          }`}>
            <div className="flex items-center gap-2">
              {bfsResult.energized ? (
                <AlertTriangle className="w-4 h-4 text-[#FF3D00]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
              )}
              <span className={`text-sm font-semibold ${
                bfsResult.energized ? 'text-[#FF3D00]' : 'text-[#00E676]'
              }`}>
                {bfsResult.energized ? '致命危险 - 依然带电!' : '验电安全'}
              </span>
            </div>

            <div className="text-xs text-gray-300 leading-relaxed">
              {bfsResult.message}
            </div>

            {bfsResult.energized && bfsResult.paths.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Zap className="w-3 h-3 text-[#FF3D00]" />
                  导电路径 (BFS逆向追踪)
                </div>
                {bfsResult.paths.map((path, i) => (
                  <div key={i} className="bg-[#0A0E17] rounded px-2 py-1.5 text-xs font-mono text-[#FF3D00]/80 leading-relaxed">
                    {path.nodes.map((nodeId, j) => {
                      const n = graph.nodes.get(nodeId)
                      return (
                        <span key={j}>
                          {j > 0 && <span className="text-gray-600"> → </span>}
                          <span className={n?.type === TopoNodeType.Source ? 'text-[#FF3D00] font-semibold' : ''}>
                            {n?.name ?? nodeId}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
