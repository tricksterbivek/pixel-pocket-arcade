import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { Stat } from '../../components/Stat';
import { getGame } from '../../data/games';
import { useArcade } from '../../hooks/useArcade';
import { audio } from '../../lib/audio';
import {
  LANES,
  createDriveState,
  scoreOf,
  speedForDistance,
  startDrive,
  steer,
  step,
  type DriveState,
} from './driveLogic';
import skyUrl from '../../assets/sky.jpg';

const game = getGame('drive');
const LANE_WIDTH = 2.2;
const laneX = (lane: number) => (lane - (LANES - 1) / 2) * LANE_WIDTH;
const OBSTACLE_COLORS = [0x3ac6f0, 0xffb02e, 0x9b7bff, 0x6ee7b7, 0xff8aa0];

/** A blocky, low-poly toy car. Player is red with a cream roof to match the art. */
function buildCar(bodyColor: number, roofColor = 0xf3e7c9): THREE.Group {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.5, 2.5),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45, metalness: 0.1 }),
  );
  body.position.y = 0.45;
  body.castShadow = true;
  car.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.5, 1.4),
    new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 }),
  );
  roof.position.set(0, 0.92, -0.1);
  roof.castShadow = true;
  car.add(roof);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.42, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x14202c, roughness: 0.2, metalness: 0.3 }),
  );
  glass.position.set(0, 0.92, 0.55);
  car.add(glass);

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.8 });
  for (const [x, z] of [
    [-0.78, 0.8],
    [0.78, 0.8],
    [-0.78, -0.8],
    [0.78, -0.8],
  ]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, 0.3, z);
    w.castShadow = true;
    car.add(w);
  }
  return car;
}

export default function DriveGame() {
  const { recordResult, state: arcade } = useArcade();
  const highScore = arcade.records.driveHighScore;

  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<DriveState>(createDriveState());
  const apiRef = useRef<{ start: () => void; steer: (d: -1 | 1) => void; restart: () => void } | null>(
    null,
  );

  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  // Stable refs so the once-mounted render loop reads fresh values.
  const highRef = useRef(highScore);
  highRef.current = highScore;
  const recordRef = useRef(recordResult);
  recordRef.current = recordResult;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebglOk(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbcd6ef, 26, 88);
    scene.background = new THREE.Color(0xbcd6ef);
    new THREE.TextureLoader().load(skyUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
    });

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 5, 9);
    camera.lookAt(0, 0.6, -8);

    scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x55504a, 1.05));
    const sun = new THREE.DirectionalLight(0xfff3e0, 1.6);
    sun.position.set(6, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(0, 0, -6);
    scene.add(sun);
    scene.add(sun.target);

    const ROAD_LEN = 220;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_WIDTH * LANES + 1.4, ROAD_LEN),
      new THREE.MeshStandardMaterial({ color: 0x33373f, roughness: 0.95 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -ROAD_LEN / 2 + 12;
    road.receiveShadow = true;
    scene.add(road);

    // Grass shoulders for a softer, non-neon look.
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4f7a4a, roughness: 1 });
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(40, ROAD_LEN), grassMat);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (LANE_WIDTH * LANES + 1.4) / 2 + 20, -0.02, road.position.z);
      g.receiveShadow = true;
      scene.add(g);
    }

    // Moving lane dashes (visual speed cue), recycled along z.
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const dashGeo = new THREE.BoxGeometry(0.16, 0.02, 1.6);
    const dashes: THREE.Mesh[] = [];
    const DASH_GAP = 5;
    const DASH_COUNT = 22;
    for (let b = 0; b < LANES - 1; b++) {
      const bx = laneX(b) + LANE_WIDTH / 2;
      for (let i = 0; i < DASH_COUNT; i++) {
        const d = new THREE.Mesh(dashGeo, dashMat);
        d.position.set(bx, 0.02, 9 - i * DASH_GAP);
        dashes.push(d);
        scene.add(d);
      }
    }

    const player = buildCar(0xe24a3b);
    scene.add(player);

    const obstacleMeshes = new Map<number, THREE.Group>();

    function clearObstacles() {
      for (const m of obstacleMeshes.values()) scene.remove(m);
      obstacleMeshes.clear();
    }

    function resize() {
      const el = mountRef.current;
      if (!el) return;
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Game-over bookkeeping.
    let recorded = false;
    let shownScore = -1;

    function onGameOver() {
      if (recorded) return;
      recorded = true;
      const final = scoreOf(stateRef.current);
      const newHigh = final > highRef.current;
      setIsNewHigh(newHigh);
      setScore(final);
      setPhase('over');
      audio.play(newHigh ? 'success' : 'error');
      recordRef.current({ game: 'drive', score: final });
    }

    apiRef.current = {
      start() {
        audio.unlock();
        if (stateRef.current.phase === 'idle') {
          stateRef.current = startDrive(stateRef.current);
          setPhase('playing');
        }
      },
      steer(d) {
        audio.unlock();
        if (stateRef.current.phase === 'idle') {
          stateRef.current = startDrive(stateRef.current);
          setPhase('playing');
        }
        stateRef.current = steer(stateRef.current, d);
      },
      restart() {
        clearObstacles();
        stateRef.current = createDriveState();
        recorded = false;
        shownScore = -1;
        player.position.x = laneX(stateRef.current.lane);
        setPhase('idle');
        setScore(0);
        setIsNewHigh(false);
      },
    };

    const FIXED = 1 / 60;
    let acc = 0;
    let last = performance.now();
    let raf = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const st = stateRef.current;
      if (st.phase === 'playing') {
        acc += dt;
        while (acc >= FIXED) {
          stateRef.current = step(stateRef.current, FIXED, Math.random);
          acc -= FIXED;
        }
        if (stateRef.current.phase === 'over') onGameOver();
      }

      const cur = stateRef.current;
      const speed = cur.phase === 'playing' ? speedForDistance(cur.distance) : 0;

      // Lane dashes scroll toward the camera at the current speed.
      if (speed > 0) {
        for (const d of dashes) {
          d.position.z += speed * dt;
          if (d.position.z > 11) d.position.z -= DASH_GAP * DASH_COUNT;
        }
      }

      // Smoothly steer the player toward its lane and bank into the turn.
      const targetX = laneX(cur.lane);
      player.position.x += (targetX - player.position.x) * Math.min(1, dt * 12);
      player.rotation.z = (targetX - player.position.x) * -0.25;
      player.rotation.y = (targetX - player.position.x) * -0.12;

      // Sync obstacle meshes to logic obstacles.
      const live = new Set<number>();
      for (const o of cur.obstacles) {
        live.add(o.id);
        let m = obstacleMeshes.get(o.id);
        if (!m) {
          m = buildCar(OBSTACLE_COLORS[o.id % OBSTACLE_COLORS.length] ?? 0x3ac6f0, 0xeaeaea);
          m.rotation.y = Math.PI; // oncoming traffic faces the player
          obstacleMeshes.set(o.id, m);
          scene.add(m);
        }
        m.position.set(laneX(o.lane), 0, -o.z);
      }
      for (const [id, m] of obstacleMeshes) {
        if (!live.has(id)) {
          scene.remove(m);
          obstacleMeshes.delete(id);
        }
      }

      const s = scoreOf(cur);
      if (s !== shownScore && cur.phase !== 'over') {
        shownScore = s;
        setScore(s);
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Keyboard steering.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        apiRef.current?.steer(-1);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        apiRef.current?.steer(1);
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') {
        e.preventDefault();
        apiRef.current?.start();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleRestart = useCallback(() => apiRef.current?.restart(), []);
  const steerLeft = useCallback(() => apiRef.current?.steer(-1), []);
  const steerRight = useCallback(() => apiRef.current?.steer(1), []);

  const status =
    phase === 'over' ? (
      <StatusBadge status="error" label="Crashed" />
    ) : phase === 'playing' ? (
      <StatusBadge status="playing" />
    ) : (
      <StatusBadge status="idle" />
    );

  return (
    <GameShell
      game={game}
      status={status}
      stats={
        <>
          <Stat label="Distance" value={`${score} m`} accent="var(--accent)" />
          <Stat label="Best" value={highScore > 0 ? `${highScore} m` : '-'} />
        </>
      }
      onRestart={handleRestart}
      controls={
        webglOk ? (
          <div className="flex gap-3" role="group" aria-label="Steering">
            <button
              type="button"
              aria-label="Steer left"
              onClick={steerLeft}
              className="flex h-14 w-20 touch-none items-center justify-center rounded-xl border border-border-strong bg-raised/80 text-2xl text-fg shadow-raised backdrop-blur active:scale-95"
            >
              <span aria-hidden="true">◀</span>
            </button>
            <button
              type="button"
              aria-label="Steer right"
              onClick={steerRight}
              className="flex h-14 w-20 touch-none items-center justify-center rounded-xl border border-border-strong bg-raised/80 text-2xl text-fg shadow-raised backdrop-blur active:scale-95"
            >
              <span aria-hidden="true">▶</span>
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="relative w-full max-w-2xl">
        <div
          ref={mountRef}
          className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-raised [overscroll-behavior:contain]"
        />
        {!webglOk && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface p-6 text-center text-muted">
            This game needs WebGL, which is not available in this browser.
          </div>
        )}
        {webglOk && phase === 'idle' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-base/70 px-4 py-2 font-semibold text-fg backdrop-blur">
              Press an arrow key or a steer button to drive
            </p>
          </div>
        )}
        {webglOk && phase === 'over' && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-base/70 backdrop-blur"
          >
            <p className="text-3xl font-extrabold text-fg">Crashed</p>
            <p className="text-muted">
              Distance <span className="font-mono font-bold text-fg">{score} m</span>
            </p>
            {isNewHigh && <p className="font-semibold" style={{ color: 'var(--accent)' }}>New best distance!</p>}
            <p className="mt-1 text-sm text-muted">Press Restart to drive again</p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
