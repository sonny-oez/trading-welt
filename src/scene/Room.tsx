import { RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Look } from './lighting';
import { STATIONS } from './layout';

function SoftEnv() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const texture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    room.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    return env;
  }, [gl]);

  useLayoutEffect(() => {
    scene.environment = texture;
    scene.environmentIntensity = 0.62;
    return () => {
      if (scene.environment === texture) scene.environment = null;
      texture.dispose();
    };
  }, [scene, texture]);

  return null;
}

function useFloorTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#12151e';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(176, 198, 230, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(256, 240, 16, 256, 240, 240);
    glow.addColorStop(0, 'rgba(94, 196, 214, 0.1)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.2, 2);
    texture.anisotropy = 4;
    return texture;
  }, []);
}

function Desk({
  position,
  color,
  cup,
}: {
  position: [number, number, number];
  color: string;
  cup?: boolean;
}) {
  return (
    <group position={position}>
      <RoundedBox args={[1.02, 0.07, 0.58]} radius={0.04} smoothness={2} position={[0, 0.74, 0]}>
        <meshStandardMaterial color="#2a3142" metalness={0.22} roughness={0.46} />
      </RoundedBox>
      <mesh position={[0, 0.782, 0.28]}>
        <boxGeometry args={[1.02, 0.012, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      {[
        [-0.52, -0.26],
        [0.52, -0.26],
        [-0.52, 0.26],
        [0.52, 0.26],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.36, z]}>
          <cylinderGeometry args={[0.03, 0.038, 0.72, 8]} />
          <meshStandardMaterial color="#12141c" metalness={0.65} roughness={0.32} />
        </mesh>
      ))}
      <group position={[0, 1.06, -0.2]}>
        <mesh>
          <boxGeometry args={[0.72, 0.44, 0.04]} />
          <meshStandardMaterial color="#0c0e14" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.028]}>
          <planeGeometry args={[0.62, 0.34]} />
          <meshStandardMaterial
            color="#10141c"
            emissive={color}
            emissiveIntensity={0.42}
            roughness={0.28}
            metalness={0.08}
          />
        </mesh>
        <mesh position={[0, -0.28, 0.01]}>
          <boxGeometry args={[0.05, 0.14, 0.04]} />
          <meshStandardMaterial color="#0c0e14" />
        </mesh>
      </group>
      {cup ? (
        <group position={[0.4, 0.82, 0.16]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.045, 0.08, 10]} />
            <meshStandardMaterial color="#f4f7fb" roughness={0.4} />
          </mesh>
          <mesh position={[0.055, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.008, 6, 12]} />
            <meshStandardMaterial color="#f4f7fb" />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Chair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.44, 8]} />
        <meshStandardMaterial color="#151820" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 14]} />
        <meshStandardMaterial color="#222636" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.74, -0.14]}>
        <boxGeometry args={[0.34, 0.4, 0.06]} />
        <meshStandardMaterial color="#222636" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.16, 0.12, 0.26, 10]} />
        <meshStandardMaterial color="#3a3128" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial color="#1d6a45" roughness={0.72} />
      </mesh>
      <mesh position={[0.16, 0.66, 0.04]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#2f8f5b" roughness={0.7} />
      </mesh>
      <mesh position={[-0.12, 0.7, -0.02]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#144c34" roughness={0.75} />
      </mesh>
    </group>
  );
}

function Rack({ position }: { position: [number, number, number] }) {
  const lights = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    lights.current.forEach((mesh, index) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const on = Math.sin(clock.elapsedTime * 2.4 + index * 0.7) > 0.15;
      material.emissiveIntensity = on ? 1.6 : 0.18;
    });
  });
  return (
    <group position={position}>
      <RoundedBox args={[0.72, 2.15, 0.46]} radius={0.04} smoothness={2} position={[0, 1.12, 0]}>
        <meshStandardMaterial color="#12141c" metalness={0.62} roughness={0.36} />
      </RoundedBox>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={index}
          position={[0, 0.32 + index * 0.28, 0.24]}
          ref={(node) => {
            lights.current[index] = node;
          }}
        >
          <boxGeometry args={[0.5, 0.045, 0.02]} />
          <meshStandardMaterial
            color={index % 2 ? '#39e7ff' : '#7aa2ff'}
            emissive={index % 2 ? '#39e7ff' : '#7aa2ff'}
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Dust() {
  const points = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const array = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 11;
      array[i * 3 + 1] = Math.random() * 3.2;
      array[i * 3 + 2] = -3.2 + Math.random() * 8;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(array, 3));
    const material = new THREE.PointsMaterial({
      color: '#d5e7ff',
      size: 0.028,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return new THREE.Points(geometry, material);
  }, []);

  useFrame((_, dt) => {
    const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i += 1) {
      let y = attr.getY(i) + dt * 0.08;
      if (y > 3.7) y = 0.2;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return <primitive object={points} />;
}

export function Room({ look }: { look: Look }) {
  const floorMap = useFloorTexture();
  return (
    <group>
      <SoftEnv />
      <color attach="background" args={[look.bg]} />
      <fog attach="fog" args={[look.bg, 18, 40]} />
      <hemisphereLight args={[look.hemiSky, look.hemiGround, 0.72]} />
      <ambientLight color={look.ambient} intensity={look.ambientIntensity} />
      <directionalLight position={[4.5, 7.5, 5]} color={look.key} intensity={look.keyIntensity} />
      <directionalLight position={[-5, 3.2, -2]} color={look.fill} intensity={look.fillIntensity} />
      <pointLight position={[0, 3.4, 1.2]} color="#e7f2ff" intensity={6} distance={14} decay={2} />
      <pointLight position={[0, 2.6, -3.6]} color="#7ec8e0" intensity={3.2} distance={8} decay={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.6]}>
        <planeGeometry args={[14, 11.2]} />
        <meshStandardMaterial
          color="#c5cedc"
          map={floorMap ?? undefined}
          metalness={0.18}
          roughness={0.72}
        />
      </mesh>
      <mesh position={[0, 2.15, -4.95]}>
        <boxGeometry args={[14, 4.3, 0.16]} />
        <meshStandardMaterial color="#12141c" roughness={0.9} />
      </mesh>
      <mesh position={[-6.92, 2.15, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[11.2, 4.3, 0.16]} />
        <meshStandardMaterial color="#141722" roughness={0.92} />
      </mesh>
      <mesh position={[6.92, 2.15, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[11.2, 4.3, 0.16]} />
        <meshStandardMaterial color="#141722" roughness={0.92} />
      </mesh>
      <mesh position={[0, 4.28, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 11.2]} />
        <meshStandardMaterial color="#10131b" roughness={1} />
      </mesh>

      {[
        [-6.82, 0.4],
        [6.82, 0.4],
      ].map(([x, z]) => (
        <group key={x} position={[x, 2.25, z]} rotation={[0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh>
            <planeGeometry args={[3.4, 1.9]} />
            <meshStandardMaterial
              color={look.window}
              emissive={look.window}
              emissiveIntensity={look.windowIntensity}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[3.7, 2.2]} />
            <meshBasicMaterial color={look.window} transparent opacity={0.18} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {STATIONS.map((station) => (
        <group key={station.station}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[station.position[0], 0.015, station.position[2]]}>
            <circleGeometry args={[0.62, 20]} />
            <meshBasicMaterial color="#05060a" transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <Desk
            position={[station.position[0], 0, station.position[2] - 0.78]}
            color={station.color}
            cup={station.cup}
          />
          <Chair position={[station.position[0], 0, station.position[2] + 0.42]} />
        </group>
      ))}

      <Rack position={[-2.55, 0, -2.55]} />
      <Rack position={[2.55, 0, -2.55]} />
      <Plant position={[-2.35, 0, -3.15]} scale={0.8} />
      <Plant position={[2.4, 0, -3.05]} scale={0.85} />
      <Plant position={[-2.15, 0, 2.55]} scale={0.7} />
      <Plant position={[2.2, 0, 2.45]} scale={0.75} />
      <Dust />
    </group>
  );
}
