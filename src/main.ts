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
import { BACKGROUNDS, CLUES } from '@/data/content';
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

  // --- debug / harness hook -------------------------------------------
  const dbg = {
    app,
    perf: () => app.debugInfo,
    /** Jump straight to a scene, seeding a plausible state where needed. */
    async gotoScene(name: string, opts: { background?: string } = {}) {
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
