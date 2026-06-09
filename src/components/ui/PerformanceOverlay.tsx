import { useEffect, useState } from 'react'
import { useDeviceStore } from '@/stores/deviceStore'

interface PerfStats {
  fps: number
  drawCalls: number
  triangles: number
  geometries: number
}

export default function PerformanceOverlay() {
  const [stats, setStats] = useState<PerfStats>({ fps: 0, drawCalls: 0, triangles: 0, geometries: 0 })
  const connected = useDeviceStore((s) => s.connected)

  useEffect(() => {
    let animId: number
    let frameCount = 0
    let lastTime = performance.now()

    function measure() {
      frameCount++
      const now = performance.now()

      if (now - lastTime >= 1000) {
        const canvas = document.querySelector('canvas')
        const renderer = (canvas as unknown as { __r3f?: { root: { gl: { info: { render: { calls: number; triangles: number }; memory: { geometries: number } } } } } })?.__r3f
        const glInfo = renderer?.root?.gl?.info

        setStats({
          fps: Math.round(frameCount * 1000 / (now - lastTime)),
          drawCalls: glInfo?.render?.calls ?? 0,
          triangles: glInfo?.render?.triangles ?? 0,
          geometries: glInfo?.memory?.geometries ?? 0,
        })

        frameCount = 0
        lastTime = now
      }

      animId = requestAnimationFrame(measure)
    }

    animId = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(animId)
  }, [])

  const fpsColor = stats.fps >= 50 ? '#00E676' : stats.fps >= 30 ? '#f97316' : '#FF3D00'

  return (
    <div className="fixed left-4 bottom-12 z-40 glass-panel px-4 py-3 text-xs font-mono space-y-1.5 min-w-[200px]">
      <div className="flex items-center justify-between">
        <span className="text-gray-500">FPS</span>
        <span style={{ color: fpsColor }} className="text-glow font-semibold">{stats.fps}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Draw Calls</span>
        <span className="text-[#00E5FF]">{stats.drawCalls}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Triangles</span>
        <span className="text-[#00E5FF]">{stats.triangles.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Geometries</span>
        <span className="text-[#00E5FF]">{stats.geometries}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">WebSocket</span>
        <span style={{ color: connected ? '#00E676' : '#FF3D00' }}>{connected ? '已连接' : '已断开'}</span>
      </div>
      <div className="w-full h-px bg-[#2A3040]" />
      <div className="text-gray-600 text-[10px] leading-relaxed">
        <div>BufferGeometry 合并: Worker 线程</div>
        <div>InstancedMesh: 928 批次</div>
        <div>Shader 刀闸: 128 实例</div>
        <div>辉光: UnrealBloomPass</div>
      </div>
    </div>
  )
}
