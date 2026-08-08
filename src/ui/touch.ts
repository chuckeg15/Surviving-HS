/**
 * On-screen controls.
 *
 * The game was keyboard-only, which meant that on a phone it loaded correctly,
 * drew a title screen, and then sat there forever with no way to press
 * anything — indistinguishable, from the player's side, from "it didn't load".
 *
 * These are DOM elements rather than painted into the game canvas on purpose:
 * they must sit *outside* the 384x216 letterboxed frame so they never cover
 * the play area, and they need real pointer capture so a finger that slides off
 * a button still releases it.
 */

import { Action, Input } from '@/core/input';

const PAD_KEYS: [Action, string, string][] = [
  ['up', '▲', 'up'],
  ['left', '◀', 'left'],
  ['right', '▶', 'right'],
  ['down', '▼', 'down'],
];

export class TouchControls {
  private root: HTMLElement;
  private shown = false;

  constructor(private input: Input) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = `
      <style>
        #touch { position:fixed; inset:0; z-index:30; pointer-events:none;
                 display:none; font-family:ui-monospace,monospace;
                 -webkit-user-select:none; user-select:none;
                 -webkit-tap-highlight-color:transparent; touch-action:none; }
        #touch.on { display:block; }
        #touch .btn {
          position:absolute; pointer-events:auto; display:grid; place-items:center;
          background:rgba(34,52,61,.62); color:#c6d6cf;
          border:1px solid rgba(85,116,127,.75); border-radius:8px;
          font-size:19px; line-height:1; backdrop-filter:blur(2px);
          transition:background .08s linear;
        }
        #touch .btn.hit { background:rgba(84,224,200,.55); color:#04070a; }
        #touch .dpad .btn { width:58px; height:58px; }
        #touch .dpad { position:absolute; left:16px; bottom:18px;
                       width:184px; height:184px; }
        #touch .dpad .up    { left:63px; top:0; }
        #touch .dpad .left  { left:0;  top:63px; }
        #touch .dpad .right { left:126px; top:63px; }
        #touch .dpad .down  { left:63px; top:126px; }
        #touch .acts { position:absolute; right:16px; bottom:18px;
                       width:172px; height:184px; }
        #touch .acts .a { right:0;   bottom:56px; width:74px; height:74px;
                          font-size:15px; letter-spacing:.08em; }
        #touch .acts .b { right:84px; bottom:6px; width:66px; height:66px;
                          font-size:15px; letter-spacing:.08em; }
        #touch .acts .run { right:6px; bottom:0; width:64px; height:44px;
                            font-size:11px; letter-spacing:.1em; }
        #touch .top { position:absolute; right:12px; top:12px; display:flex; gap:8px; }
        #touch .top .btn { position:relative; width:56px; height:36px;
                           font-size:11px; letter-spacing:.12em; }
        @media (max-height: 460px) {
          #touch .dpad { transform:scale(.82); transform-origin:left bottom; }
          #touch .acts { transform:scale(.82); transform-origin:right bottom; }
        }
      </style>
      <div class="dpad">
        ${PAD_KEYS.map(([a, g, c]) => `<div class="btn ${c}" data-a="${a}">${g}</div>`).join('')}
      </div>
      <div class="acts">
        <div class="btn a"   data-a="confirm">OK</div>
        <div class="btn b"   data-a="cancel">BACK</div>
        <div class="btn run" data-a="run">RUN</div>
      </div>
      <div class="top">
        <div class="btn" data-a="journal">LOG</div>
        <div class="btn" data-a="menu">MENU</div>
      </div>
    `;
    document.body.appendChild(this.root);
    this.wire();

    // Reveal on the first genuine touch. Pointer events fire for mice too, so
    // check the pointer type — a desktop player should never see these.
    const reveal = (e: PointerEvent | TouchEvent) => {
      const isTouch =
        (e as PointerEvent).pointerType === 'touch' || (e as TouchEvent).touches !== undefined;
      if (isTouch) this.show(true);
    };
    window.addEventListener('pointerdown', reveal as EventListener, { passive: true });
    window.addEventListener('touchstart', reveal as EventListener, { passive: true });
    if (matchMedia('(hover: none) and (pointer: coarse)').matches) this.show(true);
  }

  private wire(): void {
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>('.btn'))) {
      const action = el.dataset.a as Action;
      const press = (e: PointerEvent) => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('hit');
        this.input.setVirtual(action, true);
      };
      const release = (e: PointerEvent) => {
        e.preventDefault();
        el.classList.remove('hit');
        this.input.setVirtual(action, false);
      };
      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      // A finger that slides off the button must release it, or the character
      // walks into a wall forever.
      el.addEventListener('pointerleave', release);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  show(v: boolean): void {
    if (this.shown === v) return;
    this.shown = v;
    this.root.classList.toggle('on', v);
    if (!v) this.input.clearVirtual();
  }

  get visible(): boolean {
    return this.shown;
  }

  dispose(): void {
    this.input.clearVirtual();
    this.root.remove();
  }
}
