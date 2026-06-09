import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDeviceStore } from '@/stores/deviceStore';

const INSTANCE_COUNT = 500;

export default function InsulatorInstances() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const devices = useDeviceStore((s) => s.devices);

  const geometry = useMemo(() => {
    const seg = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8);
    const seg2 = seg.clone();
    seg2.translate(0, 0.85, 0);
    const seg3 = seg.clone();
    seg3.translate(0, 1.7, 0);

    const positions = Float32Array.from([
      ...seg.getAttribute('position').array,
      ...seg2.getAttribute('position').array,
      ...seg3.getAttribute('position').array,
    ]);
    const normals = Float32Array.from([
      ...seg.getAttribute('normal').array,
      ...seg2.getAttribute('normal').array,
      ...seg3.getAttribute('normal').array,
    ]);

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setIndex([
      ...(seg.getIndex()?.array ?? []),
      ...(seg2.getIndex()?.array ?? []).map((i) => i + seg.getAttribute('position').count),
      ...(seg3.getIndex()?.array ?? []).map((i) => i + seg.getAttribute('position').count * 2),
    ]);
    return merged;
  }, []);

  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const devList = Object.values(devices);

    for (const dev of devList) {
      pos.push(new THREE.Vector3(dev.position[0], 5, dev.position[2] * 5));
      pos.push(new THREE.Vector3(dev.position[0], 2, dev.position[2] * 5));
      if (pos.length >= INSTANCE_COUNT) break;
    }

    for (let x = 3; x <= 48 && pos.length < INSTANCE_COUNT; x += 3) {
      for (let z = 5; z <= 40 && pos.length < INSTANCE_COUNT; z += 10) {
        pos.push(new THREE.Vector3(x, 8, z));
      }
    }

    return pos;
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
    <instancedMesh ref={meshRef} args={[geometry, undefined, INSTANCE_COUNT]}>
      <meshStandardMaterial color="#4a5568" roughness={0.6} metalness={0.3} />
    </instancedMesh>
  );
}
