/**
 * CANDLEWAKE entry point.
 *
 * Also exposes `window.__candlewake` — a debug hook used by the automated
 * playtest and screenshot harness so the tools never have to simulate menus to
 * reach a scene.
 */

import { App } from '@/game/app';
import { TitleScene, CharCreateScene, JournalScene, SettingsScene } from '@/ui/menus';
import { GameState } from '@/game/state';
import { TouchControls } from '@/ui/touch';
import { BACKGROUNDS, CLUES, INTERACTABLES } from '@/data/content';
import { audio } from '@/core/audio';
import { getTileAtlas } from '@/art/tiles';

async function boot(): Promise<void> {
  const frame = document.getElementById('frame') as HTMLElement;
  const world = document.getElementById('world') as HTMLCanvasElement;
  const ui = document.getElementById('ui') as HTMLCanvasElement;
  const bootEl = document.getElementById('boot');

  // Building the tile atlas is the one genuinely front-loaded cost; do it
  // before the first frame so nothing pops in.
  getTileAtlas();

  const app = new App(frame, world, ui);
  app.push(new TitleScene());
  app.start();
  bootEl?.classList.add('gone');
  setTimeout(() => bootEl?.remove(), 500);

  // On-screen controls. Hidden until a real touch happens, so desktop is
  // untouched; without them the game is unplayable on a phone.
  const touch = new TouchControls(app.input);
  void touch;

  // --- debug / harness hook -------------------------------------------
  const dbg = {
    app,
    perf: () => app.debugInfo,
    /** Jump straight to a scene, seeding a plausible state where needed. */
    async gotoScene(name: string, opts: { background?: string; npc?: string } = {}) {
      const { ExploreScene } = await import('@/ui/explore');
      const { BattleScene } = await import('@/combat/battle');
      const seed = (room: string) => {
        const s = new GameState();
        const b =
          BACKGROUNDS.find((x) => x.id === opts.background) ?? BACKGROUNDS[0];
        s.profile.background = b.id;
        s.profile.look = { ...s.profile.look, uniform: b.uniform, accent: b.accent };
        s.profile.name = 'QUILLON';
        s.room = room;
        for (const it of b.items) s.addItem(it);
        s.addTessera(b.tessera);
        for (const [n, v] of Object.entries(b.relations)) s.adjustRelation(n, v);
        s.startQuest('find-hessa');
        app.state = s;
      };
      switch (name) {
        case 'title':
          app.replace(new TitleScene());
          break;
        case 'charcreate':
          app.replace(new CharCreateScene());
          break;
        case 'settings':
          app.replace(new TitleScene());
          app.push(new SettingsScene());
          break;
        case 'journal': {
          seed('c-bunk');
          for (const id of Object.keys(CLUES).slice(0, 7)) app.state.findClue(id);
          app.state.note('Woke to a muster tone that was not for you.');
          app.replace(new ExploreScene());
          app.push(new JournalScene());
          break;
        }
        case 'battle':
          seed('spine-duct');
          app.replace(new ExploreScene());
          app.push(new BattleScene('registry-sentinel', app.scene!));
          break;
        case 'chapter': {
          const { ChapterDecisionScene } = await import('@/ui/chapter');
          seed('c-bunk');
          for (const id of Object.keys(CLUES).slice(0, 8)) app.state.findClue(id);
          app.state.deductions.add('D1');
          app.state.deductions.add('D3');
          app.replace(new ExploreScene());
          app.push(new ChapterDecisionScene());
          break;
        }
        case 'deck-a':
        case 'a-command':
        case 'a-comms':
        case 'a-cabin':
        case 'a-strong':
        case 'a-spine': {
          // Deck A only exists after the Chapter Two threshold, so the seed has
          // to walk through it rather than teleporting past it — a room that
          // looks right only when the clearances are faked is not built.
          const { openChapterTwo } = await import('@/ui/chapter');
          seed(name === 'deck-a' ? 'a-command' : name);
          openChapterTwo(app.state, 'O2');
          app.replace(new ExploreScene());
          break;
        }
        case 'deck-f':
        case 'f-landing':
        case 'f-hold':
        case 'f-plant':
        case 'f-shuttle':
        case 'f-registry': {
          // Same rule as Deck A: walk the real gate rather than teleport past
          // it. The lift clearance comes from the chapter threshold, and the
          // vault clearance comes from driving the actual wheel interactable,
          // twice, exactly as a player has to \x7f so a shot of the Cold
          // Registry is a shot of a room somebody could stand in.
          const { openChapterTwo } = await import('@/ui/chapter');
          seed(name === 'deck-f' ? 'f-landing' : name);
          openChapterTwo(app.state, 'O4');
          for (let i = 0; i < 2; i++) {
            // Applying the returned flag is what ExploreScene.interact does
            // between presses; without it the second turn of the wheel would
            // re-read the notice forever.
            const res = INTERACTABLES['vault-dogs'].run(app.state);
            if (res.flag) app.state.setFlag(res.flag, true);
          }
          app.replace(new ExploreScene());
          break;
        }
        case 'kit': {
          // A triage aide standing at the muster station, having lifted a ward
          // tag and Trave's key: a state a real player reaches, and the only
          // one that shows all three detail states at once — a live verb, a
          // verb refused with its reason, and an object with no verb at all.
          // Shot in a corridor the screen is entirely grey and proves nothing.
          const { KitScene } = await import('@/ui/inventory');
          seed('c-muster');
          const med = BACKGROUNDS.find((x) => x.id === 'medical')!;
          app.state.profile.background = 'medical';
          app.state.inventory.clear();
          for (const it of med.items) app.state.addItem(it);
          app.state.addItem('hazard-tag');
          app.state.addItem('trave-key');
          app.replace(new ExploreScene());
          app.push(new KitScene());
          break;
        }
        case 'shipmap': {
          const { ShipMapScene } = await import('@/ui/shipmap');
          seed('c-commons');
          for (const r of ['c-bunk', 'c-corridor', 'c-commons', 'd-lift', 'd-triage',
                           'd-ward', 'b-lift', 'b-vestibule']) {
            app.state.visitRoom(r);
          }
          app.replace(new ExploreScene());
          app.push(new ShipMapScene());
          break;
        }
        case 'dialogue': {
          // Drops straight into a conversation so portraits and the speech box
          // can be reviewed in the context they are actually seen in.
          seed('c-commons');
          const ex = new ExploreScene();
          app.replace(ex);
          ex.startDialogue(app, opts.npc ?? 'stray');
          break;
        }
        case 'battle-tutorial':
          seed('c-commons');
          app.replace(new ExploreScene());
          app.push(new BattleScene('tutorial-spar', app.scene!));
          break;
        default: {
          // any room id
          const room = name.startsWith('room:') ? name.slice(5) : 'c-bunk';
          seed(room);
          app.replace(new ExploreScene());
          break;
        }
      }
      app.fadeTo(0);
    },
    state: () => app.state,
    /** Snapshot the playtest can assert against without reaching into scenes. */
    probe: () => ({
      scene: app.scene?.id ?? '-',
      battle: (app.scene as { debugMenu?: unknown })?.debugMenu ?? null,
      room: app.state.room,
      name: app.state.profile.name,
      background: app.state.profile.background,
      clues: app.state.foundClues().length,
      deductions: [...app.state.deductions],
      tesserae: app.state.tesserae.length,
      clock: app.state.clock(),
      relations: Object.fromEntries(
        [...app.state.relations.keys()].map((k) => [k, app.state.relationLevel(k)]),
      ),
      flags: Object.fromEntries(app.state.flags),
    }),
    async validate() {
      const { validateContent } = await import('@/dev/validate');
      return validateContent();
    },
    audio,
  };
  (window as unknown as Record<string, unknown>).__candlewake = dbg;
}

boot().catch((err) => {
  console.error('[candlewake] boot failed', err);
  const bootEl = document.getElementById('boot');
  if (bootEl) {
    bootEl.textContent = 'FAILED TO START — see console';
    bootEl.style.color = '#e0533f';
  }
});
