import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDeviceStore } from '@/stores/deviceStore';

const INSTANCE_COUNT = 300;

export default function SwitchCoverInstances() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const devices = useDeviceStore((s) => s.devices);

  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const devList = Object.values(devices);

    for (const dev of devList) {
      if (dev.type === 0 || dev.type === 1) {
        pos.push(new THREE.Vector3(dev.position[0], 1.2, dev.position[2] * 5));
        pos.push(new THREE.Vector3(dev.position[0], 4.2, dev.position[2] * 5));
        pos.push(new THREE.Vector3(dev.position[0], 7.2, dev.position[2] * 5));
      }
      if (pos.length >= INSTANCE_COUNT) break;
    }

    return pos.slice(0, INSTANCE_COUNT);
  }, [devices]);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const p = positions[i] ?? new THREE.Vector3(0, -100, 0);
      dummy.position.copy(p);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, INSTANCE_COUNT]}>
      <boxGeometry args={[1.2, 0.8, 0.6]} />
      <meshStandardMaterial color="#2d3748" roughness={0.5} metalness={0.4} />
    </instancedMesh>
  );
}
