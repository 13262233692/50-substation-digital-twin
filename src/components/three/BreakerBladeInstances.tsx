import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useDeviceStore } from '@/stores/deviceStore';

const BLADE_COUNT = 128;

const vertexShader = /* glsl */ `
attribute float aOpenAngle;
varying float vAngle;

void main() {
  float angle = aOpenAngle;
  float c = cos(angle);
  float s = sin(angle);
  vec3 rotated = vec3(
    position.x * c + position.z * s,
    position.y,
    -position.x * s + position.z * c
  );
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(rotated, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  vAngle = aOpenAngle;
}
`;

const fragmentShader = /* glsl */ `
varying float vAngle;

void main() {
  float t = clamp(vAngle / 1.5708, 0.0, 1.0);
  vec3 closed = vec3(0.0, 0.902, 0.463);
  vec3 open = vec3(1.0, 0.239, 0.0);
  vec3 color = mix(closed, open, t);
  float emissive = 1.5;
  gl_FragColor = vec4(color * emissive, 1.0);
}
`;

export default function BreakerBladeInstances() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const currentAngles = useRef<Float32Array>(new Float32Array(BLADE_COUNT).fill(0));

  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.1, 3, 0.3);
    geo.translate(0, 1.5, 0);
    geo.setAttribute(
      'aOpenAngle',
      new THREE.InstancedBufferAttribute(new Float32Array(BLADE_COUNT), 1)
    );
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    []
  );

  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const devices = useDeviceStore.getState().devices;
    for (let i = 0; i < BLADE_COUNT; i++) {
      const dev = devices[i + 1];
      if (dev) {
        dummy.position.set(dev.position[0], 1, dev.position[2] * 5);
      } else {
        dummy.position.set(0, -100, 0);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const attr = meshRef.current.geometry.getAttribute(
      'aOpenAngle'
    ) as THREE.InstancedBufferAttribute;
    const devices = useDeviceStore.getState().devices;

    for (let i = 0; i < BLADE_COUNT; i++) {
      const dev = devices[i + 1];
      const target = dev?.isOpen ? Math.PI / 2 : 0;
      const current = currentAngles.current[i];
      const next = THREE.MathUtils.lerp(current, target, Math.min(delta * 5, 1));
      currentAngles.current[i] = next;
      attr.setX(i, next);
    }
    attr.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, BLADE_COUNT]} />
  );
}
