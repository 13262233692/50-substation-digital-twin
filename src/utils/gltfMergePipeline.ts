import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

interface RawGeometry {
  positions: ArrayBuffer
  normals?: ArrayBuffer
  uvs?: ArrayBuffer
  indices?: ArrayBuffer
  positionCount: number
  indexCount: number
  groups: { start: number; count: number; materialIndex: number }[]
}

interface MergedGroup {
  key: string
  geometry: THREE.BufferGeometry
  material: THREE.Material
  originalCount: number
}

export interface MergeResult {
  mergedGroups: MergedGroup[]
  totalOriginalMeshes: number
  totalMergedMeshes: number
  drawCallReduction: number
}

interface MaterialKey {
  color: string
  map: string
  type: string
  roughness: number
  metalness: number
  emissive: string
  transparent: boolean
  opacity: number
  side: number
}

function getMaterialKey(mat: THREE.Material): string {
  const keys: Partial<MaterialKey> = {
    type: mat.type,
    transparent: mat.transparent,
    opacity: mat.opacity,
    side: mat.side,
  }

  if (mat instanceof THREE.MeshStandardMaterial) {
    keys.color = '#' + mat.color.getHexString()
    keys.roughness = mat.roughness
    keys.metalness = mat.metalness
    keys.emissive = '#' + mat.emissive.getHexString()
    keys.map = mat.map?.uuid ?? 'none'
  } else if (mat instanceof THREE.MeshBasicMaterial) {
    keys.color = '#' + mat.color.getHexString()
    keys.map = mat.map?.uuid ?? 'none'
  } else if (mat instanceof THREE.MeshPhongMaterial) {
    keys.color = '#' + mat.color.getHexString()
    keys.emissive = '#' + mat.emissive.getHexString()
    keys.map = mat.map?.uuid ?? 'none'
  }

  return JSON.stringify(keys)
}

function extractRawGeometry(geo: THREE.BufferGeometry, worldMatrix: THREE.Matrix4): RawGeometry {
  const cloned = geo.clone()
  cloned.applyMatrix4(worldMatrix)

  const posAttr = cloned.getAttribute('position') as THREE.BufferAttribute
  const positions = new Float32Array(posAttr.array.length)
  positions.set(posAttr.array as Float32Array)

  let normals: ArrayBuffer | undefined
  const normAttr = cloned.getAttribute('normal') as THREE.BufferAttribute | null
  if (normAttr) {
    const n = new Float32Array(normAttr.array.length)
    n.set(normAttr.array as Float32Array)
    normals = n.buffer
  }

  let uvs: ArrayBuffer | undefined
  const uvAttr = cloned.getAttribute('uv') as THREE.BufferAttribute | null
  if (uvAttr) {
    const u = new Float32Array(uvAttr.array.length)
    u.set(uvAttr.array as Float32Array)
    uvs = u.buffer
  }

  let indices: ArrayBuffer | undefined
  let indexCount = 0
  const idxAttr = cloned.getIndex()
  if (idxAttr) {
    const idx = new Uint32Array(idxAttr.count)
    for (let i = 0; i < idxAttr.count; i++) {
      idx[i] = idxAttr.getX(i)
    }
    indices = idx.buffer
    indexCount = idxAttr.count
  }

  const groups = cloned.groups.map((g) => ({ start: g.start, count: g.count, materialIndex: g.materialIndex ?? 0 }))

  cloned.dispose()

  return {
    positions: positions.buffer,
    normals,
    uvs,
    indices,
    positionCount: posAttr.count,
    indexCount,
    groups,
  }
}

function loadGLTF(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject
    )
  })
}

function collectMeshes(scene: THREE.Group): { mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }[] {
  const meshes: { mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }[] = []
  scene.updateMatrixWorld(true)
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      meshes.push({ mesh, worldMatrix: mesh.matrixWorld.clone() })
    }
  })
  return meshes
}

function groupByMaterial(
  meshes: { mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }[]
): Map<string, { material: THREE.Material; rawGeometries: RawGeometry[] }> {
  const groups = new Map<string, { material: THREE.Material; rawGeometries: RawGeometry[] }>()

  for (const { mesh, worldMatrix } of meshes) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

    for (const mat of materials) {
      const key = getMaterialKey(mat)

      if (!groups.has(key)) {
        groups.set(key, { material: mat.clone(), rawGeometries: [] })
      }

      const group = groups.get(key)!
      const raw = extractRawGeometry(mesh.geometry, worldMatrix)
      group.rawGeometries.push(raw)
    }
  }

  return groups
}

function reconstructGeometry(raw: RawGeometry): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(raw.positions), 3))

  if (raw.normals) {
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(raw.normals), 3))
  }

  if (raw.uvs) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(raw.uvs), 2))
  }

  if (raw.indices) {
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(raw.indices), 1))
  }

  if (raw.groups.length > 0) {
    for (const group of raw.groups) {
      geo.addGroup(group.start, group.count, group.materialIndex)
    }
  }

  return geo
}

function mergeGroupInWorker(
  worker: Worker,
  geometries: RawGeometry[]
): Promise<RawGeometry> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'merge-result') {
        worker.removeEventListener('message', handler)
        resolve(e.data as RawGeometry)
      }
    }
    worker.addEventListener('message', handler)

    const transferList: ArrayBuffer[] = []
    for (const g of geometries) {
      transferList.push(g.positions)
      if (g.normals) transferList.push(g.normals)
      if (g.uvs) transferList.push(g.uvs)
      if (g.indices) transferList.push(g.indices)
    }

    worker.postMessage(
      { type: 'merge', geometries, useGroups: false },
      transferList
    )
  })
}

async function mergeGroupLocal(geometries: THREE.BufferGeometry[]): Promise<THREE.BufferGeometry | null> {
  if (geometries.length === 0) return null
  if (geometries.length === 1) return geometries[0]

  const merged = mergeGeometries(geometries, false)
  for (const g of geometries) {
    g.dispose()
  }
  return merged
}

export interface MergeProgress {
  phase: 'loading' | 'extracting' | 'merging' | 'building'
  current: number
  total: number
  message: string
}

export async function mergeGLTFModel(
  url: string,
  onProgress?: (progress: MergeProgress) => void,
  useWorker: boolean = true
): Promise<MergeResult> {
  onProgress?.({ phase: 'loading', current: 0, total: 1, message: '加载 GLTF 模型...' })
  const scene = await loadGLTF(url)
  onProgress?.({ phase: 'loading', current: 1, total: 1, message: '模型加载完成' })

  onProgress?.({ phase: 'extracting', current: 0, total: 1, message: '遍历场景节点...' })
  const meshEntries = collectMeshes(scene)
  const totalOriginalMeshes = meshEntries.length
  onProgress?.({ phase: 'extracting', current: 1, total: 1, message: `发现 ${totalOriginalMeshes} 个独立 Mesh` })

  onProgress?.({ phase: 'extracting', current: 0, total: meshEntries.length, message: '按材质分组提取几何数据...' })
  const materialGroups = groupByMaterial(meshEntries)
  onProgress?.({
    phase: 'extracting',
    current: meshEntries.length,
    total: meshEntries.length,
    message: `分为 ${materialGroups.size} 个材质组`,
  })

  let worker: Worker | null = null
  if (useWorker && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(
        new URL('../workers/geometryMergeWorker.ts', import.meta.url),
        { type: 'module' }
      )
    } catch {
      worker = null
    }
  }

  const mergedGroups: MergedGroup[] = []
  let groupIndex = 0
  const groupEntries = Array.from(materialGroups.entries())

  for (const [key, group] of groupEntries) {
    groupIndex++
    onProgress?.({
      phase: 'merging',
      current: groupIndex,
      total: groupEntries.length,
      message: `合并材质组 ${groupIndex}/${groupEntries.length} (${group.rawGeometries.length} 个几何体)`,
    })

    let finalGeometry: THREE.BufferGeometry

    if (worker) {
      try {
        const mergedRaw = await mergeGroupInWorker(worker, group.rawGeometries)
        finalGeometry = reconstructGeometry(mergedRaw)
      } catch {
        const geos = group.rawGeometries.map((raw) => reconstructGeometry(raw))
        const merged = await mergeGroupLocal(geos)
        finalGeometry = merged ?? new THREE.BufferGeometry()
      }
    } else {
      const geos = group.rawGeometries.map((raw) => reconstructGeometry(raw))
      const merged = await mergeGroupLocal(geos)
      finalGeometry = merged ?? new THREE.BufferGeometry()
    }

    finalGeometry.computeBoundingSphere()

    mergedGroups.push({
      key,
      geometry: finalGeometry,
      material: group.material,
      originalCount: group.rawGeometries.length,
    })
  }

  if (worker) {
    worker.terminate()
  }

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  })

  const totalMergedMeshes = mergedGroups.length
  const drawCallReduction = totalOriginalMeshes > 0
    ? Math.round((1 - totalMergedMeshes / totalOriginalMeshes) * 100)
    : 0

  onProgress?.({
    phase: 'building',
    current: 1,
    total: 1,
    message: `合并完成: ${totalOriginalMeshes} → ${totalMergedMeshes} DrawCall (减少 ${drawCallReduction}%)`,
  })

  return {
    mergedGroups,
    totalOriginalMeshes,
    totalMergedMeshes,
    drawCallReduction,
  }
}

export function buildMergedScene(result: MergeResult): THREE.Group {
  const group = new THREE.Group()

  for (const merged of result.mergedGroups) {
    const mesh = new THREE.Mesh(merged.geometry, merged.material)
    group.add(mesh)
  }

  return group
}
