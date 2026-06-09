import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTopologyStore } from '@/stores/topologyStore'
import type { ConductivePath } from '@/utils/topologyEngine'

const PARTICLE_COUNT_PER_PATH = 300
const MAX_PATHS = 4

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
attribute float aOffset;
attribute float aSize;
varying float vAlpha;
varying float vOffset;

void main() {
  float t = fract(aOffset + uTime * 0.8);
  vOffset = t;
  vAlpha = sin(t * 3.14159) * uIntensity;

  vec3 pos = position;
  pos.x += sin(uTime * 15.0 + aOffset * 20.0) * 0.15;
  pos.y += cos(uTime * 12.0 + aOffset * 25.0) * 0.1;
  pos.z += sin(uTime * 18.0 + aOffset * 30.0) * 0.15;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;
  gl_PointSize = aSize * (80.0 / -mvPos.z) * (0.5 + vAlpha * 0.5);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
varying float vAlpha;
varying float vOffset;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  float glow = 1.0 - dist * 2.0;
  glow = pow(glow, 1.5);

  vec3 coreColor = vec3(1.0, 0.1, 0.0);
  vec3 edgeColor = vec3(1.0, 0.5, 0.0);
  vec3 color = mix(edgeColor, coreColor, glow);

  float flicker = 0.7 + 0.3 * sin(uTime * 25.0 + vOffset * 40.0);
  float alpha = glow * vAlpha * flicker;

  gl_FragColor = vec4(color * 3.0, alpha);
}
`

function interpolatePath(positions: [number, number, number][]): [number, number, number][] {
  const result: [number, number, number][] = []
  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i]
    const to = positions[i + 1]
    const segments = 20
    for (let s = 0; s < segments; s++) {
      const t = s / segments
      result.push([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        from[2] + (to[2] - from[2]) * t,
      ])
    }
  }
  if (positions.length > 0) {
    result.push(positions[positions.length - 1])
  }
  return result
}

function PathParticles({ path }: { path: ConductivePath }) {
  const meshRef = useRef<THREE.Points>(null)
  const smoothPositions = useMemo(() => interpolatePath(path.nodePositions), [path.nodePositions])
  const count = smoothPositions.length

  const { geometry, uniforms } = useMemo(() => {
    const totalParticles = count * PARTICLE_COUNT_PER_PATH
    const positions = new Float32Array(totalParticles * 3)
    const offsets = new Float32Array(totalParticles)
    const sizes = new Float32Array(totalParticles)

    for (let i = 0; i < count; i++) {
      for (let p = 0; p < PARTICLE_COUNT_PER_PATH; p++) {
        const idx = i * PARTICLE_COUNT_PER_PATH + p
        const [x, y, z] = smoothPositions[i]
        positions[idx * 3] = x + (Math.random() - 0.5) * 0.3
        positions[idx * 3 + 1] = y + (Math.random() - 0.5) * 0.3
        positions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.3
        offsets[idx] = i / count + (p / PARTICLE_COUNT_PER_PATH) / count
        sizes[idx] = 0.3 + Math.random() * 0.4
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    const u = {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    }

    return { geometry: geo, uniforms: u }
  }, [smoothPositions, count])

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
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    const pulse = 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 4)
    uniforms.uIntensity.value = pulse
  })

  return <points ref={meshRef} geometry={geometry} material={material} />
}

export default function DeadlyPathParticles() {
  const deadlyPaths = useTopologyStore((s) => s.deadlyPaths)
  const showDeadlyPath = useTopologyStore((s) => s.showDeadlyPath)

  if (!showDeadlyPath || deadlyPaths.length === 0) return null

  return (
    <group>
      {deadlyPaths.slice(0, MAX_PATHS).map((path, i) => (
        <PathParticles key={`path-${i}-${path.nodes.join('-')}`} path={path} />
      ))}
    </group>
  )
}
