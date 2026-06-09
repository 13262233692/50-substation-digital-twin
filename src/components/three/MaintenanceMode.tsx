import { useRef, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTopologyStore } from '@/stores/topologyStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { TopoNodeType } from '@/utils/topologyEngine'
import type { TopoNode } from '@/utils/topologyEngine'

const BUSBAR_Y = 8

function BusbarClickTarget({ node }: { node: TopoNode }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const setMaintenanceTarget = useTopologyStore((s) => s.setMaintenanceTarget)
  const maintenanceMode = useTopologyStore((s) => s.maintenanceMode)
  const maintenanceTarget = useTopologyStore((s) => s.maintenanceTarget)
  const devices = useDeviceStore((s) => s.devices)

  const isSelected = maintenanceTarget === node.id

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    if (isSelected) {
      mat.opacity = 0.3 + 0.15 * Math.sin(state.clock.elapsedTime * 5)
    } else if (maintenanceMode) {
      mat.opacity = 0.08
    } else {
      mat.opacity = 0.0
    }
  })

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    if (!maintenanceMode) return
    e.stopPropagation()
    setMaintenanceTarget(node.id, devices)
  }, [maintenanceMode, node.id, setMaintenanceTarget, devices])

  return (
    <mesh
      ref={meshRef}
      position={[25.5, BUSBAR_Y, node.position[2]]}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = maintenanceMode ? 'pointer' : 'default'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={[54, 1.5, 1.5]} />
      <meshBasicMaterial
        color={isSelected ? '#FF3D00' : '#00E5FF'}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

function SourceIndicator() {
  const maintenanceMode = useTopologyStore((s) => s.maintenanceMode)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = maintenanceMode ? 0.3 + 0.1 * Math.sin(state.clock.elapsedTime * 3) : 0.0
  })

  return (
    <mesh ref={meshRef} position={[-3, 8, 22]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="#FF3D00" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function LiveBFSRefresh() {
  const maintenanceTarget = useTopologyStore((s) => s.maintenanceTarget)
  const maintenanceMode = useTopologyStore((s) => s.maintenanceMode)
  const devices = useDeviceStore((s) => s.devices)
  const runBFS = useTopologyStore((s) => s.runBFS)

  useEffect(() => {
    if (!maintenanceMode || !maintenanceTarget) return
    runBFS(devices)
  }, [devices, maintenanceMode, maintenanceTarget, runBFS])

  return null
}

export default function MaintenanceMode() {
  const maintenanceMode = useTopologyStore((s) => s.maintenanceMode)
  const graph = useTopologyStore((s) => s.graph)

  if (!maintenanceMode) return null

  const busbarNodes: TopoNode[] = []
  graph.nodes.forEach((node) => {
    if (node.type === TopoNodeType.Busbar) {
      busbarNodes.push(node)
    }
  })

  return (
    <group>
      <SourceIndicator />
      <LiveBFSRefresh />
      {busbarNodes.map((node) => (
        <BusbarClickTarget key={node.id} node={node} />
      ))}
    </group>
  )
}
