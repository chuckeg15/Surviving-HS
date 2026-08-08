/**
 * Deck travel.
 *
 * The Candlewake's spine lift is the only thing connecting the decks, which
 * makes it the game's throttle on where the player may be and when. A deck is
 * not listed until the story has given the player a reason to know it exists,
 * and not enterable until they have the clearance — so the lift panel is also
 * the clearest single readout of how much of the ship the player has earned.
 */

export interface LiftStop {
  deck: string;
  /** Room the lift opens onto. */
  room: string;
  spawn: string;
  label: string;
  /** Short line under the label — what the deck is for. */
  blurb: string;
  /**
   * Flag that must be set before the stop is even listed. Undefined = always
   * listed. A stop the player has never heard of should not appear at all;
   * seeing a locked door you have no reason to know about is just noise.
   */
  known?: string;
  /** Clearance required to travel. Undefined = open. */
  clearance?: string;
  /** Shown when refused. Must say what would fix it. */
  refuse?: string;
}

export const LIFT_STOPS: LiftStop[] = [
  {
    deck: 'C',
    room: 'c-corridor',
    spawn: 'from-lift',
    label: 'DECK C \x7f HABITATION',
    blurb: 'Berths, commons, the watch office.',
  },
  {
    deck: 'D',
    room: 'd-lift',
    spawn: 'default',
    label: 'DECK D \x7f MEDICAL',
    blurb: 'Triage, ward, hydroponics beyond.',
  },
  {
    deck: 'B',
    room: 'b-lift',
    spawn: 'default',
    label: 'DECK B \x7f REGISTRY',
    // The lift accepts anyone; the Registry FLOOR is what is gated, and Rask
    // can vouch. Gating the whole deck would put C8 out of reach for four of
    // the five backgrounds and make deduction D4 unreachable for them.
    blurb: 'Registry floor, the stacks, Vestibule offices.',
  },
  {
    deck: 'A',
    room: 'a-command',
    spawn: 'default',
    label: 'DECK A \x7f COMMAND',
    blurb: 'Sealed for the duration of the burn.',
    known: 'knows-deck-a',
    clearance: 'command',
    refuse: 'Deck A is sealed. The panel does not say by whose order.',
  },
];

/** Stops the player can currently see listed. */
export function visibleStops(has: (flag: string) => boolean): LiftStop[] {
  return LIFT_STOPS.filter((s) => !s.known || has(s.known));
}
