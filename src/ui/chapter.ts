/**
 * The Chapter One decision.
 *
 * ChapterEndScene existed and was never reachable — the four outcomes were
 * written, the summary screen was built, and nothing in the game ever
 * instantiated either. This is the missing half: the moment the player is
 * asked what to do with what they have.
 *
 * Design rules:
 *  - Every option is listed, always. An option the player cannot take is shown
 *    greyed with the reason, because "you could have done this if you had
 *    proved X" is the sentence that makes a mystery's endings feel earned
 *    rather than arbitrary.
 *  - The outcomes diverge in world state, not in wording. Each sets different
 *    flags, and O2 actually takes evidence away.
 *  - Saying nothing is a real, respectable option and is never punished with
 *    a worse screen. It is the best-informed route and it costs a person.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { audio } from '@/core/audio';
import { GameState } from '@/game/state';
import { ChapterEndScene } from '@/ui/menus';
import { settings } from '@/core/settings';

interface Outcome {
  id: string;
  label: string;
  blurb: string;
  /** Undefined = always available. */
  gate?: (s: GameState) => boolean;
  /** Shown when gated. Must name what would unlock it. */
  locked: string;
  title: string;
  body: (s: GameState) => string[];
  apply: (s: GameState) => void;
}

const OUTCOMES: Outcome[] = [
  {
    id: 'O1',
    label: 'Put it to Warden Trave',
    blurb: 'He forged the record. Say so to his face.',
    gate: (s) => s.hasDeduction('D3'),
    locked: 'You would need to have proved she was taken, not lost.',
    title: 'A MAN WHO STOPPED PRETENDING',
    body: () => [
      'Trave listens to the whole of it without once reaching for the regulations, ' +
        'which is how you know he already knew.',
      'He pulls her out of the cradle himself, four days early. She comes up ' +
        'missing a week and most of a Tuesday, and she comes up.',
      'He does not resign. He goes back on watch at 06:00 because the watch has ' +
        'to be stood. But he files nothing, and the Registrar will notice that ' +
        'the filing stopped.',
    ],
    apply: (s) => {
      s.setFlag('hessa-safe', true);
      s.setFlag('trave-broke', true);
      s.setFlag('sabbat-alerted', true);
      s.adjustRelation('trave', 3);
      s.adjustFaction('watch', 2);
    },
  },
  {
    id: 'O2',
    label: 'File it with Registrar Sabbat',
    blurb: 'The correct procedure. Complete the file.',
    locked: '',
    title: 'THE FILE IS COMPLETE',
    body: (s) => [
      'The Registrar thanks you, and means it, and says so on your record.',
      s.has('found-hessa')
        ? 'Hessa Quill is transferred at 09:00. Genuinely transferred, this time, to ' +
          'a berth on a hull you will not see again. The file describes a crew ' +
          'member who raised a concern and was accommodated.'
        : 'Hessa Quill is transferred at 09:00, and the file describes a crew member ' +
          'who raised a concern and was accommodated.',
      'Your access widens in the morning, exactly as promised. You will be able ' +
        'to go almost anywhere, and there will be almost nothing left to find.',
    ],
    apply: (s) => {
      s.setFlag('hessa-lost', true);
      s.setFlag('board-asset', true);
      s.grantClearance('registry');
      s.adjustRelation('sabbat', 3);
      s.adjustFaction('board', 3);
      // The cost: unlinked evidence is folded into the file and gone.
      for (const id of s.foundClues()) {
        const linked = s.foundClues().some((o) => o !== id && s.isLinked(id, o));
        if (!linked) s.loseClue(id);
      }
    },
  },
  {
    id: 'O3',
    label: 'Take it to Bosun Stray',
    blurb: 'The Ninth Watch can get her out tonight.',
    gate: (s) => s.hasDeduction('D5'),
    locked: 'You would need to know where she actually is.',
    title: 'A DOOR OPENED FROM THE WRONG SIDE',
    body: () => [
      'Stray does not thank you and does not hesitate. Four of them go down to ' +
        'Medical at 04:40 and come back up with Hessa Quill wrapped in somebody ' +
        "else's coat.",
      'By 05:10 the ship is under a lockdown nobody has explained. By 05:30 your ' +
        'name is on a list that is not a crew roster.',
      'Stray tells you that you did the right thing. She is telling the truth, ' +
        'and she is also counting you as an asset, and both of those are going to ' +
        'stay true for a long time.',
    ],
    apply: (s) => {
      s.setFlag('hessa-safe', true);
      s.setFlag('ship-lockdown', true);
      s.setFlag('watch-listed', true);
      s.adjustRelation('stray', 3);
      s.adjustFaction('ninth', 3);
      s.adjustFaction('board', -2);
      s.suspicion += 45;
    },
  },
  {
    id: 'O4',
    label: 'Say nothing. Keep the slate.',
    blurb: 'Nobody is saved tonight. You keep everything you have.',
    locked: '',
    title: 'THIRD WATCH ENDS',
    body: (s) => [
      'You go back to Berth 14 and you lie down in your clothes and you do not sleep.',
      s.has('found-hessa')
        ? 'Somewhere below you a cradle is running at sixty-one per cent and will be ' +
          'finished by Thursday. You know exactly where it is. You have written ' +
          'none of it down anywhere anyone can take from you.'
        : 'You do not know where she is. You know that the record is a lie, and you ' +
          'have kept every piece of the reason why.',
      'Nobody knows what you know. That is the only advantage you have, and you ' +
        'have all of it.',
    ],
    apply: (s) => {
      s.setFlag('kept-quiet', true);
      s.setFlag('sabbat-unaware', true);
    },
  },
];

export class ChapterDecisionScene implements Scene {
  readonly id = 'chapter-decision';
  readonly modal = true;
  private index = 0;
  private confirming = false;

  enter(app: App): void {
    audio.setMusic('weight', { fade: 1.5 });
    void app;
  }

  private available(s: GameState, o: Outcome): boolean {
    return !o.gate || o.gate(s);
  }

  update(app: App, _dt: number): void {
    const input = app.input;
    const s = app.state;

    if (this.confirming) {
      if (input.pressed('cancel')) {
        this.confirming = false;
        audio.sfx('ui.back');
        return;
      }
      if (input.pressed('confirm')) {
        const o = OUTCOMES[this.index];
        audio.sfx('ui.select');
        o.apply(s);
        s.finishQuest('find-hessa', o.id);
        app.transition(new ChapterEndScene(o.id, o.title, o.body(s)));
      }
      return;
    }

    if (input.repeated('down')) {
      this.index = (this.index + 1) % OUTCOMES.length;
      audio.sfx('ui.move');
    }
    if (input.repeated('up')) {
      this.index = (this.index - 1 + OUTCOMES.length) % OUTCOMES.length;
      audio.sfx('ui.move');
    }
    if (input.pressed('cancel')) {
      audio.sfx('ui.back');
      app.pop();
      return;
    }
    if (input.pressed('confirm')) {
      if (!this.available(s, OUTCOMES[this.index])) {
        audio.sfx('ui.error');
        return;
      }
      this.confirming = true;
      audio.sfx('ui.open');
    }
  }

  draw(app: App, p: Painter): void {
    const s = app.state;
    const st = settings.get();
    p.scrim(PAL.void0, 0.9);

    p.text('THIRD WATCH ENDS AT 08:00', VW / 2, 14, { color: PAL.iron5, align: 'center' });
    p.text('WHAT DO YOU DO WITH IT?', VW / 2, 26, {
      color: PAL.halo3,
      align: 'center',
    });
    p.dotRule(40, 40, VW - 80, PAL.iron2, 3);

    const top = 50;
    OUTCOMES.forEach((o, i) => {
      const y = top + i * 30;
      const sel = i === this.index;
      const ok = this.available(s, o);
      if (sel) p.rect(14, y - 3, VW - 28, 27, mix(PAL.void2, PAL.halo1, 0.35));
      p.text(sel ? '\x05' : ' ', 18, y, { color: ok ? PAL.halo3 : PAL.iron3 });
      p.text(o.label, 28, y, { color: !ok ? PAL.iron3 : sel ? PAL.bone3 : PAL.bone1 });
      // A locked option states what would have unlocked it. Hiding it would
      // make the ending feel arbitrary instead of earned.
      p.text(ok ? o.blurb : o.locked, 28, y + 11, {
        color: ok ? PAL.iron5 : PAL.ember2,
      });
      if (!ok && st.symbolMarkers) {
        p.text('\x0A', VW - 22, y, { color: PAL.ember2 });
      }
    });

    p.text(
      `evidence ${s.foundClues().length}    conclusions ${s.deductions.size}`,
      18,
      VH - 20,
      { color: PAL.iron4 },
    );
    p.text('Z choose    X wait', VW - 18, VH - 20, { color: PAL.iron4, align: 'right' });

    if (this.confirming) {
      const o = OUTCOMES[this.index];
      const w = 260;
      const x = ((VW - w) / 2) | 0;
      const y = 70;
      p.scrim(PAL.void0, 0.6);
      p.panel(x, y, w, 62, 'terminal');
      p.text('THIS ENDS THE CHAPTER', x + 8, y + 8, { color: PAL.amber3 });
      p.textBlock(o.label + '. There is no going back to this hour.', x + 8, y + 22, w - 16, {
        color: PAL.bone2,
      });
      p.text('Z confirm    X reconsider', x + 8, y + 48, { color: PAL.iron5 });
    }
  }
}

/** True once the player has assembled enough to be making a decision at all. */
export function decisionAvailable(s: GameState): boolean {
  return s.deductions.size > 0 || s.foundClues().length >= 4;
}
