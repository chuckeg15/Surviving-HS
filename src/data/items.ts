/**
 * The item table.
 *
 * Every id here is one the game actually puts in a player's hands: the five
 * background kits in BACKGROUNDS, the tag lifted off the ward supply cart, and
 * the key stolen from Trave's rack. Nothing else belongs in the file. An entry
 * nothing grants is a line no player will ever read; an id nothing defines
 * renders in the kit list as a raw string, which is the fault this table exists
 * to remove.
 *
 * `use` is the honest part of the record. Most of what this crew carry is
 * carried, not spent, and a verb offered on a coil of gasket tape is a lie the
 * interface tells once per player and is never trusted about again. The three
 * items that do carry a verb are the three the chapter was written to need:
 * CANON section 6 lists seven ways into duct 9-C, and routes 2 and 4 \x7f the
 * Commons breaker and the forged quarantine tag \x7f were flags the hatch had
 * always checked for and nothing had ever set.
 */

import { GameState } from '@/game/state';
import { PAL } from '@/art/palette';

export type ItemCategory = 'key' | 'tool' | 'consumable' | 'record';

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  key: 'KEY',
  tool: 'TOOL',
  consumable: 'CONSUMABLE',
  record: 'RECORD',
};

export const CATEGORY_COLOR: Record<ItemCategory, string> = {
  key: PAL.amber3,
  tool: PAL.iron5,
  consumable: PAL.halo3,
  record: PAL.brine4,
};

export interface UseOutcome {
  /** Toast line. */
  message: string;
  /** Read out in the detail pane afterwards. */
  lines: string[];
}

/** What a consumable does to the cast holding it. Combat reads this. */
export interface BattleEffect {
  integrity: number;
  coherence: number;
  message: string;
}

/**
 * `blocked` is separate from `run` so the screen can grey the verb and name the
 * reason *before* the player commits. A menu that accepts the press and then
 * explains why nothing happened has already wasted the press.
 */
export type ItemUse =
  | {
      where: 'world';
      prompt: string;
      blocked: (s: GameState) => string | null;
      run: (s: GameState) => UseOutcome;
    }
  | { where: 'battle'; prompt: string; effect: BattleEffect };

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  /** Provenance. Objects on this hull have numbers, and the numbers are the character. */
  stamp: string;
  text: string;
  /** Absent means the object is only carried \x7f the world reads it, or it reads you. */
  use?: ItemUse;
}

/**
 * Hanging a tag is not opening the hatch; it makes the hatch openable, and the
 * player still has to walk over and turn the wheel. Keeping the two apart is
 * what stops the kit screen becoming a second, worse way to play the room.
 */
function quarantineTagUse(id: string, blank: boolean): ItemUse {
  return {
    where: 'world',
    prompt: 'Hang it on the duct hatch wheel.',
    blocked: (s) => {
      if (s.has('duct-open')) return 'The hatch is already open.';
      if (s.has('hazard-tag-placed')) return 'A tag is already hanging on that wheel.';
      if (s.room !== 'c-muster') return 'Nothing here is under a quarantine order.';
      return null;
    },
    run: (s) => {
      s.removeItem(id);
      s.setFlag('hazard-tag-placed', true);
      s.note('Hung a quarantine tag on duct hatch 9-C.');
      const lines = [
        'You hang the tag off the hatch wheel at eye height, where a tag is meant to be read and not handled.',
        'The tell-tale considers it for a second and flips itself from live to amber.',
        'A quarantined duct is a duct the Watch will not enter.',
      ];
      if (blank) {
        // An empty ward field reads as a forgery to anyone who stops and reads
        // it, and stopping to read things is the entire job of the Watch.
        s.suspicion += 6;
        lines.push(
          'The ward number field is blank. It holds until somebody stands close enough to notice that.',
        );
      }
      return { message: 'Quarantine tag hung', lines };
    },
  };
}

const TABLE: ItemDef[] = [
  {
    id: 'duct-key',
    name: 'DUCT KEY 9-C',
    category: 'key',
    stamp: 'T&V STORES \x7f ISSUE 9-C/044',
    text:
      'A brass stub on orange cord, worn round at the bit by two years of the same eleven hatches. ' +
      'Every spine hatch on the ship opens for it. Nobody has ever asked you to sign it back in, ' +
      'and until this watch no spine hatch was restricted.',
  },
  {
    id: 'gasket-tape',
    name: 'GASKET TAPE',
    category: 'tool',
    stamp: 'T&V STORES \x7f LOT 118-G',
    text:
      'Half a roll of warm-set compound on a paper core. Ninety seconds to set, four atmospheres ' +
      'held, and you have never once finished a roll before losing it. Hessa went into the spine ' +
      'this watch carrying the same thing.',
  },
  {
    id: 'blank-hazard-tag',
    name: 'HAZARD TAG, BLANK',
    category: 'consumable',
    stamp: 'MEDICAL \x7f FORM 21 \x7f UNNUMBERED',
    text:
      'Orange card on a wire loop, intake issue, with the ward number field never filled in. ' +
      'A tag is not authority. A tag is what authority looks like from four metres away, ' +
      'which is as close as the Watch will come to a quarantine.',
    use: quarantineTagUse('blank-hazard-tag', true),
  },
  {
    id: 'hazard-tag',
    name: 'HAZARD TAG',
    category: 'consumable',
    stamp: 'MEDICAL \x7f WARD PAD STOCK',
    text:
      'Taken off the pad on the supply cart, where they sit unnumbered in a stack of two hundred. ' +
      'Identical in every respect to the ones that mean something. Nobody counts these; ' +
      'not counting them is most of what makes them useful.',
    use: quarantineTagUse('hazard-tag', false),
  },
  {
    id: 'analgesic',
    name: 'ANALGESIC, ONE DOSE',
    category: 'consumable',
    stamp: 'MEDICAL \x7f SINGLE DOSE \x7f LOT 4471',
    text:
      'One dose in a foil sleeve, issued for crush and burn. It fixes nothing. It buys back the ' +
      'twenty minutes in which a person could steady their hands, which is the whole of its ' +
      'clinical value and the entire reason looms are held and not worn.',
    use: {
      where: 'battle',
      prompt: 'Take it while projecting. Steadies your grip on the cast.',
      effect: {
        integrity: 0,
        coherence: 12,
        message: 'The edge comes off. Your grip on the shape steadies \x7f coherence recovered.',
      },
    },
  },
  {
    id: 'tally-slate',
    name: 'TALLY SLATE',
    category: 'record',
    stamp: 'REGISTRY \x7f SLATE 7 \x7f SIX MONTHS',
    text:
      'Cracked at the corner, holding six months of reconciliations nobody read. It totals. ' +
      'It does not explain, and it has never been asked to. Every discrepancy on it was closed ' +
      'the same way: by writing the second number down underneath the first.',
  },
  {
    id: 'watch-baton',
    name: 'PATROL BATON',
    category: 'tool',
    stamp: "SHIP'S WATCH \x7f ISSUE 3",
    text:
      'Eighteen inches of moulded polymer on a lanyard, issued against your name and ' +
      'countersigned by Warden Trave. Two hundred and twelve people aboard and the Watch has ' +
      'never needed it. It is carried so that everyone can see it is carried.',
  },
  {
    id: 'incident-slate',
    name: 'INCIDENT SLATE',
    category: 'record',
    stamp: "SHIP'S WATCH \x7f STOCK 1180-1199",
    text:
      'Blank incident stock, numbered in sequence so that a missing number is a question ' +
      'somebody has to answer. Nineteen of yours are still blank. Third watch has used one ' +
      'number tonight and filed nothing against it.',
  },
  {
    id: 'breaker-key',
    name: 'BREAKER KEY',
    category: 'tool',
    stamp: 'ENGINEERING \x7f DECK C BOARD',
    text:
      'Square-drive, stamped C, cut for the Deck C distribution board and nothing else on the ' +
      'ship. Engineering signs one out per watch. In eleven months nobody has asked for it back, ' +
      'because nobody has ever needed the board opened during a watch.',
    use: {
      where: 'world',
      prompt: 'Open the Commons board and pull the hatch tell-tale.',
      blocked: (s) => {
        if (s.has('telltale-killed')) return 'That breaker is already out.';
        if (s.has('duct-open')) return 'The hatch is already open.';
        if (s.room !== 'c-commons') return 'No board here. Deck C runs off the Commons panel.';
        return null;
      },
      run: (s) => {
        s.setFlag('telltale-killed', true);
        s.note('Pulled the hatch tell-tale breaker at the Commons board.');
        return {
          message: 'Tell-tale circuit dead',
          lines: [
            'The board cover comes off with two turns and hangs on its hinge, the way it was designed to.',
            'Third row, seventh breaker: SPINE HATCH TELL-TALE, C DECK. You pull it and the strip goes dark.',
            'Nothing else on the deck changes. Nothing else is meant to. Somebody will notice at handover.',
          ],
        };
      },
    },
  },
  {
    id: 'loom-spanner',
    name: 'LOOM SPANNER',
    category: 'tool',
    stamp: 'ENGINEERING \x7f TOOL 6 \x7f 32MM COLLAR',
    text:
      'A collar spanner for projector housings, thirty-two millimetre, with the jaw filed down ' +
      'where somebody used it on something it was not cut for. Everybody does. Everybody signs ' +
      'the tool log to say they did not.',
  },
  {
    id: 'trave-key',
    name: "WARDEN'S SPINE KEY",
    category: 'key',
    stamp: "SHIP'S WATCH \x7f NOT ISSUED TO YOU",
    text:
      'Second from the left on the office rack, on a loop of orange cord, and now in your pocket. ' +
      'The hatch will not care whose hand it is in. The rack has a gap in it that anyone standing ' +
      'in that room can see, and Trave stands in that room.',
  },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  TABLE.map((i) => [i.id, i]),
);

/** Kit-list order. Stable across saves because it comes from the table, not the Map. */
export const ITEM_ORDER: string[] = TABLE.map((i) => i.id);

/**
 * A held id with no entry still has to render as something a bug report can
 * quote, rather than crashing the only screen that would show it.
 */
export function itemDef(id: string): ItemDef {
  return (
    ITEMS[id] ?? {
      id,
      name: id.toUpperCase(),
      category: 'tool',
      stamp: 'UNLISTED \x7f NO STORES RECORD',
      text: 'Not on any manifest this ship carries. Report the id.',
    }
  );
}

/** Everything currently held, in table order, with any unlisted ids after it. */
export function heldItems(s: GameState): { def: ItemDef; count: number }[] {
  const out: { def: ItemDef; count: number }[] = [];
  for (const id of ITEM_ORDER) {
    const n = s.itemCount(id);
    if (n > 0) out.push({ def: ITEMS[id], count: n });
  }
  for (const [id, n] of s.inventory) {
    if (n > 0 && !ITEMS[id]) out.push({ def: itemDef(id), count: n });
  }
  return out;
}

/**
 * Why USE cannot fire from where the player is standing, or null if it can.
 * Items with no verb at all return a reason too, so the screen never has to
 * decide what to say about a length of gasket tape.
 */
export function useBlockedBy(s: GameState, def: ItemDef): string | null {
  if (!def.use) {
    // A key has no verb because the lock is the thing that acts. Saying
    // "nothing to do with it" about the duct key would be a flat lie.
    return def.category === 'key'
      ? 'Carried. The lock reads it; you do not present it.'
      : 'Carried. Nothing here takes it.';
  }
  if (def.use.where === 'battle') return 'Only while you are projecting a cast.';
  return def.use.blocked(s);
}

/** Fires the verb. Returns null if it was not usable here \x7f callers check first. */
export function useItem(s: GameState, id: string): UseOutcome | null {
  const def = itemDef(id);
  if (def.use?.where !== 'world') return null;
  if (def.use.blocked(s) !== null) return null;
  return def.use.run(s);
}

// --- combat hook ------------------------------------------------------
//
// Combat owns its own scene and menu; this side only says which held items are
// consumable in a fight and what spending one does. BattleScene needs to offer
// them and apply the returned effect.

export function battleItems(s: GameState): ItemDef[] {
  return heldItems(s)
    .map((h) => h.def)
    .filter((d) => d.use?.where === 'battle');
}

/** Spends one and returns what it did, or null if the player has none. */
export function spendBattleItem(s: GameState, id: string): BattleEffect | null {
  const def = ITEMS[id];
  if (!def || def.use?.where !== 'battle') return null;
  if (!s.removeItem(id)) return null;
  return def.use.effect;
}
