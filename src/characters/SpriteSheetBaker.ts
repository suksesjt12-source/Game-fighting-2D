import { ANIMATION_CLIPS, AnimationState } from './AnimationController';
import { CharacterDefinition, CharacterId } from './CharacterData';
import { getCharacter } from './CharacterRegistry';

export const SPRITE_FRAME_SIZE = 224;
export const SPRITE_COLS = 6;
export const SPRITE_ROWS = 15;

export interface BakedSpriteSheet {
  characterId: CharacterId;
  canvas: HTMLCanvasElement;
  flashCanvas: HTMLCanvasElement;
  frameSize: number;
}

interface PoseParams {
  hipX: number;
  hipY: number;
  torsoTilt: number; // radians
  headTilt: number;
  frontShoulder: number; // angle radians
  frontElbow: number;
  backShoulder: number;
  backElbow: number;
  frontHip: number;
  frontKnee: number;
  backHip: number;
  backKnee: number;
  scarfWave: number;
  weaponSlash: number; // 0..1 intensity
  weaponAngleOffset: number;
  guardShield: boolean;
  auraIntensity: number; // 0..1
}

const sheetCache = new Map<CharacterId, BakedSpriteSheet>();

export function getBakedSpriteSheet(id: CharacterId): BakedSpriteSheet {
  const existing = sheetCache.get(id);
  if (existing) return existing;
  const def = getCharacter(id);
  const baked = bakeCharacterSheet(def);
  sheetCache.set(id, baked);
  return baked;
}

function bakeCharacterSheet(def: CharacterDefinition): BakedSpriteSheet {
  const width = SPRITE_COLS * SPRITE_FRAME_SIZE;
  const height = SPRITE_ROWS * SPRITE_FRAME_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const states = Object.keys(ANIMATION_CLIPS) as AnimationState[];
  for (const state of states) {
    const clip = ANIMATION_CLIPS[state];
    for (let f = 0; f < clip.frameCount; f++) {
      const t = clip.frameCount > 1 ? f / (clip.frameCount - 1) : 0;
      const cellX = f * SPRITE_FRAME_SIZE;
      const cellY = clip.row * SPRITE_FRAME_SIZE;
      ctx.save();
      ctx.translate(cellX + SPRITE_FRAME_SIZE * 0.48, cellY + SPRITE_FRAME_SIZE * 0.86);
      const scale = def.id === 'razen' ? 1.12 : def.id === 'yuna' ? 0.94 : 1.0;
      ctx.scale(scale, scale);
      const pose = computePose(state, f, clip.frameCount, t);
      drawAnimeFighterFrame(ctx, def, pose, state, t);
      ctx.restore();
    }
  }

  // Pre-bake white silhouette flash sheet for zero-allocation hit flashes
  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = width;
  flashCanvas.height = height;
  const fCtx = flashCanvas.getContext('2d')!;
  fCtx.drawImage(canvas, 0, 0);
  fCtx.globalCompositeOperation = 'source-in';
  fCtx.fillStyle = '#FFFFFF';
  fCtx.fillRect(0, 0, width, height);

  return {
    characterId: def.id,
    canvas,
    flashCanvas,
    frameSize: SPRITE_FRAME_SIZE,
  };
}

function computePose(state: AnimationState, frame: number, total: number, t: number): PoseParams {
  const phase = (frame / Math.max(1, total)) * Math.PI * 2;
  const base: PoseParams = {
    hipX: 0,
    hipY: -64,
    torsoTilt: 0.08,
    headTilt: 0.02,
    frontShoulder: 0.45,
    frontElbow: -1.15,
    backShoulder: -0.35,
    backElbow: -1.0,
    frontHip: 0.35,
    frontKnee: 0.25,
    backHip: -0.4,
    backKnee: 0.35,
    scarfWave: Math.sin(phase) * 0.2,
    weaponSlash: 0,
    weaponAngleOffset: -0.3,
    guardShield: false,
    auraIntensity: 0,
  };

  switch (state) {
    case 'IDLE': {
      const bob = Math.sin(phase) * 3.5;
      base.hipY += bob;
      base.frontShoulder += Math.sin(phase) * 0.06;
      base.backShoulder -= Math.sin(phase) * 0.06;
      break;
    }
    case 'WALK': {
      const s = Math.sin(phase);
      base.hipY -= Math.abs(s) * 4;
      base.torsoTilt = 0.14;
      base.frontHip = s * 0.52;
      base.frontKnee = Math.max(0.1, -s * 0.45 + 0.25);
      base.backHip = -s * 0.52;
      base.backKnee = Math.max(0.1, s * 0.45 + 0.25);
      base.frontShoulder = -s * 0.35 + 0.3;
      base.backShoulder = s * 0.35 - 0.1;
      break;
    }
    case 'RUN': {
      const s = Math.sin(phase);
      base.hipY -= Math.abs(s) * 6;
      base.torsoTilt = 0.42;
      base.headTilt = -0.18;
      base.frontHip = s * 0.78 + 0.1;
      base.frontKnee = s < 0 ? 0.95 : 0.22;
      base.backHip = -s * 0.78 + 0.1;
      base.backKnee = s > 0 ? 0.95 : 0.22;
      base.frontShoulder = -s * 0.55 + 0.5;
      base.backShoulder = s * 0.55 - 0.4;
      base.scarfWave = 0.5 + Math.sin(phase * 2) * 0.25;
      break;
    }
    case 'JUMP': {
      base.hipY -= 12 + t * 10;
      base.torsoTilt = 0.18;
      base.frontHip = 0.85;
      base.frontKnee = 1.05;
      base.backHip = -0.2;
      base.backKnee = 0.65;
      base.frontShoulder = -0.7;
      base.backShoulder = -0.9;
      base.scarfWave = 0.65;
      break;
    }
    case 'FALL': {
      base.hipY -= 8;
      base.torsoTilt = 0.12;
      base.frontHip = 0.5;
      base.frontKnee = 0.6;
      base.backHip = -0.45;
      base.backKnee = 0.35;
      base.frontShoulder = -1.1;
      base.backShoulder = -1.2;
      base.scarfWave = -0.55 + Math.sin(phase) * 0.2;
      break;
    }
    case 'LAND': {
      base.hipY += 12 * (1 - t);
      base.torsoTilt = 0.32 * (1 - t) + 0.08;
      base.frontHip = 0.68;
      base.frontKnee = 0.8;
      base.backHip = -0.55;
      base.backKnee = 0.7;
      break;
    }
    case 'ATTACK_1': {
      if (t < 0.25) {
        base.hipX = -8;
        base.torsoTilt = -0.1;
        base.frontShoulder = -1.2;
        base.frontElbow = -0.8;
      } else if (t < 0.65) {
        base.hipX = 22;
        base.torsoTilt = 0.34;
        base.frontShoulder = 1.35;
        base.frontElbow = -0.1;
        base.frontHip = 0.65;
        base.backHip = -0.65;
        base.weaponSlash = 1.0;
        base.weaponAngleOffset = 0.35;
      } else {
        base.hipX = 10 * (1 - t);
        base.torsoTilt = 0.15;
        base.frontShoulder = 0.8;
        base.frontElbow = -0.5;
      }
      break;
    }
    case 'ATTACK_2': {
      if (t < 0.3) {
        base.hipY += 10;
        base.torsoTilt = 0.35;
        base.frontShoulder = 1.1;
        base.frontElbow = -0.4;
      } else if (t < 0.7) {
        base.hipX = 20;
        base.hipY -= 12;
        base.torsoTilt = -0.18;
        base.frontShoulder = -1.45;
        base.frontElbow = -0.15;
        base.frontHip = 0.7;
        base.weaponSlash = 1.0;
        base.weaponAngleOffset = -0.5;
      } else {
        base.torsoTilt = 0.05;
        base.frontShoulder = -0.3;
      }
      break;
    }
    case 'SKILL_1': {
      base.auraIntensity = 0.85;
      if (t < 0.35) {
        base.hipX = -10;
        base.torsoTilt = -0.15;
        base.frontShoulder = -0.8;
        base.backShoulder = -0.7;
      } else {
        base.hipX = 24;
        base.torsoTilt = 0.36;
        base.frontShoulder = 1.48;
        base.frontElbow = 0;
        base.backShoulder = 1.25;
        base.backElbow = -0.1;
        base.weaponSlash = 1.0;
      }
      break;
    }
    case 'SKILL_2': {
      base.auraIntensity = 0.95;
      if (t < 0.3) {
        base.hipY -= 14;
        base.torsoTilt = -0.2;
        base.frontShoulder = -1.9;
        base.frontElbow = -0.2;
      } else if (t < 0.75) {
        base.hipX = 24;
        base.hipY -= 4;
        base.torsoTilt = 0.42;
        base.frontShoulder = 1.3;
        base.frontElbow = -0.05;
        base.weaponSlash = 1.0;
      } else {
        base.hipX = 12;
        base.torsoTilt = 0.2;
      }
      break;
    }
    case 'ULTIMATE': {
      base.auraIntensity = 1.0;
      if (t < 0.35) {
        base.hipY -= 10;
        base.torsoTilt = -0.25;
        base.frontShoulder = -2.1;
        base.backShoulder = -1.9;
        base.scarfWave = 0.9;
      } else {
        base.hipX = 32;
        base.torsoTilt = 0.5;
        base.frontShoulder = 1.55;
        base.frontElbow = 0;
        base.backShoulder = -0.9;
        base.frontHip = 0.85;
        base.backHip = -0.8;
        base.weaponSlash = 1.0;
        base.scarfWave = 1.0;
      }
      break;
    }
    case 'HIT': {
      base.hipX = -14;
      base.torsoTilt = -0.38;
      base.headTilt = -0.35;
      base.frontShoulder = -0.7;
      base.backShoulder = -0.9;
      base.frontHip = 0.2;
      base.backHip = -0.2;
      break;
    }
    case 'BLOCK': {
      base.hipX = -4;
      base.hipY += 6;
      base.torsoTilt = 0.14;
      base.frontShoulder = 0.9;
      base.frontElbow = -1.75;
      base.backShoulder = 0.75;
      base.backElbow = -1.65;
      base.frontHip = 0.5;
      base.frontKnee = 0.5;
      base.backHip = -0.5;
      base.backKnee = 0.45;
      base.guardShield = true;
      break;
    }
    case 'VICTORY': {
      const sway = Math.sin(phase) * 0.08;
      base.torsoTilt = -0.08;
      base.headTilt = -0.08;
      base.frontShoulder = -1.85 + sway;
      base.frontElbow = -0.25;
      base.backShoulder = 0.35;
      base.frontHip = 0.25;
      base.backHip = -0.3;
      base.scarfWave = 0.4 + sway;
      base.auraIntensity = 0.45;
      break;
    }
    case 'DEFEAT': {
      base.hipY += 28 * t + 10;
      base.torsoTilt = 0.45 + 0.55 * t;
      base.headTilt = 0.45;
      base.frontHip = 0.9;
      base.frontKnee = 1.25;
      base.backHip = -0.6;
      base.backKnee = 1.1;
      base.frontShoulder = 0.9;
      base.frontElbow = -0.2;
      break;
    }
  }

  return base;
}

function drawAnimeFighterFrame(
  ctx: CanvasRenderingContext2D,
  def: CharacterDefinition,
  pose: PoseParams,
  state: AnimationState,
  t: number
): void {
  const pal = def.palette;
  const lineW = 2.6;

  // Aura glow behind character on skills / ultimate / victory
  if (pose.auraIntensity > 0) {
    ctx.save();
    const grad = ctx.createRadialGradient(pose.hipX, pose.hipY - 24, 12, pose.hipX, pose.hipY - 24, 88);
    grad.addColorStop(0, pal.energyCore);
    grad.addColorStop(0.45, pal.energy + 'AA');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55 * pose.auraIntensity;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pose.hipX, pose.hipY - 24, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Flowing cloak / scarf / headband tails behind torso
  drawTrailingGarment(ctx, def, pose);

  // Back leg
  drawLeg(ctx, pose.hipX - 6, pose.hipY + 4, pose.backHip, pose.backKnee, pal.secondary, pal.outline, lineW, true);

  // Back arm
  const torsoTopX = pose.hipX + Math.sin(pose.torsoTilt) * 44;
  const torsoTopY = pose.hipY - Math.cos(pose.torsoTilt) * 44;
  drawArm(ctx, torsoTopX - 6, torsoTopY + 6, pose.backShoulder, pose.backElbow, pal.primary, pal.skinShadow, pal.accent, pal.outline, lineW, true);

  // Front leg
  drawLeg(ctx, pose.hipX + 6, pose.hipY + 4, pose.frontHip, pose.frontKnee, pal.secondary, pal.outline, lineW, false);

  // Torso jacket / haori / armor
  drawTorso(ctx, def, pose, torsoTopX, torsoTopY, lineW);

  // Head + anime hair + eyes
  drawHeadAndHair(ctx, def, pose, torsoTopX, torsoTopY, lineW);

  // Front arm + character-specific signature weapon
  drawFrontArmAndWeapon(ctx, def, pose, torsoTopX, torsoTopY, lineW, state, t);

  // Block energy barrier
  if (pose.guardShield) {
    ctx.save();
    ctx.strokeStyle = pal.energy;
    ctx.fillStyle = pal.energy + '33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pose.hipX + 34, pose.hipY - 76);
    ctx.lineTo(pose.hipX + 52, pose.hipY - 40);
    ctx.lineTo(pose.hipX + 52, pose.hipY + 26);
    ctx.lineTo(pose.hipX + 34, pose.hipY + 56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  hipAngle: number,
  kneeAngle: number,
  color: string,
  outline: string,
  lineW: number,
  isBack: boolean
): void {
  const thighLen = 30;
  const shinLen = 32;
  const kneeX = hipX + Math.sin(hipAngle) * thighLen;
  const kneeY = hipY + Math.cos(hipAngle) * thighLen;
  const ankleX = kneeX + Math.sin(hipAngle - kneeAngle) * shinLen;
  const ankleY = kneeY + Math.cos(hipAngle - kneeAngle) * shinLen;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Thigh
  ctx.strokeStyle = outline;
  ctx.lineWidth = 15 + lineW;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.stroke();

  ctx.strokeStyle = isBack ? shadeHex(color, -18) : color;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.stroke();

  // Shin & armored boot
  ctx.strokeStyle = outline;
  ctx.lineWidth = 12 + lineW;
  ctx.beginPath();
  ctx.moveTo(kneeX, kneeY);
  ctx.lineTo(ankleX, ankleY);
  ctx.stroke();

  ctx.strokeStyle = isBack ? '#111827' : '#1E293B';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(kneeX, kneeY);
  ctx.lineTo(ankleX, ankleY);
  ctx.stroke();

  // Boot foot silhouette
  ctx.fillStyle = isBack ? '#0F172A' : '#1E293B';
  ctx.strokeStyle = outline;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(ankleX - 5, ankleY - 3);
  ctx.lineTo(ankleX + 16, ankleY + 3);
  ctx.lineTo(ankleX + 14, ankleY + 9);
  ctx.lineTo(ankleX - 6, ankleY + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  shX: number,
  shY: number,
  shAngle: number,
  elAngle: number,
  sleeveColor: string,
  skinColor: string,
  accentColor: string,
  outline: string,
  lineW: number,
  isBack: boolean
): { handX: number; handY: number; forearmAngle: number } {
  const upperLen = 22;
  const foreLen = 22;
  const elbowX = shX + Math.sin(shAngle) * upperLen;
  const elbowY = shY + Math.cos(shAngle) * upperLen;
  const forearmAngle = shAngle - elAngle;
  const handX = elbowX + Math.sin(forearmAngle) * foreLen;
  const handY = elbowY + Math.cos(forearmAngle) * foreLen;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Upper arm
  ctx.strokeStyle = outline;
  ctx.lineWidth = 11 + lineW;
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(elbowX, elbowY);
  ctx.stroke();

  ctx.strokeStyle = isBack ? shadeHex(sleeveColor, -22) : sleeveColor;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(elbowX, elbowY);
  ctx.stroke();

  // Forearm / gauntlet
  ctx.strokeStyle = outline;
  ctx.lineWidth = 9 + lineW;
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.strokeStyle = isBack ? shadeHex(accentColor, -30) : accentColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Fist
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = outline;
  ctx.lineWidth = lineW * 0.85;
  ctx.beginPath();
  ctx.arc(handX, handY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  return { handX, handY, forearmAngle };
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  def: CharacterDefinition,
  pose: PoseParams,
  topX: number,
  topY: number,
  lineW: number
): void {
  const pal = def.palette;
  ctx.save();
  ctx.translate(pose.hipX, pose.hipY);
  ctx.rotate(pose.torsoTilt);

  const wTop = def.id === 'razen' ? 22 : 16;
  const wBot = def.id === 'razen' ? 14 : 11;

  // Main jacket / chest armor
  ctx.fillStyle = pal.primary;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(-wTop, -46);
  ctx.lineTo(wTop, -46);
  ctx.lineTo(wBot, 4);
  ctx.lineTo(-wBot, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cel-shaded shadow side on back half of torso
  ctx.fillStyle = 'rgba(7, 10, 20, 0.34)';
  ctx.beginPath();
  ctx.moveTo(-wTop + 2, -44);
  ctx.lineTo(0, -44);
  ctx.lineTo(-2, 2);
  ctx.lineTo(-wBot + 2, 2);
  ctx.closePath();
  ctx.fill();

  // High collar / lapel accent
  ctx.fillStyle = pal.accent;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, -48);
  ctx.lineTo(-14, -56);
  ctx.lineTo(4, -50);
  ctx.lineTo(13, -44);
  ctx.lineTo(4, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sash / waist belt
  ctx.fillStyle = pal.secondary;
  ctx.fillRect(-wBot - 1, -4, wBot * 2 + 2, 10);
  ctx.strokeRect(-wBot - 1, -4, wBot * 2 + 2, 10);

  // Belt buckle
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, -3, 7, 8);

  // Razen heavy lion shoulder pauldron
  if (def.id === 'razen') {
    ctx.fillStyle = '#3F3F46';
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(0, -42, 15, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(4, -45, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Neck connector
  ctx.save();
  ctx.fillStyle = pal.skinShadow;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(topX - 4, topY - 10, 8, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTrailingGarment(
  ctx: CanvasRenderingContext2D,
  def: CharacterDefinition,
  pose: PoseParams
): void {
  const pal = def.palette;
  const topX = pose.hipX + Math.sin(pose.torsoTilt) * 40;
  const topY = pose.hipY - Math.cos(pose.torsoTilt) * 40;
  const wave = pose.scarfWave;

  ctx.save();
  ctx.fillStyle = def.id === 'kairo' ? pal.accent : def.id === 'shiro' ? '#BAE6FD' : pal.primary;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2.2;

  // Dynamic flowing coat tail or scarf ribbon
  ctx.beginPath();
  ctx.moveTo(topX - 6, topY + 2);
  ctx.quadraticCurveTo(topX - 30 - wave * 24, topY + 12, topX - 46 - wave * 34, topY + 34 - wave * 14);
  ctx.lineTo(topX - 36 - wave * 26, topY + 46 - wave * 10);
  ctx.quadraticCurveTo(topX - 18, topY + 24, topX - 4, topY + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower coat tails for Ignis / Reina / Shiro / Kairo
  if (def.id === 'ignis' || def.id === 'reina' || def.id === 'shiro' || def.id === 'kairo') {
    ctx.fillStyle = pal.secondary;
    ctx.beginPath();
    ctx.moveTo(pose.hipX - 8, pose.hipY);
    ctx.lineTo(pose.hipX - 28 - wave * 18, pose.hipY + 36);
    ctx.lineTo(pose.hipX - 10 - wave * 10, pose.hipY + 40);
    ctx.lineTo(pose.hipX + 4, pose.hipY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawHeadAndHair(
  ctx: CanvasRenderingContext2D,
  def: CharacterDefinition,
  pose: PoseParams,
  torsoTopX: number,
  torsoTopY: number,
  lineW: number
): void {
  const pal = def.palette;
  ctx.save();
  ctx.translate(torsoTopX + 2, torsoTopY - 16);
  ctx.rotate(pose.torsoTilt * 0.4 + pose.headTilt);

  // Jaw / anime face profile
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(-11, -12);
  ctx.lineTo(10, -12);
  ctx.lineTo(13, 0);
  ctx.lineTo(8, 12);
  ctx.lineTo(-4, 14);
  ctx.lineTo(-12, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cheek shadow
  ctx.fillStyle = pal.skinShadow;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.lineTo(-2, -4);
  ctx.lineTo(-4, 12);
  ctx.lineTo(-11, 3);
  ctx.closePath();
  ctx.fill();

  // Yuna shinobi mask
  if (def.id === 'yuna') {
    ctx.fillStyle = '#581C87';
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(13, 0);
    ctx.lineTo(9, 13);
    ctx.lineTo(-6, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Sharp anime eye + brow
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(2, -3);
  ctx.lineTo(11, -4);
  ctx.lineTo(10, 1);
  ctx.lineTo(3, 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.eye;
  ctx.beginPath();
  ctx.arc(7.5, -1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1, -5);
  ctx.lineTo(12, -3.5);
  ctx.stroke();

  // Character-unique anime hair silhouette
  ctx.fillStyle = pal.hair;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (def.id === 'kairo') {
    ctx.moveTo(-14, 2);
    ctx.lineTo(-22, -8);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-18, -26);
    ctx.lineTo(-5, -20);
    ctx.lineTo(0, -31);
    ctx.lineTo(7, -20);
    ctx.lineTo(17, -23);
    ctx.lineTo(12, -10);
    ctx.lineTo(15, -4);
    ctx.lineTo(2, -8);
    ctx.lineTo(-8, -3);
  } else if (def.id === 'reina') {
    ctx.moveTo(-16, 6);
    ctx.lineTo(-20, -6);
    ctx.lineTo(-13, -18);
    ctx.lineTo(0, -23);
    ctx.lineTo(14, -17);
    ctx.lineTo(17, -4);
    ctx.lineTo(11, -8);
    ctx.lineTo(4, -5);
    ctx.lineTo(-6, 4);
  } else if (def.id === 'razen') {
    ctx.moveTo(-15, 2);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-16, -24);
    ctx.lineTo(-4, -29);
    ctx.lineTo(8, -24);
    ctx.lineTo(15, -14);
    ctx.lineTo(8, -10);
    ctx.lineTo(-6, -8);
  } else if (def.id === 'shiro') {
    ctx.moveTo(-15, 8);
    ctx.lineTo(-17, -12);
    ctx.lineTo(-4, -22);
    ctx.lineTo(10, -20);
    ctx.lineTo(16, -4);
    ctx.lineTo(10, -8);
    ctx.lineTo(4, 1);
    ctx.lineTo(-6, -4);
  } else if (def.id === 'yuna') {
    // High twin-tail + bangs
    ctx.moveTo(-14, 2);
    ctx.lineTo(-15, -16);
    ctx.lineTo(0, -22);
    ctx.lineTo(13, -16);
    ctx.lineTo(14, -5);
    ctx.lineTo(4, -8);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Twin-tail flowing back
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.quadraticCurveTo(-30, -22, -38 - pose.scarfWave * 14, -2);
    ctx.quadraticCurveTo(-24, -4, -14, -8);
    ctx.closePath();
  } else {
    // Ignis swept flame-spikes
    ctx.moveTo(-14, 0);
    ctx.lineTo(-26, -10);
    ctx.lineTo(-16, -18);
    ctx.lineTo(-24, -28);
    ctx.lineTo(-4, -24);
    ctx.lineTo(6, -30);
    ctx.lineTo(15, -16);
    ctx.lineTo(11, -8);
    ctx.lineTo(-4, -7);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Kairo golden headband
  if (def.id === 'kairo') {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-12, -13, 24, 5);
    ctx.strokeRect(-12, -13, 24, 5);
  }

  ctx.restore();
}

function drawFrontArmAndWeapon(
  ctx: CanvasRenderingContext2D,
  def: CharacterDefinition,
  pose: PoseParams,
  torsoTopX: number,
  torsoTopY: number,
  lineW: number,
  state: AnimationState,
  t: number
): void {
  const pal = def.palette;
  const arm = drawArm(
    ctx,
    torsoTopX + 5,
    torsoTopY + 7,
    pose.frontShoulder,
    pose.frontElbow,
    pal.primary,
    pal.skin,
    pal.accent,
    pal.outline,
    lineW,
    false
  );

  ctx.save();
  ctx.translate(arm.handX, arm.handY);
  ctx.rotate(-arm.forearmAngle + Math.PI * 0.5 + pose.weaponAngleOffset);

  if (def.id === 'kairo') {
    // Eclipse Katana
    ctx.fillStyle = '#18181B';
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 2;
    ctx.fillRect(-3, -6, 6, 16);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-7, -7, 14, 4);
    ctx.fillStyle = pose.weaponSlash > 0 ? pal.energyCore : '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(-2, -7);
    ctx.lineTo(2, -7);
    ctx.lineTo(4, -56);
    ctx.lineTo(-1, -62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.id === 'reina') {
    // Twin Thunder Saber
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-3, -6, 6, 14);
    ctx.fillStyle = pal.energy;
    ctx.strokeStyle = pal.energyCore;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(3, -6);
    ctx.lineTo(2, -48);
    ctx.lineTo(-1, -54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.id === 'razen') {
    // Heavy Iron Lion Gauntlet
    ctx.fillStyle = '#3F3F46';
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(-9, -12, 18, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-7, -10, 14, 5);
  } else if (def.id === 'shiro') {
    // Glacial Ice Lance
    ctx.fillStyle = pal.energyCore;
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(5, -6);
    ctx.lineTo(0, -64);
    ctx.lineTo(-5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.id === 'yuna') {
    // Shadow Kunai Dagger
    ctx.fillStyle = '#18181B';
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(5, -8);
    ctx.lineTo(0, -34);
    ctx.lineTo(-5, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Ignis Solar Flame Orb around fist
    ctx.fillStyle = pal.energy;
    ctx.strokeStyle = pal.energyCore;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 10 + pose.weaponSlash * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Dynamic anime slash arc on active attack frames
  if (pose.weaponSlash > 0 && (state === 'ATTACK_1' || state === 'ATTACK_2' || state === 'SKILL_2' || state === 'ULTIMATE')) {
    ctx.save();
    ctx.globalAlpha = 0.85 * Math.sin(t * Math.PI);
    ctx.strokeStyle = pal.energy;
    ctx.lineWidth = state === 'ULTIMATE' ? 14 : 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -24, state === 'ULTIMATE' ? 70 : 48, -Math.PI * 0.75, Math.PI * 0.35);
    ctx.stroke();

    ctx.strokeStyle = pal.energyCore;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -24, state === 'ULTIMATE' ? 68 : 46, -Math.PI * 0.7, Math.PI * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}
