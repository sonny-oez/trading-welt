import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useDesk } from '../data/store';
import { usePrefersReducedMotion } from '../hooks';
import { BotActor } from './Bot';
import type { Look } from './lighting';
import { STATIONS } from './layout';
import { Room } from './Room';
import { executionPulseAge } from './tradePulse';
import { WallScreen } from './WallScreen';

function ExecutionPulse({ reduced }: { reduced: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const home = STATIONS.find((station) => station.station === 'ausfuehrung');
  useFrame(() => {
    const mesh = ring.current;
    if (!mesh || !home) return;
    const age = reduced ? -1 : executionPulseAge();
    mesh.visible = age >= 0;
    if (age < 0) return;
    mesh.scale.setScalar(1 + age * 2.4);
    const material = mesh.material;
    if (!Array.isArray(material) && 'opacity' in material) material.opacity = 0.9 * (1 - age);
  });
  if (!home) return null;
  return (
    <mesh ref={ring} position={[home.position[0], 0.05, home.position[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.34, 0.48, 40]} />
      <meshBasicMaterial color="#3ee0a2" transparent opacity={0} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

function Exposure({ value }: { value: number }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

function allowBloom(gl: THREE.WebGLRenderer): boolean {
  const context = gl.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  if (debug) {
    const renderer = String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    if (/swiftshader|llvmpipe|software/i.test(renderer)) return false;
  }
  if (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  return true;
}

function Effects() {
  const gl = useThree((state) => state.gl);
  const enabled = useMemo(() => allowBloom(gl), [gl]);
  if (!enabled) return null;
  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={false}
      resolutionScale={0.7}
      frameBufferType={THREE.HalfFloatType}
    >
      <Bloom
        intensity={0.45}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.2}
        mipmapBlur
        radius={0.42}
        levels={5}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

function Scene({ look, reduced }: { look: Look; reduced: boolean }) {
  const bots = useDesk().bots;
  const byStation = new Map(bots.map((bot) => [bot.station, bot]));
  return (
    <>
      <Exposure value={look.exposure} />
      <Room look={look} />
      <WallScreen />
      <ExecutionPulse reduced={reduced} />
      {STATIONS.map((station) => {
        const bot = byStation.get(station.station);
        if (!bot) return null;
        return (
          <BotActor
            key={station.station}
            station={station.station}
            name={bot.name}
            color={station.color}
            accent={station.accent}
            accessory={station.accessory}
            home={station.position}
            reduced={reduced}
          />
        );
      })}
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        minDistance={4.8}
        maxDistance={14}
        minPolarAngle={0.7}
        maxPolarAngle={1.42}
        minAzimuthAngle={-1.2}
        maxAzimuthAngle={1.2}
        target={[0, 1.2, 0.2]}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <Effects />
    </>
  );
}

export default function TradingFloor({
  look,
  onContextLost,
}: {
  look: Look;
  onContextLost?: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <Canvas
      className="webgl"
      dpr={[1, 1.5]}
      performance={{ min: 0.6 }}
      camera={{ position: [0, 2.7, 8.35], fov: 60, near: 0.1, far: 55 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 1.2, 0.2);
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onContextLost?.();
        });
      }}
    >
      <Scene look={look} reduced={reduced} />
    </Canvas>
  );
}
