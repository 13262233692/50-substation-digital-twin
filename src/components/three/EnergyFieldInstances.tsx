import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useDeviceStore } from '@/stores/deviceStore';

const MAX_INSTANCES = 128;

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vViewPos;
varying vec3 vViewNormal;

void main() {
  float pulse = 1.0 + 0.12 * sin(uTime * 2.5);
  vec3 scaled = position * pulse;
  vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(scaled, 1.0);
  gl_Position = projectionMatrix * mvPos;
  vViewPos = mvPos.xyz;
  vViewNormal = normalMatrix * normal;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
varying vec3 vViewPos;
varying vec3 vViewNormal;

void main() {
  vec3 viewDir = normalize(-vViewPos);
  float fresnel = pow(1.0 - abs(dot(normalize(vViewNormal), viewDir)), 2.0);
  float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
  vec3 color = vec3(0.0, 0.898, 1.0);
  float alpha = fresnel * pulse * 0.7;
  gl_FragColor = vec4(color * 2.5, alpha);
}
`;

export default function EnergyFieldInstances() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    uniforms.uTime.value = state.clock.elapsedTime;

    const devices = useDeviceStore.getState().devices;
    const dummy = new THREE.Object3D();
    let count = 0;

    for (let i = 1; i <= 128 && count < MAX_INSTANCES; i++) {
      const dev = devices[i];
      if (!dev || dev.isOpen) continue;

      dummy.position.set(dev.position[0], 3, dev.position[2] * 5);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(count, dummy.matrix);
      count++;
    }

    for (let i = count; i < MAX_INSTANCES; i++) {
      dummy.position.set(0, -100, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, material, MAX_INSTANCES]}>
      <sphereGeometry args={[0.5, 16, 16]} />
    </instancedMesh>
  );
}
