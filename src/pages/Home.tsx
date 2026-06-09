import { useEffect, useRef } from 'react'
import SubstationScene from '@/components/three/SubstationScene'
import TopNav from '@/components/ui/TopNav'
import DeviceStatusPanel from '@/components/ui/DeviceStatusPanel'
import AlertBar from '@/components/ui/AlertBar'
import PerformanceOverlay from '@/components/ui/PerformanceOverlay'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useConnectionStore } from '@/stores/connectionStore'

export default function Home() {
  useWebSocket()
  const updateFromStatus = useConnectionStore((s) => s.updateFromStatus)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function poll() {
      fetch('/api/status')
        .then((res) => res.json())
        .then((status) => updateFromStatus(status))
        .catch(() => {})
    }
    poll()
    timerRef.current = setInterval(poll, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [updateFromStatus])

  return (
    <div className="w-screen h-screen bg-[#0A0E17] flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 relative mt-14">
        <SubstationScene />
        <DeviceStatusPanel />
        <PerformanceOverlay />
      </div>
      <AlertBar />
    </div>
  )
}
