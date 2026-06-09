import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useDeviceStore } from '@/stores/deviceStore'

export default function SubstationModel() {
  const devices = useDeviceStore((s) => s.devices)
  const devList = useMemo(() => Object.values(devices), [devices])

  const { mergedStructGeo, groundGeo, busGeo } = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()

    const padGeo = new THREE.BoxGeometry(2, 0.3, 1.5)
    for (const dev of devList) {
      dummy.position.set(dev.position[0], 0.15, dev.position[2] * 5)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      const cloned = padGeo.clone()
      cloned.applyMatrix4(dummy.matrix)
      geos.push(cloned)
    }
    padGeo.dispose()

    const postGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 6)
    for (let z = 1; z <= 8; z++) {
      for (const x of [0, 24, 51]) {
        dummy.position.set(x, 4, z * 5)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        const cloned = postGeo.clone()
        cloned.applyMatrix4(dummy.matrix)
        geos.push(cloned)
      }
    }
    postGeo.dispose()

    const beamGeo = new THREE.BoxGeometry(1, 0.3, 0.3)
    for (let z = 1; z <= 8; z++) {
      for (const y of [4, 8]) {
        for (const [ax, bx] of [[0, 24], [24, 51]] as [number, number][]) {
          const mx = (ax + bx) / 2
          dummy.position.set(mx, y, z * 5)
          dummy.scale.set(bx - ax, 1, 1)
          dummy.updateMatrix()
          const cloned = beamGeo.clone()
          cloned.applyMatrix4(dummy.matrix)
          geos.push(cloned)
        }
      }
    }
    beamGeo.dispose()

    const tankGeo = new THREE.BoxGeometry(3, 4, 2.5)
    for (const dev of devList) {
      if (dev.type !== 2) continue
      dummy.position.set(dev.position[0], 2, dev.position[2] * 5)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      const cloned = tankGeo.clone()
      cloned.applyMatrix4(dummy.matrix)
      geos.push(cloned)
    }
    tankGeo.dispose()

    const mergedStructGeo = mergeGeometries(geos, false)
    for (const g of geos) g.dispose()

    const groundGeo = new THREE.PlaneGeometry(80, 60)
    groundGeo.rotateX(-Math.PI / 2)

    const busParts: THREE.BufferGeometry[] = []
    const busGeo = new THREE.CylinderGeometry(0.15, 0.15, 51, 8)
    busGeo.rotateZ(Math.PI / 2)
    for (const z of [10, 25, 40]) {
      dummy.position.set(25.5, 8, z)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      const cloned = busGeo.clone()
      cloned.applyMatrix4(dummy.matrix)
      busParts.push(cloned)
    }
    busGeo.dispose()
    const busGeoMerged = mergeGeometries(busParts, false)
    for (const g of busParts) g.dispose()

    return {
      mergedStructGeo: mergedStructGeo ?? new THREE.BufferGeometry(),
      groundGeo,
      busGeo: busGeoMerged ?? new THREE.BufferGeometry(),
    }
  }, [devList])

  const steelMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3a4a5c', roughness: 0.7, metalness: 0.6 }),
    []
  )

  const groundMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0d1117', roughness: 1, metalness: 0 }),
    []
  )

  const copperMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#CC8800', roughness: 0.3, metalness: 0.8 }),
    []
  )

  return (
    <group>
      <mesh geometry={groundGeo} material={groundMaterial} position={[25, 0, 22]} />
      <mesh geometry={mergedStructGeo} material={steelMaterial} />
      <mesh geometry={busGeo} material={copperMaterial} />
    </group>
  )
}
