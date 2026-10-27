import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import * as THREE from 'three';
import type { Accessory } from './layout';
import { AISLE_Z, STATIONS } from './layout';
import { makeLabel } from './labels';
import { executionPulseAge } from './tradePulse';

interface Walk {
  mode: 'idle' | 'walk';
  wait: number;
  points: THREE.Vector3[];
  seg: number;
  t: number;
  dur: number;
  phase: number;
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function prepSeg(walk: Walk) {
  while (walk.seg < walk.points.length - 1) {
    const from = walk.points[walk.seg];
    const to = walk.points[walk.seg + 1];
    const dist = from.distanceTo(to);
    if (dist < 0.08) {
      walk.seg += 1;
      continue;
    }
    walk.t = 0;
    walk.dur = Math.max(0.7, dist / 0.95);
    return;
  }
  walk.mode = 'idle';
  walk.wait = 9 + Math.random() * 14;
}

function beginWalk(walk: Walk, home: [number, number, number], station: string) {
  const others = STATIONS.filter((item) => item.station !== station);
  const roll = Math.random();
  const dest =
    roll < 0.72
      ? (() => {
          const pick = others[Math.floor(Math.random() * others.length)];
          const side = pick.position[0] >= home[0] ? -0.58 : 0.58;
          return new THREE.Vector3(pick.position[0] + side, 0, pick.position[2]);
        })()
      : new THREE.Vector3(Math.random() < 0.5 ? -2.15 : 2.15, 0, -2.15);
  const start = new THREE.Vector3(home[0], 0, home[2]);
  walk.points = [
    start,
    new THREE.Vector3(start.x, 0, AISLE_Z),
    new THREE.Vector3(dest.x, 0, AISLE_Z),
    dest,
    new THREE.Vector3(dest.x, 0, AISLE_Z),
    new THREE.Vector3(start.x, 0, AISLE_Z),
    start.clone(),
  ];
  walk.seg = 0;
  walk.mode = 'walk';
  prepSeg(walk);
}

function Accent({ accent }: { accent: string }) {
  return <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.28} roughness={0.38} />;
}

function AccessoryMesh({ kind, accent }: { kind: Accessory; accent: string }) {
  if (kind === 'halo') {
    return (
      <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.018, 8, 22]} />
        <Accent accent={accent} />
      </mesh>
    );
  }
  if (kind === 'visor') {
    return (
      <mesh position={[0, 1.04, 0.16]}>
        <boxGeometry args={[0.24, 0.07, 0.04]} />
        <meshStandardMaterial color="#10151c" metalness={0.7} roughness={0.2} />
      </mesh>
    );
  }
  if (kind === 'glasses') {
    return (
      <group position={[0, 1.04, 0.16]}>
        <mesh position={[-0.06, 0, 0]}>
          <torusGeometry args={[0.045, 0.008, 6, 14]} />
          <Accent accent={accent} />
        </mesh>
        <mesh position={[0.06, 0, 0]}>
          <torusGeometry args={[0.045, 0.008, 6, 14]} />
          <Accent accent={accent} />
        </mesh>
      </group>
    );
  }
  if (kind === 'cone') {
    return (
      <mesh position={[0, 1.28, 0]}>
        <coneGeometry args={[0.12, 0.2, 10]} />
        <Accent accent={accent} />
      </mesh>
    );
  }
  if (kind === 'helm') {
    return (
      <mesh position={[0, 1.16, 0]} scale={[1, 0.72, 1]}>
        <sphereGeometry args={[0.18, 14, 10]} />
        <Accent accent={accent} />
      </mesh>
    );
  }
  if (kind === 'headset') {
    return (
      <group position={[0, 1.05, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.16, 0.016, 6, 18]} />
          <meshStandardMaterial color="#141820" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.16, 0, 0]}>
          <boxGeometry args={[0.05, 0.08, 0.06]} />
          <Accent accent={accent} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={[0, 1.2, 0]} scale={[1.1, 0.38, 1.1]}>
      <sphereGeometry args={[0.14, 14, 10]} />
      <Accent accent={accent} />
    </mesh>
  );
}

function Character({
  color,
  accent,
  accessory,
  legL,
  legR,
  armL,
  armR,
  eyes,
}: {
  color: string;
  accent: string;
  accessory: Accessory;
  legL: RefObject<THREE.Group | null>;
  legR: RefObject<THREE.Group | null>;
  armL: RefObject<THREE.Group | null>;
  armR: RefObject<THREE.Group | null>;
  eyes: RefObject<THREE.Group | null>;
}) {
  const cloth = { color, roughness: 0.42, metalness: 0.08 };
  return (
    <group>
      <group ref={legL} position={[-0.09, 0.36, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <capsuleGeometry args={[0.055, 0.16, 3, 8]} />
          <meshStandardMaterial color="#1b1e2a" roughness={0.55} />
        </mesh>
      </group>
      <group ref={legR} position={[0.09, 0.36, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <capsuleGeometry args={[0.055, 0.16, 3, 8]} />
          <meshStandardMaterial color="#1b1e2a" roughness={0.55} />
        </mesh>
      </group>
      <mesh position={[0, 0.64, 0]}>
        <sphereGeometry args={[0.22, 18, 14]} />
        <meshStandardMaterial {...cloth} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.2, 18, 14]} />
        <meshStandardMaterial {...cloth} />
      </mesh>
      <mesh position={[0, 1.0, 0.12]}>
        <sphereGeometry args={[0.115, 14, 12]} />
        <meshStandardMaterial color="#f6f3ec" roughness={0.6} />
      </mesh>
      <group ref={eyes} position={[0, 1.03, 0.2]}>
        <mesh position={[-0.045, 0.01, 0]}>
          <sphereGeometry args={[0.026, 10, 8]} />
          <meshStandardMaterial color="#161820" />
        </mesh>
        <mesh position={[0.045, 0.01, 0]}>
          <sphereGeometry args={[0.026, 10, 8]} />
          <meshStandardMaterial color="#161820" />
        </mesh>
      </group>
      <group ref={armL} position={[-0.2, 0.72, 0]}>
        <mesh position={[0, -0.12, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.042, 0.14, 3, 8]} />
          <meshStandardMaterial {...cloth} />
        </mesh>
      </group>
      <group ref={armR} position={[0.2, 0.72, 0]}>
        <mesh position={[0, -0.12, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.042, 0.14, 3, 8]} />
          <meshStandardMaterial {...cloth} />
        </mesh>
      </group>
      <AccessoryMesh kind={accessory} accent={accent} />
    </group>
  );
}

export function BotActor({
  station,
  name,
  color,
  accent,
  accessory,
  home,
  reduced,
}: {
  station: string;
  name: string;
  color: string;
  accent: string;
  accessory: Accessory;
  home: [number, number, number];
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const [fontTick, setFontTick] = useState(0);
  const label = useMemo(() => makeLabel(name, accent), [name, accent, fontTick]);
  const walk = useRef<Walk>({
    mode: 'idle',
    wait: 2.5 + Math.random() * 7,
    points: [],
    seg: 0,
    t: 0,
    dur: 1,
    phase: Math.random() * Math.PI * 2,
  });

  useEffect(() => {
    let cancel = false;
    void document.fonts.ready.then(() => {
      if (!cancel) setFontTick(1);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => () => label.dispose(), [label]);

  useFrame((state, dt) => {
    const root = group.current;
    if (!root) return;
    const current = walk.current;
    const time = state.clock.elapsedTime;
    const step = Math.min(dt, 0.05);

    if (reduced || current.mode === 'idle') {
      if (reduced) current.mode = 'idle';
      const bob = Math.sin(time * 1.6 + current.phase) * (reduced ? 0.008 : 0.028);
      root.position.set(home[0], bob, home[2]);
      root.rotation.y = dampAngle(root.rotation.y, Math.PI, 4, step);
      if (!reduced) {
        current.wait -= step;
        if (current.wait <= 0) beginWalk(current, home, station);
      }
    } else {
      const from = current.points[current.seg];
      const to = current.points[current.seg + 1];
      if (!from || !to) {
        current.mode = 'idle';
      } else {
        current.t += step;
        const k = Math.min(1, current.t / current.dur);
        const ease = k * k * (3 - 2 * k);
        root.position.lerpVectors(from, to, ease);
        root.position.y += Math.abs(Math.sin(k * Math.PI)) * 0.03;
        const ang = Math.atan2(to.x - from.x, to.z - from.z);
        root.rotation.y = dampAngle(root.rotation.y, ang, 8, step);
        if (k >= 1) {
          current.seg += 1;
          prepSeg(current);
        }
      }
    }

    const walking = current.mode === 'walk' && !reduced;
    const swing = walking
      ? Math.sin(time * 8 + current.phase) * 0.55
      : Math.sin(time * 1.25 + current.phase) * 0.05;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.65;
    if (armR.current) armR.current.rotation.x = swing * 0.65;
    if (eyes.current) {
      const cycle = (time + current.phase) % 4.8;
      eyes.current.scale.y = cycle > 4.58 ? 0.12 : 1;
    }

    const age = station === 'ausfuehrung' && !reduced ? executionPulseAge() : -1;
    if (age >= 0) {
      const bump = Math.sin(age * Math.PI);
      root.scale.setScalar(1 + bump * 0.12);
      root.position.y += bump * 0.08;
    } else {
      root.scale.setScalar(1);
    }
  });

  return (
    <group ref={group} position={home}>
      <Character
        color={color}
        accent={accent}
        accessory={accessory}
        legL={legL}
        legR={legR}
        armL={armL}
        armR={armR}
        eyes={eyes}
      />
      <sprite position={[0, 1.58, 0]} scale={[1.28, 0.36, 1]}>
        <spriteMaterial map={label} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}
