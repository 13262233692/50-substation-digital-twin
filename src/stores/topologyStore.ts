import { create } from 'zustand'
import {
  buildTopologyGraph,
  bfsEnergizedCheck,
  type TopoNode,
  type TopoEdge,
  type BFSCheckResult,
  type ConductivePath,
} from '@/utils/topologyEngine'
import type { Device } from '@/shared/types'

interface TopologyStore {
  graph: {
    nodes: Map<string, TopoNode>
    edges: TopoEdge[]
    adjacency: Map<string, string[]>
  }
  maintenanceMode: boolean
  maintenanceTarget: string | null
  bfsResult: BFSCheckResult | null
  deadlyPaths: ConductivePath[]
  showDeadlyPath: boolean

  setMaintenanceMode: (val: boolean) => void
  setMaintenanceTarget: (nodeId: string | null, devices?: Record<number, Device>) => void
  runBFS: (devices: Record<number, Device>) => void
  clearBFSResult: () => void
  setShowDeadlyPath: (val: boolean) => void
  getBusbarNodes: () => TopoNode[]
}

const initialGraph = buildTopologyGraph()

export const useTopologyStore = create<TopologyStore>((set, get) => ({
  graph: initialGraph,
  maintenanceMode: false,
  maintenanceTarget: null,
  bfsResult: null,
  deadlyPaths: [],
  showDeadlyPath: false,

  setMaintenanceMode: (val) => set({
    maintenanceMode: val,
    maintenanceTarget: null,
    bfsResult: null,
    deadlyPaths: [],
    showDeadlyPath: false,
  }),

  setMaintenanceTarget: (nodeId, devices) => {
    if (!nodeId || !devices) {
      set({
        maintenanceTarget: nodeId,
        bfsResult: null,
        deadlyPaths: [],
        showDeadlyPath: false,
      })
      return
    }

    const { graph } = get()
    const result = bfsEnergizedCheck(nodeId, graph, devices)
    const deadlyPaths = result.paths.filter((p) => p.energized)

    set({
      maintenanceTarget: nodeId,
      bfsResult: result,
      deadlyPaths,
      showDeadlyPath: deadlyPaths.length > 0,
    })
  },

  runBFS: (devices) => {
    const { graph, maintenanceTarget } = get()
    if (!maintenanceTarget) return

    const result = bfsEnergizedCheck(maintenanceTarget, graph, devices)
    const deadlyPaths = result.paths.filter((p) => p.energized)

    set({
      bfsResult: result,
      deadlyPaths,
      showDeadlyPath: deadlyPaths.length > 0,
    })
  },

  clearBFSResult: () => set({
    bfsResult: null,
    deadlyPaths: [],
    showDeadlyPath: false,
    maintenanceTarget: null,
  }),

  setShowDeadlyPath: (val) => set({ showDeadlyPath: val }),

  getBusbarNodes: () => {
    const { nodes } = get().graph
    const busbars: TopoNode[] = []
    nodes.forEach((node) => {
      if (node.type === 'busbar' as string) {
        busbars.push(node)
      }
    })
    return busbars
  },
}))
