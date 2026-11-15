export type ParticleKind = 'SLASH_ARC' | 'SPARK' | 'RING' | 'SHARD' | 'DUST' | 'EMBER';

export interface PooledParticle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  life: number;
  maxLife: number;
  color: string;
  coreColor: string;
}

export interface AfterimageEntry {
  active: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
  row: number;
  frame: number;
  life: number;
  maxLife: number;
  tint: string;
}

export interface FloatingDamageText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

const MAX_PARTICLES = 240;
const MAX_AFTERIMAGES = 32;
const MAX_FLOAT_TEXTS = 24;

export class ParticlePool {
  readonly particles: PooledParticle[];
  readonly afterimages: AfterimageEntry[];
  readonly floatTexts: FloatingDamageText[];
  private pCursor = 0;
  private aCursor = 0;
  private fCursor = 0;

  constructor() {
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      kind: 'SPARK',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 8,
      angle: 0,
      spin: 0,
      life: 0,
      maxLife: 0.3,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
    }));
    this.afterimages = Array.from({ length: MAX_AFTERIMAGES }, () => ({
      active: false,
      x: 0,
      y: 0,
      facing: 1,
      row: 0,
      frame: 0,
      life: 0,
      maxLife: 0.2,
      tint: '#22D3EE',
    }));
    this.floatTexts = Array.from({ length: MAX_FLOAT_TEXTS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -60,
      text: '',
      color: '#FDE68A',
      life: 0,
      maxLife: 0.7,
      scale: 1,
    }));
  }

  clear(): void {
    for (const p of this.particles) p.active = false;
    for (const a of this.afterimages) a.active = false;
    for (const f of this.floatTexts) f.active = false;
  }

  spawnParticle(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    maxLife: number,
    color: string,
    coreColor = '#FFFFFF',
    angle = 0,
    spin = 0
  ): void {
    const p = this.particles[this.pCursor];
    this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.angle = angle;
    p.spin = spin;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.color = color;
    p.coreColor = coreColor;
  }

  spawnHitBurst(x: number, y: number, color: string, coreColor: string, heavy: boolean, countScale = 1): void {
    // Central slash crescent & shockwave ring
    this.spawnParticle('RING', x, y, 0, 0, heavy ? 86 : 52, heavy ? 0.28 : 0.2, color, coreColor);
    this.spawnParticle(
      'SLASH_ARC',
      x,
      y,
      0,
      0,
      heavy ? 74 : 48,
      0.18,
      color,
      coreColor,
      (Math.random() - 0.5) * 1.4,
      (Math.random() - 0.5) * 3
    );

    const baseCount = heavy ? 18 : 10;
    const count = Math.max(3, Math.round(baseCount * countScale));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (heavy ? 220 : 140) + Math.random() * (heavy ? 420 : 240);
      this.spawnParticle(
        i % 3 === 0 ? 'SHARD' : 'SPARK',
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd - 50,
        (heavy ? 12 : 8) + Math.random() * 10,
        0.22 + Math.random() * 0.22,
        color,
        coreColor,
        a,
        (Math.random() - 0.5) * 10
      );
    }
  }

  spawnGroundImpact(x: number, y: number, color: string, countScale = 1): void {
    this.spawnParticle('RING', x, y - 4, 0, 0, 76, 0.28, color, '#FFFFFF');
    const count = Math.max(3, Math.round(8 * countScale));
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.spawnParticle(
        'DUST',
        x + dir * (10 + Math.random() * 18),
        y - 4,
        dir * (90 + Math.random() * 160),
        -35 - Math.random() * 75,
        14 + Math.random() * 12,
        0.28 + Math.random() * 0.18,
        '#94A3B8',
        '#E2E8F0'
      );
    }
  }

  spawnAfterimage(x: number, y: number, facing: 1 | -1, row: number, frame: number, tint: string): void {
    const a = this.afterimages[this.aCursor];
    this.aCursor = (this.aCursor + 1) % MAX_AFTERIMAGES;
    a.active = true;
    a.x = x;
    a.y = y;
    a.facing = facing;
    a.row = row;
    a.frame = frame;
    a.life = 0.22;
    a.maxLife = 0.22;
    a.tint = tint;
  }

  spawnFloatText(x: number, y: number, text: string, color: string, scale = 1): void {
    const f = this.floatTexts[this.fCursor];
    this.fCursor = (this.fCursor + 1) % MAX_FLOAT_TEXTS;
    f.active = true;
    f.x = x;
    f.y = y;
    f.vy = -85;
    f.text = text;
    f.color = color;
    f.life = 0.72;
    f.maxLife = 0.72;
    f.scale = scale;
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.kind === 'SPARK' || p.kind === 'SHARD') {
        p.vy += 460 * dt;
        p.vx *= Math.pow(0.25, dt);
      } else if (p.kind === 'DUST') {
        p.vx *= Math.pow(0.08, dt);
      }
    }

    for (const a of this.afterimages) {
      if (!a.active) continue;
      a.life -= dt;
      if (a.life <= 0) a.active = false;
    }

    for (const f of this.floatTexts) {
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
        continue;
      }
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.15, dt);
    }
  }
}
