interface RawGeometry {
  positions: ArrayBuffer
  normals?: ArrayBuffer
  uvs?: ArrayBuffer
  indices?: ArrayBuffer
  positionCount: number
  indexCount: number
  groups: { start: number; count: number; materialIndex: number }[]
}

interface MergeRequest {
  type: 'merge'
  geometries: RawGeometry[]
  useGroups: boolean
}

interface MergeGroupRequest {
  type: 'merge-groups'
  groups: { key: string; geometries: RawGeometry[] }[]
}

interface MergedData {
  positions: ArrayBuffer
  normals?: ArrayBuffer
  uvs?: ArrayBuffer
  indices?: ArrayBuffer
  positionCount: number
  indexCount: number
  groups: { start: number; count: number; materialIndex: number }[]
}

function mergeRawGeometries(geometries: RawGeometry[], useGroups: boolean): MergedData {
  if (geometries.length === 0) {
    return { positions: new ArrayBuffer(0), positionCount: 0, indexCount: 0, groups: [] }
  }

  let totalPositions = 0
  let totalIndices = 0
  let hasNormals = true
  let hasUvs = true

  for (const geo of geometries) {
    totalPositions += geo.positionCount
    totalIndices += geo.indexCount
    if (!geo.normals) hasNormals = false
    if (!geo.uvs) hasUvs = false
  }

  const mergedPositions = new Float32Array(totalPositions * 3)
  const mergedNormals = hasNormals ? new Float32Array(totalPositions * 3) : undefined
  const mergedUvs = hasUvs ? new Float32Array(totalPositions * 2) : undefined
  const mergedIndices = totalIndices > 0 ? new Uint32Array(totalIndices) : undefined
  const mergedGroups: { start: number; count: number; materialIndex: number }[] = []

  let posOffset = 0
  let idxOffset = 0
  let vertexOffset = 0

  for (let g = 0; g < geometries.length; g++) {
    const geo = geometries[g]
    const posArr = new Float32Array(geo.positions)
    mergedPositions.set(posArr, posOffset * 3)

    if (mergedNormals && geo.normals) {
      mergedNormals.set(new Float32Array(geo.normals), posOffset * 3)
    }

    if (mergedUvs && geo.uvs) {
      mergedUvs.set(new Float32Array(geo.uvs), posOffset * 2)
    }

    if (mergedIndices && geo.indices) {
      const idxArr = new Uint32Array(geo.indices)
      for (let i = 0; i < idxArr.length; i++) {
        mergedIndices[idxOffset + i] = idxArr[i] + vertexOffset
      }
      idxOffset += idxArr.length
    }

    if (useGroups) {
      const groupOffset = geo.indices ? idxOffset - geo.indexCount : posOffset
      const groupCount = geo.indices ? geo.indexCount : geo.positionCount
      if (geo.groups.length > 0) {
        for (const group of geo.groups) {
          mergedGroups.push({
            start: group.start + (geo.indices ? idxOffset - geo.indexCount : posOffset),
            count: group.count,
            materialIndex: group.materialIndex,
          })
        }
      } else {
        mergedGroups.push({
          start: groupOffset,
          count: groupCount,
          materialIndex: g,
        })
      }
    }

    vertexOffset += geo.positionCount
    posOffset += geo.positionCount
  }

  return {
    positions: mergedPositions.buffer,
    normals: mergedNormals?.buffer,
    uvs: mergedUvs?.buffer,
    indices: mergedIndices?.buffer,
    positionCount: totalPositions,
    indexCount: totalIndices,
    groups: mergedGroups,
  }
}

self.onmessage = (event: MessageEvent<MergeRequest | MergeGroupRequest>) => {
  const msg = event.data

  if (msg.type === 'merge') {
    const result = mergeRawGeometries(msg.geometries, msg.useGroups)
    const transferList = [result.positions]
    if (result.normals) transferList.push(result.normals)
    if (result.uvs) transferList.push(result.uvs)
    if (result.indices) transferList.push(result.indices)
    ;(self as unknown as Worker).postMessage(
      { type: 'merge-result' as const, ...result },
      transferList as unknown as Transferable[]
    )
  }

  if (msg.type === 'merge-groups') {
    const results: (MergedData & { key: string })[] = []
    let totalOriginal = 0

    for (const group of msg.groups) {
      totalOriginal += group.geometries.length
      const merged = mergeRawGeometries(group.geometries, false)
      results.push({
        key: group.key,
        ...merged,
      })
    }

    const allTransfers: ArrayBuffer[] = []
    for (const r of results) {
      allTransfers.push(r.positions)
      if (r.normals) allTransfers.push(r.normals)
      if (r.uvs) allTransfers.push(r.uvs)
      if (r.indices) allTransfers.push(r.indices)
    }

    ;(self as unknown as Worker).postMessage(
      {
        type: 'merge-groups-result' as const,
        results,
        totalOriginalGeometries: totalOriginal,
        totalMergedGroups: results.length,
      },
      allTransfers as unknown as Transferable[]
    )
  }
}
