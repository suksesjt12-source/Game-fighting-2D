import { ArenaRenderer } from '../arena/ArenaRenderer';
import { GROUND_Y, WORLD_HEIGHT, WORLD_WIDTH } from '../arena/ArenaData';
import { CharacterController } from '../characters/CharacterController';
import { getBakedSpriteSheet, SPRITE_FRAME_SIZE } from '../characters/SpriteSheetBaker';
import { buildAttackHitbox, buildHurtbox } from '../combat/HitboxSystem';
import { GraphicsPreset } from '../data/SaveManager';
import { ActiveProjectile, GameEngine } from './GameEngine';
import { PooledParticle } from './ParticlePool';

export class GameRenderer {
  private arenaRenderer = new ArenaRenderer();

  update(dt: number, engine: GameEngine): void {
    this.arenaRenderer.update(dt, engine.arenaId);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, engine: GameEngine, preset: GraphicsPreset): void {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Uniform scale to fit 1280x720 world cleanly into landscape canvas
    const scale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    const drawW = WORLD_WIDTH * scale;
    const drawH = WORLD_HEIGHT * scale;
    const offsetX = (width - drawW) * 0.5;
    const offsetY = (height - drawH) * 0.5;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Trauma-squared screen shake
    const shakeMag = engine.shakeTrauma * engine.shakeTrauma * 18;
    const shakeX = shakeMag > 0.2 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    const shakeY = shakeMag > 0.2 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    ctx.translate(shakeX, shakeY);

    // Subtle camera midpoint offset for parallax
    const midX = (engine.p1.x + engine.p2.x) * 0.5 - WORLD_WIDTH * 0.5;
    this.arenaRenderer.render(ctx, engine.arenaId, midX, preset);

    // Ultimate activation cinematic dark dim + radial burst
    if (engine.ultimateFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, engine.ultimateFlashTimer * 1.8);
      ctx.fillStyle = '#05070E';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.restore();
    }

    // Ground shadows
    this.drawGroundShadow(ctx, engine.p1);
    this.drawGroundShadow(ctx, engine.p2);

    // Dash afterimages
    if (preset !== 'LOW') {
      for (const a of engine.particles.afterimages) {
        if (!a.active) continue;
        // Match owner by tint or draw from p1/p2
        const owner = a.tint === engine.p1.def.palette.energy ? engine.p1 : engine.p2;
        const sheet = getBakedSpriteSheet(owner.def.id);
        ctx.save();
        ctx.globalAlpha = (a.life / a.maxLife) * 0.42;
        ctx.translate(a.x, a.y);
        ctx.scale(a.facing, 1);
        const sx = a.frame * SPRITE_FRAME_SIZE;
        const sy = a.row * SPRITE_FRAME_SIZE;
        ctx.drawImage(
          sheet.canvas,
          sx,
          sy,
          SPRITE_FRAME_SIZE,
          SPRITE_FRAME_SIZE,
          -SPRITE_FRAME_SIZE * 0.48,
          -SPRITE_FRAME_SIZE * 0.86,
          SPRITE_FRAME_SIZE,
          SPRITE_FRAME_SIZE
        );
        ctx.restore();
      }
    }

    // Fighters (draw attacker on top of defender)
    const p1Attacks = engine.p1.isAttacking();
    if (p1Attacks) {
      this.drawFighter(ctx, engine.p2);
      this.drawFighter(ctx, engine.p1);
    } else {
      this.drawFighter(ctx, engine.p1);
      this.drawFighter(ctx, engine.p2);
    }

    // Projectiles
    for (const proj of engine.projectiles) {
      this.drawProjectile(ctx, proj);
    }

    // Pooled VFX particles
    for (const p of engine.particles.particles) {
      if (!p.active) continue;
      this.drawParticle(ctx, p);
    }

    // Training hitbox debug overlay (subtle visual feedback in training mode only)
    if (engine.state === 'TRAINING') {
      this.drawTrainingBoxes(ctx, engine.p1);
      this.drawTrainingBoxes(ctx, engine.p2);
    }

    // Floating combat damage numbers
    for (const f of engine.particles.floatTexts) {
      if (!f.active) continue;
      const alpha = Math.min(1, (f.life / f.maxLife) * 1.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(28 * f.scale)}px "Barlow Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(9, 11, 18, 0.92)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawGroundShadow(ctx: CanvasRenderingContext2D, f: CharacterController): void {
    const heightAbove = Math.max(0, GROUND_Y - f.y);
    const scale = Math.max(0.45, 1 - heightAbove / 420);
    ctx.save();
    ctx.fillStyle = `rgba(4, 6, 12, ${0.52 * scale})`;
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND_Y + 4, 38 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFighter(ctx: CanvasRenderingContext2D, f: CharacterController): void {
    const sheet = getBakedSpriteSheet(f.def.id);
    const row = f.anim.getRow();
    const frame = f.anim.getFrameIndex();
    const sx = frame * SPRITE_FRAME_SIZE;
    const sy = row * SPRITE_FRAME_SIZE;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.facing * f.scaleX * 1.24, f.scaleY * 1.24);

    // Subtle windup telegraph glint before active attack frames
    if (f.getAttackPhase() === 'WINDUP' && (f.activeMove?.id === 'SKILL_1' || f.activeMove?.id === 'SKILL_2' || f.activeMove?.id === 'ULTIMATE')) {
      ctx.save();
      ctx.strokeStyle = f.def.palette.energyCore;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(8, -76, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const src = f.hitFlashTimer > 0 ? sheet.flashCanvas : sheet.canvas;
    ctx.drawImage(
      src,
      sx,
      sy,
      SPRITE_FRAME_SIZE,
      SPRITE_FRAME_SIZE,
      -SPRITE_FRAME_SIZE * 0.48,
      -SPRITE_FRAME_SIZE * 0.86,
      SPRITE_FRAME_SIZE,
      SPRITE_FRAME_SIZE
    );

    ctx.restore();

    // Subtle player identifier indicator under feet (P1 Amber / P2 Cyan)
    ctx.save();
    ctx.fillStyle = f.slot === 1 ? '#F59E0B' : '#22D3EE';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(f.x, GROUND_Y + 12);
    ctx.lineTo(f.x - 7, GROUND_Y + 21);
    ctx.lineTo(f.x + 7, GROUND_Y + 21);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: ActiveProjectile): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.facing, 1);

    if (p.style === 'slash_wave') {
      // Crescent energy blade wave
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, -30);
      ctx.quadraticCurveTo(28, 0, -12, 30);
      ctx.quadraticCurveTo(8, 0, -12, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.style === 'lightning_bolt') {
      // Jagged storm arc
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-36, -8);
      ctx.lineTo(-10, 10);
      ctx.lineTo(8, -12);
      ctx.lineTo(36, 4);
      ctx.stroke();

      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (p.style === 'ice_lance') {
      // Faceted glacial spear
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(-12, -14);
      ctx.lineTo(40, 0);
      ctx.lineTo(-12, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.style === 'shadow_kunai') {
      // Spinning void kunai
      ctx.rotate((1 - p.life / p.maxLife) * 24);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(0, -11);
      ctx.lineTo(28, 0);
      ctx.lineTo(0, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.style === 'shockwave') {
      // Molten ground tremor crest
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-38, 22);
      ctx.lineTo(-18, -22);
      ctx.lineTo(4, -6);
      ctx.lineTo(24, -28);
      ctx.lineTo(40, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Solar flame vortex orb
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
      grad.addColorStop(0, p.coreColor);
      grad.addColorStop(0.55, p.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: PooledParticle): void {
    const t = 1 - p.life / p.maxLife;
    const alpha = Math.max(0, 1 - t);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    if (p.kind === 'RING') {
      const r = p.size * (0.35 + t * 0.85);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.5, (1 - t) * 6);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'SLASH_ARC') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(2, (1 - t) * 11);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (0.6 + t * 0.4), -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = Math.max(1, (1 - t) * 4);
      ctx.stroke();
    } else if (p.kind === 'SHARD') {
      const s = p.size * (1 - t * 0.4);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(0, -s * 0.38);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.kind === 'SPARK') {
      // Tapered velocity streak, never a plain circle
      const len = p.size * (1.2 - t * 0.5);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-len * 0.5, 0);
      ctx.lineTo(len * 0.7, 0);
      ctx.stroke();
    } else {
      // Soft dust puff
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * (0.7 + t * 0.6), p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawTrainingBoxes(ctx: CanvasRenderingContext2D, f: CharacterController): void {
    const hurt = buildHurtbox(f.x, f.y, f.def.hurtbox.width, f.def.hurtbox.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hurt.x, hurt.y, hurt.width, hurt.height);

    if (f.activeMove && f.getAttackPhase() === 'ACTIVE' && !f.activeMove.projectile) {
      const atk = buildAttackHitbox(f.x, f.y, f.facing, f.activeMove.hitbox);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(atk.x, atk.y, atk.width, atk.height);
      ctx.strokeRect(atk.x, atk.y, atk.width, atk.height);
    }
    ctx.restore();
  }
}
