/**
 * The crew of Deck C: appearance, schedule, and dialogue.
 *
 * Knowledge boundaries are enforced by construction — each tree only contains
 * lines that character could possibly say. Stray does not know about the Cold
 * Registry. Fen knows who was where and nothing else. Trave knows everything
 * about the night and will only say it if cornered with evidence.
 */

import { ActorLook } from '@/art/actors';
import { PAL } from '@/art/palette';
import { DialogueDef } from '@/game/dialogue';
import { GameState, relationAtLeast } from '@/game/state';
import { clearancesOf } from '@/data/content';

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  look: ActorLook;
  /** room id per time block; index clamps to the last entry. */
  schedule: string[];
  /** Where in the room they stand, in tiles. */
  post: Record<string, [number, number]>;
  dialogue: DialogueDef;
}

const look = (o: Partial<ActorLook>): ActorLook => ({
  frame: 'average',
  skin: 3,
  hair: 'crop',
  hairColor: PAL.rust1,
  eyeColor: PAL.brine3,
  uniform: 'spinehand',
  accent: PAL.amber2,
  accessory: 'none',
  ...o,
});

// =====================================================================
// BOSUN ANNEKE STRAY — Ninth Watch. Pragmatic. Will spend you.
// =====================================================================
const stray: NpcDef = {
  id: 'stray',
  name: 'BOSUN STRAY',
  role: 'Bosun, third watch',
  look: look({
    frame: 'broad',
    skin: 2,
    hair: 'topknot',
    hairColor: PAL.iron2,
    uniform: 'spinehand',
    accent: PAL.moss3,
    accessory: 'earpiece',
  }),
  schedule: ['c-muster', 'c-muster', 'c-muster', 'c-commons', 'c-commons', 'c-muster'],
  post: { 'c-muster': [5, 6], 'c-commons': [4, 8] },
  dialogue: {
    entry: (s) => {
      if (s.hasDeduction('D3') && !s.has('told-stray-taken')) return 'taken';
      if (s.hasClue('mass-manifest') && !s.sawNode('stray', 'weight')) return 'weight';
      if (s.npc('stray').met) return 'again';
      return 'first';
    },
    nodes: {
      first: {
        id: 'first',
        speaker: 'stray',
        expr: 'concerned',
        text: "You're up early for someone who isn't on the board. What do you want?",
        choices: [
          {
            text: 'Hessa Quill missed muster.',
            tone: 'honest',
            to: 'hessa',
            do: (s) => s.npc('stray').met = true,
          },
          {
            text: "I'm looking for a transfer record that makes sense.",
            tone: 'technical',
            to: 'hessa',
            if: (s) => s.hasClue('transfer-record'),
            do: (s) => s.npc('stray').met = true,
          },
          { text: 'Nothing. Wrong hatch.', tone: 'silent', to: 'brushoff' },
        ],
      },
      brushoff: {
        id: 'brushoff',
        speaker: 'stray',
        text: 'Then stop standing in my muster station.',
        end: true,
      },
      hessa: {
        id: 'hessa',
        speaker: 'stray',
        expr: 'concerned',
        text: (s) =>
          relationAtLeast(s.relationLevel('stray'), 'professional')
            ? 'She came to me at ten to three. Out of breath. Holding a photo-slate like it was hot.\n\nShe said: the keel\'s the wrong weight.'
            : "Quill transferred. It's on the board. That's what the board is for.",
        choices: [
          {
            text: 'What did you tell her?',
            tone: 'press',
            if: (s) => relationAtLeast(s.relationLevel('stray'), 'professional'),
            to: 'toldher',
          },
          {
            text: "You don't believe the board any more than I do.",
            tone: 'press',
            if: (s) => !relationAtLeast(s.relationLevel('stray'), 'professional'),
            to: 'thaw',
          },
          {
            text: "[Spinehand] She's my shift partner. I'd know if she transferred.",
            tone: 'honest',
            if: (s) => s.profile.background === 'maintenance',
            to: 'thaw',
            do: (s) => s.adjustRelation('stray', 12),
          },
          { text: 'Let it go for now.', tone: 'silent', to: 'brushoff' },
        ],
      },
      thaw: {
        id: 'thaw',
        speaker: 'stray',
        expr: 'wry',
        text:
          "...No. I don't.\n\nShe came to me at ten to three, out of breath, holding a photo-slate. " +
          "She said the keel's the wrong weight. I told her to go to bed.\n\nI have thought about that four times an hour since.",
        onEnter: (s) => {
          s.findClue('stray-testimony');
          s.adjustRelation('stray', 8);
          s.addRelationState('stray', 'grieving');
        },
        next: 'toldher',
      },
      toldher: {
        id: 'toldher',
        speaker: 'stray',
        expr: 'sad',
        text:
          "I told her to go to bed.\n\nI've been a bosun nineteen years. You learn which complaints " +
          'are worth a filing and which ones end your contract. I got that one wrong.',
        onEnter: (s) => s.findClue('stray-testimony'),
        choices: [
          {
            text: 'What is the keel supposed to weigh?',
            tone: 'technical',
            to: 'weightq',
          },
          {
            text: 'Who else did she talk to?',
            tone: 'press',
            to: 'whoelse',
          },
          {
            text: 'Help me get into the duct she was working.',
            tone: 'press',
            to: 'ductask',
            if: (s) => s.hasClue('stray-testimony'),
          },
          { text: "That's enough for now.", tone: 'neutral', to: 'out' },
        ],
      },
      weightq: {
        id: 'weightq',
        speaker: 'stray',
        text:
          "Four thousand four hundred and ten tonnes, declared. There's a trim panel in the Commons " +
          'that says what she actually flies. Nobody looks at it because looking at it is not anybody\'s job.',
        onEnter: (s) => s.setFlag('told-about-trim', true),
        next: 'toldher',
      },
      whoelse: {
        id: 'whoelse',
        speaker: 'stray',
        expr: 'concerned',
        text:
          "Me. That's it, far as I know. Half an hour later the Warden was walking the ring at a " +
          "pace I have never once seen him walk.\n\nMake of that what you like. I've made something of it.",
        onEnter: (s) => s.setFlag('stray-trave-hint', true),
        next: 'toldher',
      },
      ductask: {
        id: 'ductask',
        speaker: 'stray',
        text: (s) =>
          relationAtLeast(s.relationLevel('stray'), 'trusting')
            ? "Nine-C. Ivo's on the hatch.\n\nI can put him on a story for two minutes. Two. Not three."
            : "Nine-C. Ivo's on the hatch and Ivo does everything by the card.\n\nAsk me again when I know what you'd do with it.",
        choices: [
          {
            text: 'Do it. Two minutes is enough.',
            tone: 'press',
            if: (s) => relationAtLeast(s.relationLevel('stray'), 'trusting'),
            to: 'ductyes',
          },
          {
            text: 'What would convince you?',
            tone: 'honest',
            if: (s) => !relationAtLeast(s.relationLevel('stray'), 'trusting'),
            to: 'convince',
          },
          { text: 'Later.', tone: 'neutral', to: 'toldher' },
        ],
      },
      convince: {
        id: 'convince',
        speaker: 'stray',
        expr: 'wry',
        text:
          'Bring me something that is not a feeling. A number. A mark on a deck. Anything I could ' +
          'put in front of forty people without being laughed off the ring.',
        next: 'toldher',
      },
      ductyes: {
        id: 'ductyes',
        speaker: 'stray',
        expr: 'neutral',
        text:
          "Then go and stand near the hatch and don't look like you're waiting.\n\nWhen you hear me " +
          'start on the Deck-E flood story, you move.',
        onEnter: (s, c) => {
          s.setFlag('ivo-distracted', true);
          s.adjustRelation('stray', 6);
          c.toast('Stray will draw Ivo off the hatch', 'good');
        },
        end: true,
      },
      weight: {
        id: 'weight',
        speaker: 'stray',
        expr: 'surprised',
        text:
          "Seventeen hundred tonnes.\n\nSay that again slowly and listen to yourself say it. " +
          'Seventeen hundred tonnes that nobody wrote down.',
        onEnter: (s) => s.adjustRelation('stray', 10),
        next: 'toldher',
      },
      taken: {
        id: 'taken',
        speaker: 'stray',
        expr: 'angry',
        text:
          'Say it plainly. I want to hear you say it plainly, because if you say it plainly then ' +
          'I have to do something about it.',
        choices: [
          {
            text: 'Somebody dragged her out of that duct.',
            tone: 'honest',
            to: 'takenyes',
          },
          {
            text: "I'm not ready to say it.",
            tone: 'silent',
            to: 'toldher',
          },
        ],
      },
      takenyes: {
        id: 'takenyes',
        speaker: 'stray',
        expr: 'angry',
        text:
          "Right.\n\nThen you and I are in something now, and I'm going to be honest with you " +
          'about what that means: I will use this. I will use you. I would rather you knew.',
        onEnter: (s) => {
          s.setFlag('told-stray-taken', true);
          s.adjustRelation('stray', 22);
          s.addRelationState('stray', 'aligned');
          s.adjustFaction('ninth-watch', 20);
          s.note('Told Bosun Stray that Hessa was taken.');
        },
        end: true,
      },
      again: {
        id: 'again',
        speaker: 'stray',
        text: 'Still up. Still asking.',
        choices: [
          { text: 'About Hessa.', tone: 'neutral', to: 'toldher' },
          { text: 'Nothing yet.', tone: 'silent', to: 'out' },
        ],
      },
      out: { id: 'out', speaker: 'stray', text: 'Mm.', end: true },
    },
  },
};

// =====================================================================
// FEN BELLWEATHER — galley hand, 19. Knows who was where.
// =====================================================================
const fen: NpcDef = {
  id: 'fen',
  name: 'FEN',
  role: 'Galley hand',
  look: look({
    frame: 'slight',
    skin: 5,
    hair: 'wave',
    hairColor: PAL.amber3,
    uniform: 'galley',
    accent: PAL.moss4,
  }),
  schedule: ['c-commons', 'c-commons', 'c-commons', 'c-commons', 'c-corridor', 'c-commons'],
  post: { 'c-commons': [3, 5], 'c-corridor': [8, 8] },
  dialogue: {
    entry: (s) => (s.npc('fen').met ? 'again' : 'first'),
    nodes: {
      first: {
        id: 'first',
        speaker: 'fen',
        expr: 'neutral',
        text:
          "Oh good, somebody awake. The kettle's dead again and I've been talking to myself for " +
          'ninety minutes.\n\nYou want the tea or you want the gossip? The tea is worse.',
        onEnter: (s) => (s.npc('fen').met = true),
        next: 'hub',
      },
      again: {
        id: 'again',
        speaker: 'fen',
        text: 'Back again. Go on then.',
        next: 'hub',
      },
      hub: {
        id: 'hub',
        speaker: 'fen',
        text: 'What?',
        choices: [
          { text: 'Have you seen Hessa Quill?', tone: 'neutral', to: 'hessa' },
          {
            text: 'Where was the Master tonight?',
            tone: 'press',
            to: 'master',
            if: (s) => s.hasClue('transfer-record'),
          },
          { text: 'Anything strange on the ring tonight?', tone: 'neutral', to: 'strange' },
          { text: 'Nothing. Thanks.', tone: 'neutral', to: 'out' },
        ],
      },
      hessa: {
        id: 'hessa',
        speaker: 'fen',
        expr: 'concerned',
        text:
          "Transferred, they said. Which — fine, people transfer. Except she owed me four rounds " +
          "of tea and Hessa Quill has never once let a debt go unmentioned.\n\nAlso? The Master " +
          'had her written up twice this rotation. Twice. Everyone heard about it.',
        onEnter: (s) => s.findClue('onwe-grudge'),
        next: 'hub',
      },
      master: {
        id: 'master',
        speaker: 'fen',
        expr: 'wry',
        text:
          'Onwe? Sealed conference, Vestibule annex, all night. It\'s on the board — they have to ' +
          "post it.\n\nWhich is funny, because a sealed conference means she couldn't have filed " +
          "so much as a laundry chit. And I hear there's a chit with her name on it.",
        onEnter: (s) => s.setFlag('fen-pointed-at-board', true),
        next: 'hub',
      },
      strange: {
        id: 'strange',
        speaker: 'fen',
        expr: 'concerned',
        text:
          'The Warden came through here at twenty past three and did not say good evening. ' +
          'He always says good evening. He says it to the wall if nobody\'s here.',
        onEnter: (s) => s.setFlag('fen-trave-hint', true),
        next: 'hub',
      },
      out: { id: 'out', speaker: 'fen', text: 'Mind the step. It\'s not a step, it\'s a weld.', end: true },
    },
  },
};

// =====================================================================
// CAEL ODUYA — Second Loom, 26. Honest, frightened, good at numbers.
// =====================================================================
const cael: NpcDef = {
  id: 'cael',
  name: 'CAEL ODUYA',
  role: 'Second Loom',
  look: look({
    frame: 'slight',
    skin: 1,
    hair: 'shaved',
    hairColor: PAL.void1,
    uniform: 'loom',
    accent: PAL.amber2,
    accessory: 'visor',
  }),
  schedule: ['c-commons', 'c-commons', 'c-corridor', 'c-commons', 'c-commons', 'c-commons'],
  post: { 'c-commons': [14, 10], 'c-corridor': [20, 8] },
  dialogue: {
    entry: (s) => {
      if (!s.has('tutorial-spar') && s.tesserae.length > 0) return 'spar';
      if (s.hasClue('mass-manifest')) return 'numbers';
      return s.npc('cael').met ? 'again' : 'first';
    },
    nodes: {
      first: {
        id: 'first',
        speaker: 'cael',
        expr: 'concerned',
        text:
          "You're not on third watch. I'd know, I do the board.\n\nSorry. That came out like an " +
          "accusation. I've been trimming the same solution for six hours and it keeps coming out wrong.",
        onEnter: (s) => (s.npc('cael').met = true),
        next: 'hub',
      },
      again: { id: 'again', speaker: 'cael', text: 'Still here. Still wrong.', next: 'hub' },
      hub: {
        id: 'hub',
        speaker: 'cael',
        text: 'Did you need something?',
        choices: [
          { text: 'What keeps coming out wrong?', tone: 'technical', to: 'trim' },
          {
            text: 'Show me how a loom projection works.',
            tone: 'technical',
            to: 'spar',
            if: (s) => s.tesserae.length > 0 && !s.has('tutorial-spar'),
          },
          { text: 'Nothing. Get some sleep.', tone: 'gentle', to: 'out', do: (s) => s.adjustRelation('cael', 4) },
        ],
      },
      trim: {
        id: 'trim',
        speaker: 'cael',
        expr: 'concerned',
        text:
          "The trim. I balance her every watch. Declared load says four thousand four hundred and " +
          'ten.\n\nShe flies like six thousand one hundred and twenty. I have re-run it eleven times. ' +
          'The ship is right and the paper is wrong, and I do not want to be the one who says that out loud.',
        onEnter: (s) => {
          s.setFlag('cael-trim', true);
          s.adjustRelation('cael', 6);
        },
        next: 'hub',
      },
      spar: {
        id: 'spar',
        speaker: 'cael',
        expr: 'wry',
        text:
          "You've never projected, have you. Everyone gets issued a tile and nobody reads the card.\n\n" +
          'Here. Stand there. I\'ll bring up Second Loom and you can see what a revenant actually is ' +
          'before somebody points one at you.',
        choices: [
          {
            text: 'Alright. Show me.',
            tone: 'neutral',
            do: (s, c) => {
              s.setFlag('tutorial-spar', true);
              c.battle('tutorial-spar');
            },
          },
          { text: 'Not now.', tone: 'neutral', to: 'hub' },
        ],
      },
      numbers: {
        id: 'numbers',
        speaker: 'cael',
        expr: 'surprised',
        text:
          "You've seen the panel.\n\nThen you know. Seventeen hundred tonnes. And before you ask: " +
          'no, it cannot be a sensor fault, because the ship is *flying* like it, and the ship does ' +
          'not have opinions.',
        onEnter: (s) => {
          s.findClue('mass-manifest');
          s.adjustRelation('cael', 8);
          s.addRelationState('cael', 'afraid');
        },
        next: 'hub',
      },
      out: { id: 'out', speaker: 'cael', text: 'Yeah. You too.', end: true },
    },
  },
};

// =====================================================================
// WARDEN CALLIX TRAVE — did it. Ashamed. Speaks regulations when lying.
// =====================================================================
const trave: NpcDef = {
  id: 'trave',
  name: 'WARDEN TRAVE',
  role: "Ship's Watch",
  look: look({
    frame: 'broad',
    skin: 4,
    hair: 'crop',
    hairColor: PAL.bone0,
    uniform: 'watch',
    accent: PAL.ember2,
    accessory: 'cap',
  }),
  schedule: ['c-watch', 'c-watch', 'c-watch', 'c-corridor', 'c-watch', 'c-watch'],
  post: { 'c-watch': [10, 6], 'c-corridor': [24, 8] },
  dialogue: {
    entry: (s) => {
      if (s.hasDeduction('D3') && s.hasClue('trave-flask')) return 'corner';
      if (s.npc('trave').met) return 'again';
      return 'first';
    },
    nodes: {
      first: {
        id: 'first',
        speaker: 'trave',
        expr: 'neutral',
        text:
          'Crewman. It is four in the morning and you are not on my board.\n\n' +
          'Standing Order Four requires a stated purpose for presence in a Watch space. State one.',
        onEnter: (s) => (s.npc('trave').met = true),
        choices: [
          { text: 'Hessa Quill.', tone: 'honest', to: 'quill' },
          {
            text: '[Watch] Deputy, reporting. Duct rotation query.',
            tone: 'technical',
            if: (s) => s.profile.background === 'watch',
            to: 'deputy',
          },
          { text: 'Nothing. Sorry.', tone: 'silent', to: 'out' },
        ],
      },
      again: {
        id: 'again',
        speaker: 'trave',
        text: 'Still here.',
        choices: [
          { text: 'Hessa Quill.', tone: 'neutral', to: 'quill' },
          {
            text: 'Can I look at your bin, Warden?',
            tone: 'wry',
            if: (s) => relationAtLeast(s.relationLevel('trave'), 'professional'),
            to: 'bin',
          },
          { text: 'Nothing.', tone: 'silent', to: 'out' },
        ],
      },
      deputy: {
        id: 'deputy',
        speaker: 'trave',
        expr: 'concerned',
        text:
          'Duct rotation is suspended. That is all the answer there is, deputy, and I would take ' +
          'it and go.\n\n...You have known me four years. Take it and go.',
        onEnter: (s) => {
          s.adjustRelation('trave', 6);
          s.addRelationState('trave', 'ashamed');
        },
        next: 'quill',
      },
      quill: {
        id: 'quill',
        speaker: 'trave',
        expr: 'neutral',
        text:
          'Quill transferred at oh-three-ten under a voluntary instrument, authorised by the Master. ' +
          'The record is complete, the record is filed, and the record is not a Watch matter.',
        choices: [
          {
            text: 'She left her boots.',
            tone: 'press',
            to: 'boots',
            if: (s) => s.hasClue('hessa-locker'),
          },
          {
            text: "The Master was sealed in conference at oh-three-ten.",
            tone: 'press',
            to: 'sealed',
            if: (s) => s.hasClue('captain-watchlog'),
          },
          {
            text: 'You walked the ring at a hell of a pace tonight.',
            tone: 'press',
            to: 'pace',
            if: (s) => s.has('stray-trave-hint') || s.has('fen-trave-hint'),
          },
          { text: "That's a lot of words for 'she transferred'.", tone: 'wry', to: 'words' },
          { text: 'Understood, Warden.', tone: 'neutral', to: 'out' },
        ],
      },
      words: {
        id: 'words',
        speaker: 'trave',
        expr: 'angry',
        text: 'It is the correct number of words. Good night, crewman.',
        onEnter: (s) => s.adjustRelation('trave', -4),
        end: true,
      },
      boots: {
        id: 'boots',
        speaker: 'trave',
        expr: 'concerned',
        text:
          'Personal effects are not the Watch\'s concern until they are reported abandoned, at which ' +
          'point they are logged under Standing Order Eleven.\n\n...',
        onEnter: (s) => {
          s.setFlag('trave-pressed', true);
          s.addRelationState('trave', 'ashamed');
        },
        next: 'quill',
      },
      sealed: {
        id: 'sealed',
        speaker: 'trave',
        expr: 'surprised',
        text:
          'Then the Master authorised it before the seal, and the filing timestamp reflects the ' +
          'clerk\'s entry, not the authorisation.\n\nThat is how filings work. That is exactly how filings work.',
        onEnter: (s) => {
          s.setFlag('trave-pressed', true);
          s.bumpFlag('trave-lies');
        },
        next: 'quill',
      },
      pace: {
        id: 'pace',
        speaker: 'trave',
        expr: 'angry',
        text:
          'I walk the ring. It is the principal duty of the Watch to walk the ring.\n\n' +
          'You will find the pace at which I walk it is not in any standing order at all.',
        onEnter: (s) => {
          s.setFlag('trave-pressed', true);
          s.bumpFlag('trave-lies');
          s.setFlag('trave-distracted', true);
        },
        next: 'quill',
      },
      bin: {
        id: 'bin',
        speaker: 'trave',
        expr: 'sad',
        text: 'Look at whatever you like. I have stopped being able to stop people.',
        onEnter: (s) => s.adjustRelation('trave', 4),
        end: true,
      },
      corner: {
        id: 'corner',
        speaker: 'trave',
        expr: 'sad',
        text:
          'You have that look. The one where somebody has done the arithmetic.\n\nGo on, then. ' +
          'Say it in a room with a door on it, at least.',
        choices: [
          {
            text: 'You detained her. You filed the transfer yourself.',
            tone: 'accuse',
            to: 'break',
          },
          {
            text: 'Who told you to shelve her?',
            tone: 'press',
            to: 'break',
          },
          {
            text: "I don't want to be right about this.",
            tone: 'gentle',
            to: 'breakgentle',
          },
          { text: 'Not yet.', tone: 'silent', to: 'out' },
        ],
      },
      break: {
        id: 'break',
        speaker: 'trave',
        expr: 'sad',
        text:
          "Oh-three-oh-four. She came up out of nine-C with a slate in her hand and I put her on " +
          "the deck.\n\nThe order came from Registry. Registrar Sabbat. Shelve her, retrieve the slate, " +
          'file it clean. I was given the Master\'s authorisation to use. I did not ask how they had it.\n\n' +
          'She is in Medical. Annex Three. She is alive. They are taking four days out of her.',
        onEnter: (s) => {
          s.setFlag('trave-broken', true);
          s.findClue('trave-flask');
          s.adjustRelation('trave', 10);
          s.addRelationState('trave', 'ashamed');
          s.note('Warden Trave admitted detaining Hessa on Registrar Sabbat’s order.');
        },
        end: true,
      },
      breakgentle: {
        id: 'breakgentle',
        speaker: 'trave',
        expr: 'sad',
        text:
          'Neither did I.\n\nOh-three-oh-four. I put her on the deck and I filed the paper. ' +
          'The order came from Registry \x7f Sabbat \x7f and I used the Master\'s authorisation because ' +
          'it was handed to me.\n\nShe is in Medical Annex Three. Alive. They are taking four days out of her.\n\n' +
          'I have been sitting here deciding whether to tell somebody. You have saved me the decision, ' +
          'and I am not sure you have done me a kindness.',
        onEnter: (s) => {
          s.setFlag('trave-broken', true);
          s.findClue('trave-flask');
          s.adjustRelation('trave', 22);
          s.addRelationState('trave', 'indebted');
          s.addRelationState('trave', 'ashamed');
          s.note('Warden Trave confessed. He named Registrar Sabbat.');
        },
        end: true,
      },
      out: { id: 'out', speaker: 'trave', text: 'Good night, crewman.', end: true },
    },
  },
};

// =====================================================================
// PETTY MARN IVO — on the duct hatch. By the card.
// =====================================================================
const ivo: NpcDef = {
  id: 'ivo',
  name: 'PETTY IVO',
  role: "Ship's Watch",
  look: look({
    frame: 'average',
    skin: 3,
    hair: 'shaved',
    hairColor: PAL.rust0,
    uniform: 'watch',
    accent: PAL.ember2,
  }),
  schedule: ['c-muster', 'c-muster', 'c-muster', 'c-muster', 'c-muster', 'c-muster'],
  post: { 'c-muster': [19, 9] },
  dialogue: {
    entry: (s) => {
      if (s.has('ivo-distracted')) return 'away';
      if (s.profile.background === 'watch') return 'deputy';
      return 'block';
    },
    nodes: {
      block: {
        id: 'block',
        speaker: 'ivo',
        expr: 'neutral',
        text:
          'Hatch is restricted, crewman. Watch authorisation only.\n\n' +
          "I don't know why either. It came down at half three and I don't ask.",
        choices: [
          {
            text: '[Spinehand] It is my rotation. I have the key.',
            tone: 'technical',
            if: (s) => clearancesOf(s).includes('duct-key'),
            to: 'keyok',
          },
          {
            text: 'Who signed the restriction?',
            tone: 'press',
            to: 'whosigned',
          },
          {
            text: 'Fight me for it.',
            tone: 'threaten',
            to: 'fight',
            if: (s) => s.tesserae.length > 0,
          },
          { text: 'Understood.', tone: 'neutral', to: 'out' },
        ],
      },
      keyok: {
        id: 'keyok',
        speaker: 'ivo',
        expr: 'concerned',
        text:
          "...Your rotation. Right.\n\nI'm going to look at the far bulkhead for a bit. " +
          "If anybody asks, you were never at this hatch and I have never met you.",
        onEnter: (s) => s.adjustRelation('ivo', 6),
        end: true,
      },
      whosigned: {
        id: 'whosigned',
        speaker: 'ivo',
        text:
          'Warden Trave. Half three.\n\nWhich is odd, now you make me say it out loud, because the ' +
          'Warden was on the ring at half three and this order came off a Registry terminal.',
        onEnter: (s) => s.setFlag('ivo-registry-hint', true),
        next: 'block',
      },
      fight: {
        id: 'fight',
        speaker: 'ivo',
        expr: 'angry',
        text:
          "You want to project at a Watch officer on a restricted hatch.\n\nI'll note that you were " +
          'warned. Bailiff, up.',
        choices: [
          {
            text: 'Project.',
            tone: 'threaten',
            do: (s, c) => {
              s.bumpFlag('suspicion-events');
              s.suspicion += 25;
              c.battle('ivo-bailiff');
            },
          },
          { text: 'Stand down.', tone: 'neutral', to: 'out' },
        ],
      },
      deputy: {
        id: 'deputy',
        speaker: 'ivo',
        expr: 'neutral',
        text: 'Deputy. Hatch is yours if you want it. I never liked standing on it.',
        end: true,
      },
      away: {
        id: 'away',
        speaker: 'ivo',
        text: '(He is forty metres off, being told a very long story about a flood on Deck E.)',
        end: true,
      },
      out: { id: 'out', speaker: 'ivo', text: 'Move along, crewman.', end: true },
    },
  },
};

import { NPCS_D } from '@/data/deck-d';

export const NPCS: Record<string, NpcDef> = { stray, fen, cael, trave, ivo, ...NPCS_D };

/** Where an NPC is at the current ship-time. */
export function npcRoom(def: NpcDef, s: GameState): string {
  const pinned = s.npc(def.id).pinned;
  if (pinned) return pinned;
  const i = Math.min(def.schedule.length - 1, Math.max(0, s.timeBlock));
  return def.schedule[i];
}
