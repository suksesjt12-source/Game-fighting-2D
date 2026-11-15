import { ARENAS, ArenaId, GROUND_Y, STAGE_LEFT, STAGE_RIGHT, WORLD_HEIGHT, WORLD_WIDTH } from './ArenaData';
import { ARENA_IMAGES } from '../data/assets';
import { GraphicsPreset } from '../data/SaveManager';

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export class ArenaRenderer {
  private images = new Map<ArenaId, HTMLImageElement>();
  private bakedLayers = new Map<ArenaId, HTMLCanvasElement>();
  private motes: AmbientMote[];
  private time = 0;

  constructor() {
    (Object.keys(ARENA_IMAGES) as ArenaId[]).forEach((id) => {
      const img = new Image();
      img.onload = () => {
        this.bakedLayers.delete(id);
      };
      img.src = ARENA_IMAGES[id];
      this.images.set(id, img);
    });

    this.motes = Array.from({ length: 36 }, () => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * GROUND_Y,
      vx: (Math.random() - 0.5) * 30,
      vy: -12 - Math.random() * 28,
      size: 2 + Math.random() * 3.5,
      alpha: 0.25 + Math.random() * 0.55,
    }));
  }

  private getBakedArena(arenaId: ArenaId): HTMLCanvasElement {
    const existing = this.bakedLayers.get(arenaId);
    if (existing) return existing;

    const def = ARENAS[arenaId];
    const img = this.images.get(arenaId);
    const overscan = 44;

    const off = document.createElement('canvas');
    off.width = WORLD_WIDTH + overscan * 2;
    off.height = WORLD_HEIGHT;
    const octx = off.getContext('2d', { alpha: false })!;

    if (img && img.complete && img.naturalWidth > 0) {
      octx.drawImage(img, 0, -12, off.width, WORLD_HEIGHT + 24);
    } else {
      const grad = octx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      grad.addColorStop(0, '#0B1020');
      grad.addColorStop(0.75, '#1B2236');
      grad.addColorStop(1, def.floorColor);
      octx.fillStyle = grad;
      octx.fillRect(0, 0, off.width, WORLD_HEIGHT);
    }

    const bgScrim = octx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    bgScrim.addColorStop(0, 'rgba(9, 11, 18, 0.35)');
    bgScrim.addColorStop(0.55, def.ambientTint);
    bgScrim.addColorStop(0.84, 'rgba(9, 11, 18, 0.18)');
    bgScrim.addColorStop(1, 'rgba(9, 11, 18, 0.55)');
    octx.fillStyle = bgScrim;
    octx.fillRect(0, 0, off.width, WORLD_HEIGHT);

    // Ground highlight & corner glow baked once
    octx.fillStyle = def.floorHighlight;
    octx.fillRect(0, GROUND_Y - 2, off.width, 4);

    const leftGrad = octx.createLinearGradient(overscan + STAGE_LEFT - 40, 0, overscan + STAGE_LEFT + 30, 0);
    leftGrad.addColorStop(0, def.floorHighlight);
    leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = leftGrad;
    octx.fillRect(overscan, GROUND_Y - 180, STAGE_LEFT + 30, 180);

    const rightGrad = octx.createLinearGradient(overscan + STAGE_RIGHT + 40, 0, overscan + STAGE_RIGHT - 30, 0);
    rightGrad.addColorStop(0, def.floorHighlight);
    rightGrad.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = rightGrad;
    octx.fillRect(overscan + STAGE_RIGHT - 30, GROUND_Y - 180, WORLD_WIDTH - (STAGE_RIGHT - 30), 180);

    if (img && img.complete && img.naturalWidth > 0) {
      this.bakedLayers.set(arenaId, off);
    }
    return off;
  }

  update(dt: number, arenaId: ArenaId): void {
    this.time += dt;
    const def = ARENAS[arenaId];
    for (const m of this.motes) {
      if (def.particleDirection === 'up') {
        m.x += Math.sin(this.time * 1.6 + m.y * 0.02) * 18 * dt + m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -20) {
          m.y = GROUND_Y + 10;
          m.x = Math.random() * WORLD_WIDTH;
        }
      } else {
        m.x += (22 + Math.abs(m.vx)) * dt;
        m.y += Math.sin(this.time + m.x * 0.01) * 10 * dt;
        if (m.x > WORLD_WIDTH + 20) {
          m.x = -20;
          m.y = Math.random() * GROUND_Y;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, arenaId: ArenaId, cameraOffsetX: number, preset: GraphicsPreset): void {
    const def = ARENAS[arenaId];
    const overscan = 44;
    const parallaxX = Math.max(-overscan, Math.min(overscan, -cameraOffsetX * 0.22));
    const baked = this.getBakedArena(arenaId);
    ctx.drawImage(baked, -overscan + parallaxX, 0);

    // Animated environmental particles (Medium & High)
    if (preset !== 'LOW') {
      const count = preset === 'HIGH' ? this.motes.length : Math.floor(this.motes.length * 0.5);
      ctx.save();
      for (let i = 0; i < count; i++) {
        const m = this.motes[i];
        ctx.globalAlpha = m.alpha * (0.65 + 0.35 * Math.sin(this.time * 3 + i));
        ctx.fillStyle = i % 2 === 0 ? def.particleColor : def.particleSecondary;
        ctx.fillRect(m.x + parallaxX * 0.5 - m.size * 0.5, m.y - m.size * 0.5, m.size, m.size);
      }
      ctx.restore();
    }
  }
}
