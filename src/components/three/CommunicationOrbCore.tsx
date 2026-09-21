import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Float } from '@react-three/drei';
import type { Mesh } from 'three';

interface OrbMeshProps {
  active: boolean;
  color: string;
}

function OrbMesh({ active, color }: OrbMeshProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * (active ? 0.35 : 0.12);
    meshRef.current.rotation.x += delta * 0.04;
    const t = state.clock.getElapsedTime();
    const scale = active ? 1 + Math.sin(t * 4) * 0.05 : 1 + Math.sin(t * 0.8) * 0.02;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.6}>
      <Sphere ref={meshRef} args={[1.3, 64, 64]}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={active ? 0.5 : 0.32}
          speed={active ? 3 : 1.2}
          roughness={0.25}
          metalness={0.3}
        />
      </Sphere>
    </Float>
  );
}

export interface CommunicationOrbProps {
  active?: boolean;
  color?: string;
  className?: string;
}

export function CommunicationOrb({ active = false, color = '#6058e8', className }: CommunicationOrbProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={40} color="#a29bf3" />
        <pointLight position={[-3, -2, -2]} intensity={20} color="#2f8bf0" />
        <Suspense fallback={null}>
          <OrbMesh active={active} color={color} />
        </Suspense>
      </Canvas>
    </div>
  );
}
