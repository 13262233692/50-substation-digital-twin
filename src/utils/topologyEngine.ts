export enum TopoNodeType {
  Source = 'source',
  Busbar = 'busbar',
  Breaker = 'breaker',
  Disconnector = 'disconnector',
  Transformer = 'transformer',
  Ground = 'ground',
}

export interface TopoNode {
  id: string
  type: TopoNodeType
  deviceId?: number
  name: string
  position: [number, number, number]
  bayIndex: number
}

export interface TopoEdge {
  from: string
  to: string
  switchDeviceId?: number
}

export interface ConductivePath {
  nodes: string[]
  edges: TopoEdge[]
  nodePositions: [number, number, number][]
  energized: boolean
  sourceName: string
}

export interface BFSCheckResult {
  targetNodeId: string
  energized: boolean
  paths: ConductivePath[]
  dangerLevel: 'safe' | 'caution' | 'deadly'
  message: string
}

const BAY_COUNT = 8
const BRK_PER_BAY = 6
const DS_PER_BAY = 6
const TR_PER_BAY = 4

function deviceId(bay: number, type: 'brk' | 'ds' | 'tr', index: number): number {
  const bayOffset = (bay - 1) * (BRK_PER_BAY + DS_PER_BAY + TR_PER_BAY)
  if (type === 'brk') return bayOffset + index + 1
  if (type === 'ds') return bayOffset + BRK_PER_BAY + index + 1
  return bayOffset + BRK_PER_BAY + DS_PER_BAY + index + 1
}

export function buildTopologyGraph(): { nodes: Map<string, TopoNode>; edges: TopoEdge[]; adjacency: Map<string, string[]> } {
  const nodes = new Map<string, TopoNode>()
  const edges: TopoEdge[] = []
  const adjacency = new Map<string, string[]>()

  function addNode(node: TopoNode) {
    nodes.set(node.id, node)
    if (!adjacency.has(node.id)) adjacency.set(node.id, [])
  }

  function addEdge(from: string, to: string, switchDeviceId?: number) {
    edges.push({ from, to, switchDeviceId })
    adjacency.get(from)?.push(to)
    adjacency.get(to)?.push(from)
  }

  addNode({
    id: 'SOURCE-500KV',
    type: TopoNodeType.Source,
    name: '500kV高压电源侧',
    position: [-3, 8, 22],
    bayIndex: 0,
  })

  for (let bay = 1; bay <= BAY_COUNT; bay++) {
    const busbarId = `BUS-${bay}`
    addNode({
      id: busbarId,
      type: TopoNodeType.Busbar,
      name: `${bay}号母线`,
      position: [25.5, 8, bay * 5],
      bayIndex: bay,
    })

    addEdge('SOURCE-500KV', busbarId)

    for (let i = 0; i < BRK_PER_BAY; i++) {
      const brkDevId = deviceId(bay, 'brk', i)
      const brkTopoId = `BRK-${bay}-${i + 1}`
      const brkPosX = [3, 6, 9, 12, 15, 18][i]
      addNode({
        id: brkTopoId,
        type: TopoNodeType.Breaker,
        deviceId: brkDevId,
        name: `Bay-${bay}-BRK-${i + 1}`,
        position: [brkPosX, 4, bay * 5],
        bayIndex: bay,
      })

      addEdge(busbarId, brkTopoId, brkDevId)

      const dsTopoId = `DS-${bay}-${i + 1}`
      const dsDevId = deviceId(bay, 'ds', i)
      const dsPosX = [21, 24, 27, 30, 33, 36][i]
      addNode({
        id: dsTopoId,
        type: TopoNodeType.Disconnector,
        deviceId: dsDevId,
        name: `Bay-${bay}-DS-${i + 1}`,
        position: [dsPosX, 4, bay * 5],
        bayIndex: bay,
      })

      addEdge(brkTopoId, dsTopoId, dsDevId)

      if (i < TR_PER_BAY) {
        const trDevId = deviceId(bay, 'tr', i)
        const trTopoId = `TR-${bay}-${i + 1}`
        const trPosX = [39, 42, 45, 48][i]
        addNode({
          id: trTopoId,
          type: TopoNodeType.Transformer,
          deviceId: trDevId,
          name: `Bay-${bay}-TR-${i + 1}`,
          position: [trPosX, 4, bay * 5],
          bayIndex: bay,
        })

        addEdge(dsTopoId, trTopoId)

        const gndId = `GND-${bay}-${i + 1}`
        addNode({
          id: gndId,
          type: TopoNodeType.Ground,
          name: `Bay-${bay}-接地-${i + 1}`,
          position: [trPosX, 0, bay * 5],
          bayIndex: bay,
        })
        addEdge(trTopoId, gndId)
      }
    }
  }

  return { nodes, edges, adjacency }
}

export function isSwitchClosed(topoNode: TopoNode, devices: Record<number, { isOpen: boolean }>): boolean {
  if (topoNode.type === TopoNodeType.Source || topoNode.type === TopoNodeType.Busbar || topoNode.type === TopoNodeType.Ground) {
    return true
  }
  if (topoNode.type === TopoNodeType.Transformer) {
    return true
  }
  if (topoNode.deviceId != null) {
    const dev = devices[topoNode.deviceId]
    if (dev) return !dev.isOpen
  }
  return false
}

export function bfsEnergizedCheck(
  targetNodeId: string,
  graph: { nodes: Map<string, TopoNode>; edges: TopoEdge[]; adjacency: Map<string, string[]> },
  devices: Record<number, { isOpen: boolean }>,
): BFSCheckResult {
  const { nodes, edges, adjacency } = graph
  const target = nodes.get(targetNodeId)
  if (!target) {
    return {
      targetNodeId,
      energized: false,
      paths: [],
      dangerLevel: 'safe',
      message: '目标节点不存在',
    }
  }

  const visited = new Set<string>()
  const parent = new Map<string, { nodeId: string; edge: TopoEdge }>()
  const queue: string[] = [targetNodeId]
  visited.add(targetNodeId)

  let foundSource: string | null = null

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentNode = nodes.get(current)!

    if (currentNode.type === TopoNodeType.Source) {
      foundSource = current
      break
    }

    const neighbors = adjacency.get(current) || []
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue

      const neighborNode = nodes.get(neighborId)
      if (!neighborNode) continue

      const connectingEdge = edges.find(
        (e) =>
          (e.from === current && e.to === neighborId) ||
          (e.to === current && e.from === neighborId)
      )

      if (connectingEdge?.switchDeviceId != null) {
        const switchNode = nodes.get(current)!.type === TopoNodeType.Breaker || nodes.get(current)!.type === TopoNodeType.Disconnector
          ? nodes.get(current)!
          : neighborNode

        if (!isSwitchClosed(switchNode, devices)) continue
      }

      visited.add(neighborId)
      parent.set(neighborId, { nodeId: current, edge: connectingEdge! })
      queue.push(neighborId)
    }
  }

  const paths: ConductivePath[] = []

  if (foundSource) {
    const pathNodes: string[] = []
    const pathEdges: TopoEdge[] = []
    const pathPositions: [number, number, number][] = []
    let cursor: string | null = foundSource

    while (cursor) {
      pathNodes.unshift(cursor)
      const node = nodes.get(cursor)!
      pathPositions.unshift(node.position)
      const p = parent.get(cursor)
      if (p) {
        pathEdges.unshift(p.edge)
        cursor = p.nodeId
      } else {
        cursor = null
      }
    }

    paths.push({
      nodes: pathNodes,
      edges: pathEdges,
      nodePositions: pathPositions,
      energized: true,
      sourceName: nodes.get(foundSource)?.name ?? '高压电源',
    })
  }

  const energized = paths.length > 0
  const dangerLevel: BFSCheckResult['dangerLevel'] = energized ? 'deadly' : 'safe'

  let message = ''
  if (energized) {
    const sourceName = paths[0].sourceName
    const pathLen = paths[0].nodes.length
    message = `⚠ 致命危险！${target.name} 依然带电！BFS 从 "${sourceName}" 沿闭合开关逆向找到 ${pathLen} 节点导电路径。禁止检修！`
  } else {
    message = `✓ ${target.name} 已验电安全，未发现到高压电源侧的导电路径。`
  }

  return {
    targetNodeId,
    energized,
    paths,
    dangerLevel,
    message,
  }
}
