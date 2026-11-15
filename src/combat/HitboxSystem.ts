import { HitboxSpec } from '../characters/CharacterData';

export interface RectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function buildHurtbox(x: number, y: number, width: number, height: number): RectBox {
  return {
    x: x - width / 2,
    y: y - height,
    width,
    height,
  };
}

export function buildAttackHitbox(
  attackerX: number,
  attackerY: number,
  facing: 1 | -1,
  spec: HitboxSpec
): RectBox {
  const centerX = attackerX + facing * spec.offsetX;
  const topY = attackerY + spec.offsetY - spec.height / 2;
  return {
    x: centerX - spec.width / 2,
    y: topY,
    width: spec.width,
    height: spec.height,
  };
}

export function boxesOverlap(a: RectBox, b: RectBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
