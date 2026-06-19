import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { Stat } from '../../components/Stat';
import { getGame } from '../../data/games';
import { useArcade } from '../../hooks/useArcade';
import { audio } from '../../lib/audio';
import {
  START_LIVES,
  createGunnerState,
  scoreOf,
  shoot,
  startGunner,
  step,
  type GunnerState,
} from './gunnerLogic';
import { loadNeos, type NeoSource, type NeoTemplate } from './neo';

const game = getGame('gunner');

const ACCENT = 0x9b8cff;
const ROCK_COLOR = 0x8a7f6f;
const ROCK_HAZ_COLOR = 0xb5503a;
const BG_COLOR = 0x05060d;

type Ndc = { x: number; y: number };
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

interface Effect {
  obj: THREE.Object3D;
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  life: number;
  max: number;
  kind: 'tracer' | 'blast';
  baseR: number;
}

/** A faceted asteroid geometry, vertices jittered for an irregular rocky look. */
function rockGeometry(seed: number): THREE.IcosahedronGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  let s = (seed * 2654435761) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).multiplyScalar(1 + (rand() - 0.5) * 0.4);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Render a NEO name (and a hazard tag) onto a sprite texture. */
function makeLabelTexture(name: string, hazardous: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const text = hazardous ? `${name}  -  PHA` : name;
    ctx.font = 'bold 34px ui-monospace, monospace';
    const w = Math.min(canvas.width - 16, ctx.measureText(text).width + 36);
    const x = (canvas.width - w) / 2;
    ctx.fillStyle = 'rgba(8,10,18,0.62)';
    ctx.beginPath();
    ctx.roundRect(x, 24, w, 50, 14);
    ctx.fill();
    ctx.font = 'bold 34px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hazardous ? '#ffd2c4' : '#e8ecf6';
    ctx.fillText(text, canvas.width / 2, 50);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function GunnerGame() {
  const { recordResult, state: arcade } = useArcade();
  const highScore = arcade.records.gunnerHighScore;

  const mountRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const lastNdcRef = useRef<Ndc>({ x: 0, y: 0 });
  const stateRef = useRef<GunnerState>(createGunnerState([]));
  const apiRef = useRef<{ fire: () => void; restart: () => void } | null>(null);

  const [templates, setTemplates] = useState<NeoTemplate[] | null>(null);
  const [dataSource, setDataSource] = useState<NeoSource | 'loading'>('loading');
  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [combo, setCombo] = useState(0);
  const [lastHit, setLastHit] = useState<string | null>(null);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  const highRef = useRef(highScore);
  highRef.current = highScore;
  const recordRef = useRef(recordResult);
  recordRef.current = recordResult;

  const updateReticle = useCallback((ndc: Ndc) => {
    const el = reticleRef.current;
    if (!el) return;
    el.style.left = `${(ndc.x * 0.5 + 0.5) * 100}%`;
    el.style.top = `${(1 - (ndc.y * 0.5 + 0.5)) * 100}%`;
  }, []);

  // Resolve the asteroid roster: live from NASA, with an offline fallback.
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 5000);
    loadNeos(ctrl.signal).then(({ neos, source }) => {
      window.clearTimeout(timer);
      if (!alive) return;
      setTemplates(neos);
      setDataSource(source);
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  // Build the three.js scene once the roster is available.
  useEffect(() => {
    if (!templates) return;
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
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.0065);

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    scene.add(new THREE.HemisphereLight(0x8090c0, 0x101018, 0.5));
    const sun = new THREE.DirectionalLight(0xfff0e0, 1.5);
    sun.position.set(5, 6, 2);
    scene.add(sun);

    // Starfield.
    const STAR_COUNT = 1500;
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3] = (Math.random() * 2 - 1) * 160;
      starPos[i * 3 + 1] = (Math.random() * 2 - 1) * 160;
      starPos[i * 3 + 2] = -Math.random() * 320 + 20;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xcdd6ff,
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      fog: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // A distant planet for depth and warmth.
    const planetGeo = new THREE.SphereGeometry(20, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: 1, fog: false });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.position.set(-46, 24, -180);
    scene.add(planet);

    // Shared rock resources.
    const rockGeos = [rockGeometry(1), rockGeometry(2), rockGeometry(3)];
    const rockMat = new THREE.MeshStandardMaterial({
      color: ROCK_COLOR,
      roughness: 1,
      flatShading: true,
    });
    const rockHazMat = new THREE.MeshStandardMaterial({
      color: ROCK_HAZ_COLOR,
      roughness: 0.9,
      flatShading: true,
      emissive: 0x431209,
      emissiveIntensity: 0.6,
    });

    const labelTextures = new Map<string, THREE.CanvasTexture>();
    function labelTexture(name: string, hazardous: boolean): THREE.CanvasTexture {
      const key = `${hazardous ? 'h' : 'n'}:${name}`;
      let tex = labelTextures.get(key);
      if (!tex) {
        tex = makeLabelTexture(name, hazardous);
        labelTextures.set(key, tex);
      }
      return tex;
    }

    interface RockView {
      mesh: THREE.Mesh;
      label: THREE.Sprite;
      spriteMat: THREE.SpriteMaterial;
      spin: THREE.Vector3;
    }
    const rockViews = new Map<number, RockView>();

    function removeRock(view: RockView) {
      scene.remove(view.mesh);
      scene.remove(view.label);
      view.spriteMat.dispose();
    }
    function clearRocks() {
      for (const v of rockViews.values()) removeRock(v);
      rockViews.clear();
    }

    const effects: Effect[] = [];
    const MUZZLE = new THREE.Vector3(0, -1.3, -2);
    function spawnTracer(to: THREE.Vector3) {
      const geo = new THREE.BufferGeometry().setFromPoints([MUZZLE.clone(), to]);
      const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      effects.push({ obj: line, geo, mat, life: 0.12, max: 0.12, kind: 'tracer', baseR: 1 });
    }
    function spawnBlast(at: THREE.Vector3, r: number) {
      const geo = new THREE.IcosahedronGeometry(1, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(at);
      scene.add(mesh);
      effects.push({ obj: mesh, geo, mat, life: 0.35, max: 0.35, kind: 'blast', baseR: r });
    }
    function updateEffects(dt: number) {
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.life -= dt;
        const t = Math.max(0, e.life / e.max);
        const mat = e.mat as THREE.Material & { opacity: number };
        if (e.kind === 'tracer') {
          mat.opacity = 0.9 * t;
        } else {
          e.obj.scale.setScalar(e.baseR * (0.6 + (1 - t) * 1.8));
          mat.opacity = 0.9 * t;
        }
        if (e.life <= 0) {
          scene.remove(e.obj);
          e.geo.dispose();
          e.mat.dispose();
          effects.splice(i, 1);
        }
      }
    }

    const raycaster = new THREE.Raycaster();
    const tmpVec2 = new THREE.Vector2();

    function fireAt(ndc: Ndc) {
      audio.unlock();
      if (stateRef.current.phase === 'idle') {
        stateRef.current = startGunner(stateRef.current);
        setPhase('playing');
      }
      if (stateRef.current.phase !== 'playing') return;
      lastNdcRef.current = ndc;
      updateReticle(ndc);

      raycaster.setFromCamera(tmpVec2.set(ndc.x, ndc.y), camera);
      const d = raycaster.ray.direction;
      const pre = stateRef.current;
      const res = shoot(pre, { x: d.x, y: d.y, z: -d.z });
      stateRef.current = res.state;

      if (res.hitId !== null) {
        const target = pre.rocks.find((r) => r.id === res.hitId);
        if (target) {
          const at = new THREE.Vector3(target.x, target.y, -target.z);
          spawnTracer(at);
          spawnBlast(at, target.r);
          setLastHit(`${target.name}${target.hazardous ? ' (PHA)' : ''}   +${res.gained}`);
        }
        audio.play('score');
      } else {
        spawnTracer(raycaster.ray.at(140, new THREE.Vector3()));
        audio.play('select');
      }
    }

    function ndcFromEvent(e: PointerEvent): Ndc {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: clamp1(((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1),
        y: clamp1(-(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)),
      };
    }
    function onPointerMove(e: PointerEvent) {
      const ndc = ndcFromEvent(e);
      lastNdcRef.current = ndc;
      updateReticle(ndc);
    }
    function onPointerDown(e: PointerEvent) {
      e.preventDefault();
      fireAt(ndcFromEvent(e));
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let recorded = false;
    let shownScore = -1;
    let shownLives = -1;
    let shownCombo = -1;

    apiRef.current = {
      fire() {
        fireAt(lastNdcRef.current);
      },
      restart() {
        clearRocks();
        stateRef.current = createGunnerState(templates);
        recorded = false;
        shownScore = -1;
        shownLives = -1;
        shownCombo = -1;
        setPhase('idle');
        setScore(0);
        setLives(START_LIVES);
        setCombo(0);
        setIsNewHigh(false);
        setLastHit(null);
      },
    };

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

    // Start fresh with the resolved roster.
    stateRef.current = createGunnerState(templates);

    function onGameOver() {
      if (recorded) return;
      recorded = true;
      const final = scoreOf(stateRef.current);
      const newHigh = final > highRef.current;
      setIsNewHigh(newHigh);
      setScore(final);
      setPhase('over');
      audio.play(newHigh && final > 0 ? 'success' : 'error');
      recordRef.current({ game: 'gunner', score: final });
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const FIXED = 1 / 60;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (stateRef.current.phase === 'playing') {
        acc += dt;
        while (acc >= FIXED) {
          stateRef.current = step(stateRef.current, FIXED, Math.random);
          acc -= FIXED;
        }
        if (stateRef.current.phase === 'over') onGameOver();
      }

      const cur = stateRef.current;

      // Sync rock views to the logic rocks.
      const live = new Set<number>();
      for (const rk of cur.rocks) {
        live.add(rk.id);
        let view = rockViews.get(rk.id);
        if (!view) {
          const mesh = new THREE.Mesh(
            rockGeos[rk.id % rockGeos.length],
            rk.hazardous ? rockHazMat : rockMat,
          );
          mesh.scale.setScalar(rk.r);
          mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
          const spriteMat = new THREE.SpriteMaterial({
            map: labelTexture(rk.name, rk.hazardous),
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            fog: false,
          });
          const label = new THREE.Sprite(spriteMat);
          label.scale.set(Math.min(11, 4.5 + rk.name.length * 0.32), 1.7, 1);
          const spin = new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
          );
          scene.add(mesh);
          scene.add(label);
          view = { mesh, label, spriteMat, spin };
          rockViews.set(rk.id, view);
        }
        view.mesh.position.set(rk.x, rk.y, -rk.z);
        view.mesh.rotation.x += view.spin.x * dt;
        view.mesh.rotation.y += view.spin.y * dt;
        view.label.position.set(rk.x, rk.y + rk.r + 1.3, -rk.z);
      }
      for (const [id, view] of rockViews) {
        if (!live.has(id)) {
          removeRock(view);
          rockViews.delete(id);
        }
      }

      updateEffects(dt);
      stars.rotation.z += dt * 0.01;

      if (cur.score !== shownScore) {
        shownScore = cur.score;
        setScore(cur.score);
      }
      if (cur.lives !== shownLives) {
        shownLives = cur.lives;
        setLives(cur.lives);
      }
      if (cur.combo !== shownCombo) {
        shownCombo = cur.combo;
        setCombo(cur.combo);
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      apiRef.current = null;
      clearRocks();
      for (const e of effects) {
        scene.remove(e.obj);
        e.geo.dispose();
        e.mat.dispose();
      }
      for (const tex of labelTextures.values()) tex.dispose();
      for (const g of rockGeos) g.dispose();
      rockMat.dispose();
      rockHazMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      planetGeo.dispose();
      planetMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [templates, updateReticle]);

  // Keyboard: Space or Enter fires; arrow keys nudge the aim.
  useEffect(() => {
    function nudge(dx: number, dy: number) {
      const n = { x: clamp1(lastNdcRef.current.x + dx), y: clamp1(lastNdcRef.current.y + dy) };
      lastNdcRef.current = n;
      updateReticle(n);
    }
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          apiRef.current?.fire();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nudge(-0.06, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nudge(0.06, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nudge(0, 0.06);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nudge(0, -0.06);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [updateReticle]);

  const handleFire = useCallback(() => apiRef.current?.fire(), []);
  const handleRestart = useCallback(() => apiRef.current?.restart(), []);

  const mult = Math.min(5, 1 + Math.floor(combo / 4));
  const caption =
    dataSource === 'offline'
      ? 'Targets: built-in asteroid set. NASA data was unavailable, so the game loaded offline.'
      : dataSource === 'loading'
        ? 'Linking to NASA for live asteroid data...'
        : 'Targets: real near-Earth asteroids, live from NASA (NeoWs).';

  const status =
    phase === 'over' ? (
      <StatusBadge status="error" label="Out of lives" />
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
          <Stat label="Score" value={`${score}`} accent="var(--accent)" />
          <Stat label="Lives" value={`${lives}`} />
          <Stat label="Best" value={highScore > 0 ? `${highScore}` : '-'} />
        </>
      }
      onRestart={handleRestart}
      controls={
        webglOk ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              aria-label="Fire"
              onClick={handleFire}
              className="flex h-14 w-40 touch-none items-center justify-center rounded-xl border border-border-strong bg-raised/80 text-lg font-bold text-fg shadow-raised backdrop-blur active:scale-95"
            >
              Fire
            </button>
            <p className="text-center text-xs text-muted">
              Aim with the mouse or your finger. Arrow keys nudge, Space fires.
            </p>
          </div>
        ) : undefined
      }
    >
      <div className="flex w-full flex-col items-center">
        <div className="relative w-full max-w-2xl">
          <div
            ref={mountRef}
            className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-base shadow-raised [overscroll-behavior:contain] [touch-action:none]"
          />

          {webglOk && templates && (
            <div
              ref={reticleRef}
              aria-hidden="true"
              className="pointer-events-none absolute z-10"
              style={{ left: '50%', top: '50%' }}
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                <div
                  className="h-7 w-7 rounded-full border-2"
                  style={{ borderColor: 'var(--accent)', opacity: 0.85 }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              </div>
            </div>
          )}

          {!webglOk && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface p-6 text-center text-muted">
              This game needs WebGL, which is not available in this browser.
            </div>
          )}

          {webglOk && !templates && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-base/80 text-center">
              <p className="rounded-full bg-surface/80 px-4 py-2 font-semibold text-fg backdrop-blur">
                Acquiring targets from NASA...
              </p>
            </div>
          )}

          {webglOk && templates && phase === 'playing' && combo >= 2 && (
            <div
              className="pointer-events-none absolute left-3 top-3 rounded-full bg-base/70 px-3 py-1 text-sm font-bold backdrop-blur"
              style={{ color: 'var(--accent)' }}
            >
              Streak {combo} (x{mult})
            </div>
          )}

          {webglOk && templates && phase === 'playing' && lastHit && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-base/70 px-3 py-1 text-center font-mono text-xs text-fg backdrop-blur">
              {lastHit}
            </div>
          )}

          {webglOk && templates && phase === 'idle' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-full bg-base/70 px-4 py-2 text-center font-semibold text-fg backdrop-blur">
                Aim and click, tap, or press Space to fire
              </p>
            </div>
          )}

          {webglOk && templates && phase === 'over' && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-base/70 backdrop-blur"
            >
              <p className="text-3xl font-extrabold text-fg">Out of lives</p>
              <p className="text-muted">
                Score <span className="font-mono font-bold text-fg">{score}</span>
              </p>
              {isNewHigh && (
                <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                  New high score!
                </p>
              )}
              <p className="mt-1 text-sm text-muted">Press Restart to play again</p>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-muted">{caption}</p>
      </div>
    </GameShell>
  );
}
