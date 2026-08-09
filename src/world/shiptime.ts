/**
 * The ship's clock, and what makes it move.
 *
 * Nothing here runs on a wall clock. A player can leave this game sitting on a
 * dialogue box for twenty minutes while the kettle boils, and a mystery whose
 * crew relocate and whose cradle deadline advances while nobody is looking at
 * the screen is a mystery that lies about cause and effect. Ship time therefore
 * advances on work done, and only on work done.
 *
 * One twenty-minute block passes for every three BEATS. A beat is a thing that
 * plausibly cost a crew member twenty minutes of a watch:
 *
 *   - a piece of evidence found
 *   - a deduction closed on the board
 *   - a projection fought to a conclusion
 *   - every fourth bulkhead transit — walking the ring is not free either
 *
 * The last one is what keeps a player who refuses to engage from freezing the
 * ship around themselves; the first three are what make the clock feel like a
 * consequence rather than a tax.
 *
 * Both counters live in flags rather than in module scope, so a save carries the
 * player's position inside the current block and the block itself is a pure
 * function of the beat count. Settling is therefore idempotent: a reload cannot
 * skip an hour, and a double-installed listener cannot run the watch at double
 * speed.
 */

import { bus } from '@/core/events';
import { GameState } from '@/game/state';

export const BEATS_PER_BLOCK = 3;
export const TRANSITS_PER_BEAT = 4;

const BEATS = 'watch-beats';
const TRANSITS = 'watch-transits';

function settle(s: GameState): void {
  const due = Math.floor((Number(s.flag(BEATS)) || 0) / BEATS_PER_BLOCK);
  if (due > s.timeBlock) s.advanceTime(due - s.timeBlock);
}

/**
 * Subscribes the clock to the beats. Returns the unsubscribe — the bus outlives
 * scenes, so the explore scene has to hand this back on exit or a second
 * playthrough in the same session counts every beat twice.
 */
export function installShipTime(s: GameState): () => void {
  const beat = () => {
    s.bumpFlag(BEATS);
    settle(s);
  };
  const offs = [
    bus.on('clue:found', beat),
    bus.on('clue:linked', ({ deductionId }) => {
      if (deductionId) beat();
    }),
    bus.on('combat:end', beat),
    bus.on('room:enter', () => {
      if (s.bumpFlag(TRANSITS) % TRANSITS_PER_BEAT === 0) beat();
    }),
  ];
  return () => {
    for (const off of offs) off();
  };
}
