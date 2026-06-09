import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import SubstationModel from './SubstationModel';
import InsulatorInstances from './InsulatorInstances';
import SwitchCoverInstances from './SwitchCoverInstances';
import BreakerBladeInstances from './BreakerBladeInstances';
import EnergyFieldInstances from './EnergyFieldInstances';
import BloomEffect from './BloomEffect';

export default function SubstationScene() {
  return (
    <Canvas
      gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.2 }}
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[30, 25, 30]} fov={50} />
      <OrbitControls
        target={[25, 0, 22]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={10}
        maxDistance={120}
        enableDamping
        dampingFactor={0.08}
      />
      <color attach="background" args={['#0A0E17']} />
      <fog attach="fog" args={['#0A0E17', 80, 200]} />
      <ambientLight intensity={0.15} color="#1a2040" />
      <directionalLight intensity={0.4} color="#4466aa" position={[50, 80, 30]} />
      <BloomEffect>
        <SubstationModel />
        <InsulatorInstances />
        <SwitchCoverInstances />
        <BreakerBladeInstances />
        <EnergyFieldInstances />
      </BloomEffect>
    </Canvas>
  );
}
