import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Lightformer, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import bandAsset from "@/assets/band-optimized.glb.asset.json";

function BandModelScene() {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(bandAsset.url, false, true);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={group} position={[0, -0.25, 0]} scale={1.6}>
      <primitive object={scene} />
    </group>
  );
}

function BandPlaceholder() {
  const mesh = useRef<Group>(null);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.105;
  });

  return (
    <group ref={mesh} position={[0, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.45, 1.1]} />
        <meshStandardMaterial color="#f5f5f7" roughness={0.35} metalness={0.05} envMapIntensity={0.4} />
      </mesh>
    </group>
  );
}

export default function BandModel() {
  return (
    <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 35 }} dpr={[1, 2]}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 3]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 1, -2]} intensity={1.4} color="#9fb6ff" />
      <spotLight position={[0, 5, 2]} angle={0.5} penumbra={1} intensity={1.2} />
      <Suspense fallback={<BandPlaceholder />}>
        <BandModelScene />
      </Suspense>
      <ContactShadows position={[0, -0.8, 0]} opacity={0.25} scale={5} blur={2.5} far={2} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 3, 2]} scale={6} />
        <Lightformer intensity={1.2} color="#9fb6ff" position={[-4, 1, -2]} scale={6} />
        <Lightformer intensity={1} position={[3, -2, 2]} scale={5} />
      </Environment>
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2.5}
        maxDistance={8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
