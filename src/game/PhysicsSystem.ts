import { GROUND_Y, STAGE_LEFT, STAGE_RIGHT } from '../arena/ArenaData';

export const GRAVITY = 1920; // px / s^2

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
}

export interface StepPhysicsResult {
  justLanded: boolean;
}

export function stepFighterPhysics(body: PhysicsBody, dt: number): StepPhysicsResult {
  const wasGrounded = body.grounded;

  if (!body.grounded) {
    body.vy += GRAVITY * dt;
  }

  body.x += body.vx * dt;
  body.y += body.vy * dt;

  // Ground collision
  let justLanded = false;
  if (body.y >= GROUND_Y) {
    body.y = GROUND_Y;
    if (!wasGrounded && body.vy > 0) {
      justLanded = true;
    }
    body.vy = 0;
    body.grounded = true;
  } else {
    body.grounded = false;
  }

  // Stage wall boundaries
  const halfW = body.width * 0.5;
  if (body.x < STAGE_LEFT + halfW) {
    body.x = STAGE_LEFT + halfW;
    if (body.vx < 0) body.vx = 0;
  } else if (body.x > STAGE_RIGHT - halfW) {
    body.x = STAGE_RIGHT - halfW;
    if (body.vx > 0) body.vx = 0;
  }

  return { justLanded };
}

/**
 * Separates overlapping fighters horizontally so they don't occupy identical ground coordinates.
 */
export function resolveFighterPushbox(a: PhysicsBody, b: PhysicsBody): void {
  const verticalOverlap =
    a.y > b.y - b.height * 0.85 &&
    a.y - a.height * 0.85 < b.y;
  if (!verticalOverlap) return;

  const minDist = (a.width + b.width) * 0.44;
  const dx = b.x - a.x;
  const absDx = Math.abs(dx);

  if (absDx < minDist) {
    const push = (minDist - absDx) * 0.5;
    const sign = dx >= 0 ? 1 : -1;
    a.x -= sign * push;
    b.x += sign * push;

    const halfA = a.width * 0.5;
    const halfB = b.width * 0.5;
    a.x = Math.max(STAGE_LEFT + halfA, Math.min(STAGE_RIGHT - halfA, a.x));
    b.x = Math.max(STAGE_LEFT + halfB, Math.min(STAGE_RIGHT - halfB, b.x));
  }
}
