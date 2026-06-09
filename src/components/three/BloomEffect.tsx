import { ReactNode } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface BloomEffectProps {
  children: ReactNode;
}

export default function BloomEffect({ children }: BloomEffectProps) {
  return (
    <>
      {children}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
