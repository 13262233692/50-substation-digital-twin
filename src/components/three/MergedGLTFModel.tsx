import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useMergedModel } from '@/hooks/useMergedModel'
import SubstationModel from './SubstationModel'

const GLTF_MODEL_URL = '/models/substation.glb'

function MergeStatsOverlay({ result }: { result: { totalOriginalMeshes: number; totalMergedMeshes: number; drawCallReduction: number } | null }) {
  if (!result) return null
  return null
}

export default function MergedGLTFModel() {
  const { scene, progress, result, loading, error } = useMergedModel(GLTF_MODEL_URL, true)

  if (loading) {
    return <SubstationModel />
  }

  if (error || !scene) {
    return <SubstationModel />
  }

  return (
    <group>
      <primitive object={scene} />
      <MergeStatsOverlay result={result} />
    </group>
  )
}
