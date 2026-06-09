import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDeviceStore } from '@/stores/deviceStore';

const POST_COUNT = 64;
const BEAM_COUNT = 48;
const TANK_COUNT = 32;
const PAD_COUNT = 128;

function SteelInstances() {
  const postRef = useRef<THREE.InstancedMesh>(null);
  const beamRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    let pi = 0;

    for (let z = 1; z <= 8; z++) {
      for (const x of [0, 24, 51]) {
        if (pi >= POST_COUNT) break;
        dummy.position.set(x, 4, z * 5);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postRef.current?.setMatrixAt(pi++, dummy.matrix);
      }
    }
    for (let i = pi; i < POST_COUNT; i++) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      postRef.current?.setMatrixAt(i, dummy.matrix);
    }
    postRef.current!.instanceMatrix.needsUpdate = true;

    let bi = 0;
    for (let z = 1; z <= 8; z++) {
      for (const y of [4, 8]) {
        for (const [ax, bx] of [[0, 24], [24, 51]]) {
          if (bi >= BEAM_COUNT) break;
          const mx = (ax + bx) / 2;
          dummy.position.set(mx, y, z * 5);
          dummy.scale.set(bx - ax, 1, 1);
          dummy.updateMatrix();
          beamRef.current?.setMatrixAt(bi++, dummy.matrix);
        }
      }
    }
    for (let i = bi; i < BEAM_COUNT; i++) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      beamRef.current?.setMatrixAt(i, dummy.matrix);
    }
    beamRef.current!.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh ref={postRef} args={[undefined, undefined, POST_COUNT]}>
        <cylinderGeometry args={[0.2, 0.2, 8, 6]} />
        <meshStandardMaterial color="#3a4a5c" roughness={0.7} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={beamRef} args={[undefined, undefined, BEAM_COUNT]}>
        <boxGeometry args={[1, 0.3, 0.3]} />
        <meshStandardMaterial color="#3a4a5c" roughness={0.7} metalness={0.6} />
      </instancedMesh>
    </>
  );
}

function TransformerTanks() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const devices = useDeviceStore((s) => s.devices);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (const dev of Object.values(devices)) {
      if (dev.type !== 2) continue;
      if (i >= TANK_COUNT) break;
      dummy.position.set(dev.position[0], 2, dev.position[2] * 5);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i++, dummy.matrix);
    }
    for (; i < TANK_COUNT; i++) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [devices]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TANK_COUNT]}>
      <boxGeometry args={[3, 4, 2.5]} />
      <meshStandardMaterial color="#1a2a3a" roughness={0.5} metalness={0.7} />
    </instancedMesh>
  );
}

function FoundationPads() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const devices = useDeviceStore((s) => s.devices);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (const dev of Object.values(devices)) {
      if (i >= PAD_COUNT) break;
      dummy.position.set(dev.position[0], 0.15, dev.position[2] * 5);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i++, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [devices]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PAD_COUNT]}>
      <boxGeometry args={[2, 0.3, 1.5]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}

function BusBars() {
  const bars = useMemo(
    () => [
      { pos: [25.5, 8, 10] as [number, number, number], len: 51 },
      { pos: [25.5, 8, 25] as [number, number, number], len: 51 },
      { pos: [25.5, 8, 40] as [number, number, number], len: 51 },
    ],
    []
  );

  return (
    <>
      {bars.map((bar, i) => (
        <mesh key={i} position={bar.pos} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, bar.len, 8]} />
          <meshStandardMaterial color="#CC8800" roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
    </>
  );
}

export default function SubstationModel() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, 0, 22]}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#0d1117" roughness={1} metalness={0} />
      </mesh>
      <BusBars />
      <SteelInstances />
      <TransformerTanks />
      <FoundationPads />
    </group>
  );
}
