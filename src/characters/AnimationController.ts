export type AnimationState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'JUMP'
  | 'FALL'
  | 'LAND'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'SKILL_1'
  | 'SKILL_2'
  | 'ULTIMATE'
  | 'HIT'
  | 'BLOCK'
  | 'VICTORY'
  | 'DEFEAT';

export interface AnimationClipSpec {
  row: number;
  frameCount: number;
  fps: number;
  loop: boolean;
}

export const ANIMATION_CLIPS: Record<AnimationState, AnimationClipSpec> = {
  IDLE: { row: 0, frameCount: 6, fps: 8, loop: true },
  WALK: { row: 1, frameCount: 6, fps: 10, loop: true },
  RUN: { row: 2, frameCount: 6, fps: 14, loop: true },
  JUMP: { row: 3, frameCount: 4, fps: 10, loop: false },
  FALL: { row: 4, frameCount: 4, fps: 10, loop: true },
  LAND: { row: 5, frameCount: 4, fps: 16, loop: false },
  ATTACK_1: { row: 6, frameCount: 6, fps: 20, loop: false },
  ATTACK_2: { row: 7, frameCount: 6, fps: 16, loop: false },
  SKILL_1: { row: 8, frameCount: 6, fps: 14, loop: false },
  SKILL_2: { row: 9, frameCount: 6, fps: 14, loop: false },
  ULTIMATE: { row: 10, frameCount: 6, fps: 12, loop: false },
  HIT: { row: 11, frameCount: 4, fps: 14, loop: false },
  BLOCK: { row: 12, frameCount: 4, fps: 10, loop: true },
  VICTORY: { row: 13, frameCount: 6, fps: 8, loop: true },
  DEFEAT: { row: 14, frameCount: 4, fps: 8, loop: false },
};

export class AnimationController {
  private state: AnimationState = 'IDLE';
  private elapsed = 0;
  private frameIndex = 0;
  private finished = false;

  getState(): AnimationState {
    return this.state;
  }

  getFrameIndex(): number {
    return this.frameIndex;
  }

  getRow(): number {
    return ANIMATION_CLIPS[this.state].row;
  }

  isFinished(): boolean {
    return this.finished;
  }

  getNormalizedTime(): number {
    const clip = ANIMATION_CLIPS[this.state];
    const total = clip.frameCount / clip.fps;
    return total > 0 ? Math.min(1, this.elapsed / total) : 1;
  }

  setState(next: AnimationState, forceRestart = false): void {
    if (this.state === next && !forceRestart) return;
    this.state = next;
    this.elapsed = 0;
    this.frameIndex = 0;
    this.finished = false;
  }

  update(dt: number, speedScale = 1): void {
    const clip = ANIMATION_CLIPS[this.state];
    this.elapsed += dt * speedScale;
    const rawFrame = Math.floor(this.elapsed * clip.fps);

    if (clip.loop) {
      this.frameIndex = rawFrame % clip.frameCount;
      this.finished = false;
    } else if (rawFrame >= clip.frameCount) {
      this.frameIndex = clip.frameCount - 1;
      this.finished = true;
    } else {
      this.frameIndex = Math.max(0, rawFrame);
      this.finished = false;
    }
  }
}
