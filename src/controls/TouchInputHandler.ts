import { FighterInput } from '../characters/CharacterController';

export type TouchButtonAction =
  | 'attack1'
  | 'attack2'
  | 'jump'
  | 'guard'
  | 'skill1'
  | 'skill2'
  | 'ultimate';

export class TouchInputHandler {
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();

  // Virtual joystick state (-1..1)
  joyX = 0;
  joyY = 0;
  private joyJumpLatched = false;

  // Multi-touch buttons
  private heldButtons = new Set<TouchButtonAction>();
  private justPressedButtons = new Set<TouchButtonAction>();

  onKeyDown = (code: string): void => {
    if (!this.heldKeys.has(code)) {
      this.justPressedKeys.add(code);
    }
    this.heldKeys.add(code);
  };

  onKeyUp = (code: string): void => {
    this.heldKeys.delete(code);
  };

  setJoystick(x: number, y: number): void {
    this.joyX = Math.max(-1, Math.min(1, x));
    this.joyY = Math.max(-1, Math.min(1, y));
    if (this.joyY < -0.58) {
      if (!this.joyJumpLatched) {
        this.justPressedButtons.add('jump');
        this.joyJumpLatched = true;
      }
    } else {
      this.joyJumpLatched = false;
    }
  }

  pressButton(action: TouchButtonAction): void {
    if (!this.heldButtons.has(action)) {
      this.justPressedButtons.add(action);
    }
    this.heldButtons.add(action);
  }

  releaseButton(action: TouchButtonAction): void {
    this.heldButtons.delete(action);
  }

  clearAll(): void {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.heldButtons.clear();
    this.justPressedButtons.clear();
    this.joyX = 0;
    this.joyY = 0;
    this.joyJumpLatched = false;
  }

  consumeFrameInput(): FighterInput {
    const left = this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft');
    const right = this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight');
    const keyMoveX = (right ? 1 : 0) - (left ? 1 : 0);

    const moveX = Math.abs(this.joyX) > 0.16 ? this.joyX : keyMoveX;
    const run =
      this.heldKeys.has('ShiftLeft') ||
      this.heldKeys.has('ShiftRight') ||
      Math.abs(this.joyX) > 0.78;

    const jumpHeld =
      this.heldKeys.has('KeyW') ||
      this.heldKeys.has('ArrowUp') ||
      this.heldKeys.has('Space') ||
      this.heldButtons.has('jump') ||
      this.joyY < -0.58;

    const jumpPressed =
      this.justPressedKeys.has('KeyW') ||
      this.justPressedKeys.has('ArrowUp') ||
      this.justPressedKeys.has('Space') ||
      this.justPressedButtons.has('jump');

    const guardHeld =
      this.heldKeys.has('KeyS') ||
      this.heldKeys.has('ArrowDown') ||
      this.heldKeys.has('KeyK') ||
      this.heldButtons.has('guard') ||
      this.joyY > 0.65;

    const attack1Pressed =
      this.justPressedKeys.has('KeyJ') ||
      this.justPressedButtons.has('attack1');

    const attack2Pressed =
      this.justPressedKeys.has('KeyL') ||
      this.justPressedButtons.has('attack2');

    const skill1Pressed =
      this.justPressedKeys.has('KeyU') ||
      this.justPressedButtons.has('skill1');

    const skill2Pressed =
      this.justPressedKeys.has('KeyI') ||
      this.justPressedButtons.has('skill2');

    const ultimatePressed =
      this.justPressedKeys.has('KeyO') ||
      this.justPressedButtons.has('ultimate');

    this.justPressedKeys.clear();
    this.justPressedButtons.clear();

    return {
      moveX,
      run,
      jumpPressed,
      jumpHeld,
      guardHeld,
      attack1Pressed,
      attack2Pressed,
      skill1Pressed,
      skill2Pressed,
      ultimatePressed,
    };
  }
}
