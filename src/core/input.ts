/**
 * Input manager: keyboard + gamepad, remappable, with edge detection and
 * delayed auto-repeat for menus.
 *
 * Movement deliberately reads *held* state every frame and never queues, so a
 * key release stops the character on the same frame — the classic cause of
 * "floaty" top-down movement is polling on an interval instead of per frame.
 */

export const ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'confirm',
  'cancel',
  'menu',
  'journal',
  'map',
  'run',
  'skip',
] as const;

export type Action = (typeof ACTIONS)[number];

export type Binding = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Binding = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['KeyZ', 'Enter', 'Space'],
  cancel: ['KeyX', 'Escape', 'Backspace'],
  menu: ['KeyC', 'Tab'],
  journal: ['KeyQ'],
  map: ['KeyE'],
  run: ['ShiftLeft', 'ShiftRight'],
  skip: ['ControlLeft', 'ControlRight'],
};

/** Standard-gamepad button indices mapped to actions. */
const PAD_BUTTONS: Record<number, Action> = {
  0: 'confirm', // A / cross
  1: 'cancel', // B / circle
  2: 'journal', // X / square
  3: 'map', // Y / triangle
  8: 'cancel', // select
  9: 'menu', // start
  5: 'run',
  4: 'run',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

const REPEAT_DELAY = 0.28;
const REPEAT_RATE = 0.075;

export class Input {
  private bindings: Binding = structuredClone(DEFAULT_BINDINGS);
  private codeToAction = new Map<string, Action>();
  private held = new Set<Action>();
  private prevHeld = new Set<Action>();
  private repeatTimer = new Map<Action, number>();
  private repeatFired = new Set<Action>();
  private padIndex: number | null = null;
  private padPrev = new Set<Action>();
  private captureFn: ((code: string) => void) | null = null;
  private el: HTMLElement | Window;
  /** True once the player has produced any input; used to unlock audio. */
  gestured = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    // never swallow devtools / reload
    if (e.code === 'F5' || e.code === 'F12' || (e.ctrlKey && e.code === 'KeyR')) return;
    if (this.captureFn) {
      e.preventDefault();
      const fn = this.captureFn;
      this.captureFn = null;
      fn(e.code);
      return;
    }
    const a = this.codeToAction.get(e.code);
    if (a) {
      e.preventDefault();
      this.gestured = true;
      if (!this.held.has(a)) {
        this.held.add(a);
        this.repeatTimer.set(a, REPEAT_DELAY);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const a = this.codeToAction.get(e.code);
    if (a) {
      e.preventDefault();
      this.held.delete(a);
      this.repeatTimer.delete(a);
    }
  };

  /** Losing focus must release everything, or the player walks into a wall. */
  private onBlur = () => {
    this.held.clear();
    this.repeatTimer.clear();
  };

  private onPadConnect = (e: GamepadEvent) => {
    this.padIndex = e.gamepad.index;
  };
  private onPadDisconnect = (e: GamepadEvent) => {
    if (this.padIndex === e.gamepad.index) {
      this.padIndex = null;
      this.padPrev.clear();
      for (const a of this.padPrev) this.held.delete(a);
    }
  };

  constructor(el: HTMLElement | Window = window) {
    this.el = el;
    this.rebuild();
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);
    window.addEventListener('gamepadconnected', this.onPadConnect as EventListener);
    window.addEventListener('gamepaddisconnected', this.onPadDisconnect as EventListener);
    window.addEventListener('pointerdown', () => (this.gestured = true), { once: true });
  }

  private rebuild(): void {
    this.codeToAction.clear();
    for (const a of ACTIONS) for (const c of this.bindings[a]) this.codeToAction.set(c, a);
  }

  getBindings(): Binding {
    return structuredClone(this.bindings);
  }

  setBindings(b: Partial<Binding>): void {
    for (const a of ACTIONS) if (b[a]?.length) this.bindings[a] = [...b[a]!];
    this.rebuild();
  }

  resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.rebuild();
  }

  /** Rebind: the next key pressed becomes the primary code for `action`. */
  captureNext(action: Action, done: (code: string) => void): void {
    this.captureFn = (code) => {
      // don't allow a code to serve two actions
      for (const a of ACTIONS) {
        this.bindings[a] = this.bindings[a].filter((c) => c !== code);
        if (this.bindings[a].length === 0) this.bindings[a] = [...DEFAULT_BINDINGS[a]];
      }
      this.bindings[action] = [code];
      this.rebuild();
      done(code);
    };
  }

  cancelCapture(): void {
    this.captureFn = null;
  }
  get capturing(): boolean {
    return this.captureFn !== null;
  }

  private pollPad(): void {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad: Gamepad | null = null;
    if (this.padIndex !== null) pad = pads[this.padIndex] ?? null;
    if (!pad) {
      for (const p of pads) {
        if (p && p.connected) {
          pad = p;
          this.padIndex = p.index;
          break;
        }
      }
    }
    if (!pad) return;
    const now = new Set<Action>();
    for (const [idxStr, action] of Object.entries(PAD_BUTTONS)) {
      const b = pad.buttons[Number(idxStr)];
      if (b && b.pressed) now.add(action);
    }
    const DZ = 0.4;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    if (ax < -DZ) now.add('left');
    if (ax > DZ) now.add('right');
    if (ay < -DZ) now.add('up');
    if (ay > DZ) now.add('down');

    for (const a of now) {
      this.gestured = true;
      if (!this.held.has(a)) {
        this.held.add(a);
        this.repeatTimer.set(a, REPEAT_DELAY);
      }
    }
    for (const a of this.padPrev) {
      if (!now.has(a)) {
        this.held.delete(a);
        this.repeatTimer.delete(a);
      }
    }
    this.padPrev = now;
  }

  /** Call once per frame BEFORE game update. */
  beginFrame(dt: number): void {
    this.pollPad();
    this.repeatFired.clear();
    for (const [a, t] of this.repeatTimer) {
      const nt = t - dt;
      if (nt <= 0) {
        this.repeatFired.add(a);
        this.repeatTimer.set(a, REPEAT_RATE);
      } else {
        this.repeatTimer.set(a, nt);
      }
    }
  }

  /** Call once per frame AFTER game update. */
  endFrame(): void {
    this.prevHeld = new Set(this.held);
  }

  down(a: Action): boolean {
    return this.held.has(a);
  }

  /** True on the frame the action went down. */
  pressed(a: Action): boolean {
    return this.held.has(a) && !this.prevHeld.has(a);
  }

  released(a: Action): boolean {
    return !this.held.has(a) && this.prevHeld.has(a);
  }

  /** Edge OR auto-repeat — what menus should use. */
  repeated(a: Action): boolean {
    return this.pressed(a) || this.repeatFired.has(a);
  }

  anyPressed(): boolean {
    for (const a of ACTIONS) if (this.pressed(a)) return true;
    return false;
  }

  /** -1/0/1 pair from the held direction keys. */
  axis(): { x: number; y: number } {
    return {
      x: (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0),
      y: (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0),
    };
  }

  clearHeld(): void {
    this.held.clear();
    this.prevHeld.clear();
    this.repeatTimer.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
    window.removeEventListener('gamepadconnected', this.onPadConnect as EventListener);
    window.removeEventListener('gamepaddisconnected', this.onPadDisconnect as EventListener);
    void this.el;
  }
}

/** Human-readable key label for the controls screen. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  const map: Record<string, string> = {
    Space: 'SPACE',
    Enter: 'ENTER',
    Escape: 'ESC',
    Backspace: 'BKSP',
    ShiftLeft: 'L-SHIFT',
    ShiftRight: 'R-SHIFT',
    ControlLeft: 'L-CTRL',
    ControlRight: 'R-CTRL',
    Tab: 'TAB',
  };
  return map[code] ?? code.toUpperCase();
}
