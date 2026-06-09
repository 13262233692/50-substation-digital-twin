import { useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import {
  mergeGLTFModel,
  buildMergedScene,
  type MergeProgress,
  type MergeResult,
} from '@/utils/gltfMergePipeline'

interface UseMergedModelReturn {
  scene: THREE.Group | null
  progress: MergeProgress | null
  result: MergeResult | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useMergedModel(url: string | null, useWorker: boolean = true): UseMergedModelReturn {
  const [scene, setScene] = useState<THREE.Group | null>(null)
  const [progress, setProgress] = useState<MergeProgress | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef(false)

  const reload = useCallback(() => {
    abortRef.current = true
    setReloadToken((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!url) {
      setScene(null)
      setProgress(null)
      setResult(null)
      setLoading(false)
      setError(null)
      return
    }

    abortRef.current = false
    setLoading(true)
    setError(null)
    setScene(null)
    setResult(null)

    let disposed = false

    const load = async () => {
      try {
        const mergeResult = await mergeGLTFModel(url, (p) => {
          if (disposed) return
          setProgress(p)
        }, useWorker)

        if (disposed) return

        const mergedScene = buildMergedScene(mergeResult)

        if (disposed) {
          mergedScene.traverse((child) => {
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
          return
        }

        setScene(mergedScene)
        setResult(mergeResult)
        setLoading(false)
      } catch (err) {
        if (disposed) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    }

    load()

    return () => {
      disposed = true
    }
  }, [url, useWorker, reloadToken])

  return { scene, progress, result, loading, error, reload }
}
