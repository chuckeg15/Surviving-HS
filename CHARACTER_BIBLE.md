# CANDLEWAKE — CHARACTER BIBLE

**Status:** derived from `docs/CANON.md` §5. Names, ages, roles, wants and hides
are frozen. Everything else here is addition.

**Cross-references:** knowledge boundaries are enforced by
`NARRATIVE_TRUTH.md` §C (K-numbers below refer to that table). Palette names are
from `src/art/palette.ts` and are used per `ART_DIRECTION.md`.

**Sprite brief format.** Characters render at **16×24 px**. Each entry gives:
*silhouette* (the shape at 16 px wide, readable with all colour removed),
*palette* (ramp names from `PAL`/`RAMP`), and *the readable feature* — the one
detail that survives at 16×24 and identifies the character across a dark
corridor. One feature. Not two.

---

## The player

**Age 27** (born 2210, Kest Harbour, evacuated 2216 — derived from canon, not
invented). Chosen name, pronouns, appearance, and one of five departments:
maintenance, medical, registry, security, engineering.

| | |
|---|---|
| **Silhouette** | Player-configured within a fixed frame: standard crew coverall, department overlayer, spinehand boots. The boots are non-optional and are a plot point (see C2). |
| **Palette** | Coverall `iron2`→`iron4`. Department overlayer takes the `DEPARTMENT_TINT` value for the chosen background. Skin from the `skin` ramp, hair from `iron`/`rust`/`bone` at player choice. |
| **Readable feature** | The department overlayer colour on the shoulders — three pixels, and it is how every NPC in the game knows what you are before they know who you are. |
| **Speech** | Player-selected from tone options per line. The player never narrates their own feelings. |
| **Knows** | Nothing about Kest Harbour, the index, the smoothing, or 9-B. Their memory of childhood is smooth in the way a worn coin is smooth: nothing missing that you could name. |
| **Hides, without knowing it** | Everything the game is about. |

**Hard rule.** No NPC may treat the player as anything other than an ordinary
crew member, with the single exception of Sabbat, whose extra attention must
always be legible as bureaucratic courtesy (K23, K24, K25).

---

## Hessa Quill, 29 — spinehand, the player's shift partner

**Wants:** to be taken seriously once. **Hides:** nothing — she is the one person
being honest, which is why she is gone. *(canon)*

| | |
|---|---|
| **Silhouette** | Compact, wide-shouldered from duct work, coverall sleeves cut off at the elbow over a grey thermal liner. Hair short and pushed back. Carries a slate in a hip clip that swings when she walks. |
| **Palette** | Spinehand grey liner: `iron3`/`iron4`. Coverall `iron1`. Hip slate reads `bone2` with a single `halo2` pixel when active. Skin `skin3`. |
| **Readable feature** | **The cut-off sleeves.** Bare forearms at 16×24 is a silhouette nobody else on the ship has. It also means that when the game shows a strip of torn *spinehand grey* on the frame-611 coaming (C5), the player has seen that exact colour on her arms for two hours. |
| **Speech** | Short, dry, no wasted syllables. Deflects praise. Ends serious statements with a joke and then does not laugh. |
| **Sample** | *"Frame six-eleven. Gasket's gone at the saddle. Second time this rotation, which either means the gasket's bad or the saddle's moving, and one of those is a job and the other's a report nobody reads."* |
| **Sample** | *"You look like a man who slept in a locker. I'll take the spine. Don't make it a thing."* |
| **Goals** | Get the report filed properly. Get through the watch. Be believed once by someone with a rank. |
| **Fears** | Being the person who cried wolf. She has been written up twice and it has made her careful in exactly the wrong way — careful about *procedure*, not about *safety*. |
| **Secrets** | None. |
| **Relationships** | Player: partner, easy, unsentimental. Stray: respects her, went to her. Kell: her other regular partner; they bicker. Onwe: wrote her up twice; Hessa considers this a badge. Trave: barely knows him. Pell: owes her a shift. |
| **Under pressure** | Fights. Immediately, badly, and without calculating. This is why the glove-liner tore. |
| **Across the outcomes** | **O1:** alive, one to three days gone, cannot remember the duct or Stray; becomes a person the player has to tell what happened to her. **O2:** transferred for real, smoothing completed; returns in Chapter Four not knowing the player. **O3:** free, intact, hunted, and in the Ninth Watch's debt. **O4:** four days gone, back on shift by the next watch, cheerful, and asking the player why they keep looking at her like that. |
| **Knowledge boundary** | K10, K11 (as a needle position, not a figure), K2, K3. **Nothing else.** She never knew what the mass was. |

---

## Warden Callix Trave, 51 — Ship's Watch

**Wants:** to have done nothing wrong. **Hides:** that he detained Hessa and
forged her transfer on Sabbat's order. Speaks in regulations when he lies.
*(canon)*

| | |
|---|---|
| **Silhouette** | Heavy, gone soft over a frame that used to be solid. Watch coat with the collar up, always. Stands with weight on his back foot. |
| **Palette** | Watch coat `ember0`/`ember1` with `iron1` shadow — the Watch owns the ember family and nobody else on Deck C wears it. Face `skin2` with `ember2` at the nose and ears (drink). |
| **Readable feature** | **The raised collar** — a two-pixel notch above the shoulder line that no other sprite has. It also means his face is partly hidden, which is doing the same work as his dialogue. |
| **Speech** | Regulation citation when lying, plain English when not. **This is the tell and it is learnable.** He gets the regulation numbers slightly wrong under stress and does not notice. |
| **Sample (lying)** | *"Crew movement between decks during a watch is a Section Fourteen matter, and Section Fourteen is Watch business, and Watch business is not a thing I discuss at a doorway."* |
| **Sample (not lying, 06:00, drunk)** | *"I've been on this ship nine years and nobody's ever asked me to do a thing I couldn't write down. That's all I want. Something I can write down."* |
| **Goals** | For this watch to end. For the record to hold. For someone to tell him it was lawful. |
| **Fears** | That it was not lawful. That the depth setting means something. That his name is on the consent form in his own handwriting because he was too rattled to think of anything else. |
| **Secrets** | K15, K17, K16, K21 (partial — he used a cradle without understanding it). |
| **Relationships** | Sabbat: obeys, fears, and has never once been thanked. Ivo: his petty; genuinely fond of him. Onwe: resents her competence. Stray: suspects her of organising and cannot prove it. Player: initially dismissive; becomes, depending on approach, either the person he confesses to or the person he throws out. |
| **Under pressure** | Three stages. **Escalate** — regulation numbers, volume, doorway blocking. **Withdraw** — very quiet, will not look at you, keeps talking about the paperwork. **Break** — total, immediate, humiliating, and he does not stop once he starts. There is no middle setting and no violence toward the player. He puts his fist through his own desk terminal. |
| **Across the outcomes** | **O1:** breaks; becomes an unstable ally who will help and will also confess to the wrong people. **O2:** protected by the filing; becomes a man who knows the player chose procedure over him, which he reads, wrongly, as mercy. **O3:** arrested by his own service during the lockdown; a witness the player can no longer reach. **O4:** stays at his desk; encountered in Chapter Two still drinking, having concluded that he got away with it, which is destroying him faster than being caught would have. |
| **Knowledge boundary** | K15, K16, K17, K21. **Not** K4, K18, K9. He does not know that casting a living brain destroys it and he does not know that Registry filings stamp a checksum. He was chosen for both ignorances. |

---

## Registrar Ilm Sabbat, 63 — Continuance Board liaison

**Wants:** order, and the mission completed. **Hides:** Standing Order 9-B, the
Ledger, and that the player is the index. Never raises their voice. Says "we"
meaning the Board. *(canon)*

Born 2174 — exactly as old as the Overcast. He has never seen the sun and he
does not consider this a deprivation.

| | |
|---|---|
| **Silhouette** | Tall, narrow, upright, hands clasped in front. Board coat to mid-calf — the longest garment on the ship, and the only one that reaches below the knee. Never carries anything. |
| **Palette** | Board coat `brine1`/`brine2` with `bone1` piping. He is the only character who uses `brine` as a garment rather than as environment, which makes him read as *part of the ship's cold* rather than a person in it. Skin `skin2`, hair `bone1`. |
| **Readable feature** | **The coat length** — the sprite is 24 px tall and his hem is at pixel 20 where everyone else's is at 15. At a glance he is a column. |
| **Speech** | Unhurried, complete sentences, no contractions under stress. Always "we". Delivers atrocity in the register of a scheduling change *(canon §9)*. Never threatens; offers forms. |
| **Sample** | *"We've amended the third-watch roster to close the gap. It's a small thing but the gap would have shown up in the monthly and then someone ashore would have written to ask about it, and that is three weeks of correspondence for a matter that took me four minutes."* |
| **Sample** | *"You're entitled to file. I'd encourage it. A thing that is filed is a thing that has been dealt with, and a thing that has been dealt with does not follow you."* |
| **Goals** | 9-B completes. The proof of concept holds. The offer goes to the unfunded on Earth and is not refused, because it will not be phrased as a question. |
| **Fears** | Famine. Genuinely, and it is the only thing that moves him. He has read the actuarial tables since he was thirty and he believes he is the last adult in the room. |
| **Secrets** | K5, K7, K8, K9, K14, K22, K23, K24, K25. He holds every fact in the game. |
| **Relationships** | Onwe: professional respect, mutual, and a shared knowledge neither will name. Trave: an instrument, and he does not think of him more than that. Rask: useful, and slightly beneath notice, which is a mistake. Ashkar: a credentialed asset he considers reliable. Stray: knows the type, not the person. Player: the most valuable object aboard, treated with unfailing courtesy. |
| **Under pressure** | Becomes *more* helpful, more procedural, and slower. He answers the question you asked, exactly, and volunteers a form. The horror is that he is never rattled, because from inside his frame nothing has gone wrong. |
| **Across the outcomes** | **O1:** knows the player knows; adjusts by *including* them — the next chapter opens with an invitation, not a threat. **O2:** marks the player an asset and raises their access, which is not a reward, it is a leash with a longer lead. **O3:** the lockdown is his, executed without raising his voice; he never mentions it to the player again. **O4:** does not know the player exists, which is the single largest mechanical advantage available in the game. |
| **Knowledge boundary** | Everything. The constraint on Sabbat is not what he knows but what he will *say*: he has trained himself out of the collocation "live cast" and will not produce it. If a scene ever gets him to, the game has changed permanently. |

---

## Dr. Nomi Ashkar, 44 — ship physician

**Wants:** to not have been complicit. **Hides:** that she performs memory
smoothings; that she smoothed the player in 2229 and does not know it. *(canon)*

| | |
|---|---|
| **Silhouette** | Medium height, very still. Ward coat open over crew kit. Arms crossed at rest — a closed shape, and the only idle-pose in the cast that reads as defensive. |
| **Palette** | Ward coat `bone2`/`bone3` — Medical owns the bone family. Under-kit `iron2`. She is the brightest sprite on the ship and she is standing in the coldest-lit room, which is deliberate. |
| **Readable feature** | **The open coat with crossed arms** — a bright rectangle with a dark X across it. Unique in the cast and readable at any distance. |
| **Speech** | Clinical, exact, faster when frightened. Says "the procedure", never "smoothing", in front of anyone. Corrects imprecision reflexively and then apologises for correcting. |
| **Sample** | *"Depth is measured in subjective days, not clock hours, and the two aren't convertible, which is a thing people never believe until they've seen someone come out of one. Why are you asking me about depth."* |
| **Sample** | *"I came on at five. Annex Three was occupied and the tag was Vestibule protocol. I have a ward to run. I did not open the door and I would like you to notice that I've told you that."* |
| **Goals** | To get to the end of the voyage without having done anything she cannot defend. She is already past that point and has not admitted it. |
| **Fears** | Being asked, directly, whether the 2229 order was consensual. She has an answer ready and she knows it is not true. |
| **Secrets** | K21, K22. She kept the 2229 record illegally in her own effects — the largest act of resistance she thought she could survive. |
| **Relationships** | Corrow: her medtech; she is short with him and protective of him. Sabbat: she takes his orders and has never once asked him a question. Trave: mutual dislike, professional. Player: sees them weekly and has never once run the comparison that would tell her who they are. Rask: they respect each other and avoid each other. |
| **Under pressure** | Retreats into precision. Answers narrower and narrower questions correctly. When cornered, she does not lie — **she tells a true thing that is not the answer**, and this is her tell. |
| **Across the outcomes** | **O1:** she performs the early extraction, and it is the first time in eight years she has used the cradle to take someone out of one. **O2:** completes the smoothing on Hessa under protocol and does not sleep. **O3:** the Ninth Watch breaks Hessa out of her ward; she does not raise the alarm, and never explains why. **O4:** unchanged, which is the worst version — the player has met her, learned nothing, and left her intact. |
| **Knowledge boundary** | K4 (textbook), K16 (from ~05:00, and only as *"Annex 3 is occupied"* — never *"Hessa is in it"*), K21, K22. **May never reference K23 or K24.** She may speak of *a* 2229 procedure. She may never connect it to the player. |

---

## Bosun Anneke Stray, 38 — Ninth Watch organiser

**Wants:** the ship turned around. **Hides:** that she will spend the player to
get it. Has a stolen manifest page she cannot read. *(canon)*

| | |
|---|---|
| **Silhouette** | Broad, low centre of gravity, hands in pockets. Bosun's jerkin over a heavy liner. Stands square to whoever she is talking to, feet planted. |
| **Palette** | Jerkin `moss1`/`moss2` — she is the only crew member on Deck C in the moss family, which is Hydroponics' colour, and she wears it because a bosun's kit is whatever fits. Under-liner `iron2`. Skin `skin4`. |
| **Readable feature** | **Hands in pockets.** Her arms never break her silhouette. In a cast of people who gesture, she is a solid block, and when her hands come out of her pockets the scene has changed. |
| **Speech** | Flat, short, load-bearing. No adverbs. Never says "Ninth Watch" until she has decided about you. Asks more questions than she answers and does not pretend otherwise. |
| **Sample** | *"Two-fifty. She came and found me and she said the keel's the wrong weight. Those words. Then I told her to go to her bunk."* |
| **Sample (at Trusting)** | *"I'm going to be straight with you because you've earned it and because it costs me nothing. There are people on this ship who want it turned around. I'm one. If you help us you'll be useful, and useful people get used. That's not a warning, it's a description."* |
| **Goals** | The ship comes about. The truth goes out. She has not decided which order and does not think it matters. |
| **Fears** | That she is wrong about the cargo and has organised a mutiny over a clerical error. She checks this fear by asking Cael the same question in different words every few weeks. |
| **Secrets** | K26. The stolen manifest page, which carries the term *Cold Registry* in an encoding she cannot read. That she sent Hessa to her bunk alone instead of walking her there. |
| **Relationships** | Kell: her second, and the only person aboard who knows the whole network. Hessa: liked her, used her, is not going to forgive herself. Trave: they circle each other. Cael: her unwitting technical consultant. Player: assessed continuously, warmly, and instrumentally. |
| **Under pressure** | Gets slower and quieter and more honest. She does not panic, and she does not lie to allies — she withholds, and if you catch her withholding she tells you exactly what she withheld and why. It is disarming and it is a technique. |
| **Across the outcomes** | **O1:** watches from a distance; notes that the player went to authority rather than to her. **O2:** the player has just handed the Board an organiser's name and Stray knows within a day; permanently *Closed*, and Chapter Three's Ninth Watch content is gone. **O3:** ally, full network access, and the player is on the Watch's list forever. **O4:** unchanged and still recruitable, because the player did nothing she can hold against them. |
| **Knowledge boundary** | K11 (secondhand), K14 (she has the page and cannot read it — she may say *"there's a word on here I can't get out"*), K26. **Not** K7, K8, K9, K13. She *suspects* a second order and may say so as suspicion, never as fact. |

---

## Cael Oduya, 26 — Second Loom

**Wants:** to not be in trouble. **Hides:** nothing much — he is the honest read
on the trim numbers, and terrified of what they mean. *(canon)*

| | |
|---|---|
| **Silhouette** | Thin, tall, slightly folded. Loom harness across the chest with the wrist unit oversized on a narrow forearm. Head tilted down toward whatever he is reading. |
| **Palette** | Engineering coverall `amber1`/`amber2` at the shoulders over `iron2`. Wrist loom carries the only persistent `halo3` pixel in the cast — two pixels, at the wrist, always on. Skin `skin1`. |
| **Readable feature** | **The lit wrist.** A single `halo3` pixel at the end of a long arm. In a corridor where the halo family is otherwise reserved for tesserae and revenants, Cael is the one person who is always faintly on. |
| **Speech** | Overexplains, apologises mid-sentence, then says something devastating and immediately retracts it. Talks to the numbers rather than to you. |
| **Sample** | *"So the declared's four-four-one-zero and the trim we actually fly is six-one-two-zero, and I know, I know, that's a sensor drift argument, except I ran it three times against three different saddles. Sorry. It's probably fine. It's not fine."* |
| **Sample** | *"Seventeen hundred and ten tonnes of something in the keel envelope. And I ran the density and it doesn't come out like ore. Forget I said that. Please genuinely forget I said that."* |
| **Goals** | To not be the person who noticed. He failed at this eleven months ago and has been alone with it since. |
| **Fears** | Being asked to put it in writing. |
| **Secrets** | None deliberate. He has told nobody because nobody asked. |
| **Relationships** | Player: relieved, instantly, that someone asked. Stray: she asks him things and he has never wondered why. Rask: intimidated by him. Ivo: they eat together. |
| **Under pressure** | Talks more, faster, and more accurately. Cael under stress is *more* useful, which is unusual in this cast and is why he is the interpreter for C4. |
| **Across the outcomes** | **O1:** stays out of it, and is relieved. **O2:** his readings are the confiscated evidence; he is interviewed and comes out of it frightened and quieter. **O3:** during lockdown he is confined to Deck E and becomes unreachable for a chapter. **O4:** the only person who knows what the player knows, and he does not know that he knows it. |
| **Knowledge boundary** | K10, K11 (certain, precise), K12 (as hedged inference). **Not** K13 — he has never said the word tesserae in connection with the keel and must not. His density line is the closest he comes and he retracts it. |

---

## Fen Bellweather, 19 — galley hand

**Wants:** to be liked. **Hides:** nothing. Gossip hub. Knows *who was where*,
which turns out to matter. *(canon)*

| | |
|---|---|
| **Silhouette** | Small, quick, always carrying something — tray, urn, stack of liners. Apron over crew kit. The only sprite in the cast holding an object in the idle pose. |
| **Palette** | Apron `bone1` over Commons `amber1`. Hair `rust3`, the warmest colour worn by anyone on Deck C. Skin `skin3`. |
| **Readable feature** | **The carried tray** — a two-pixel horizontal bar in front of the chest that breaks the silhouette. Fen is the only character in Chapter One whose hands are always full. |
| **Speech** | Fast, warm, digressive. Accurate about movement, unreliable about motive, and never distinguishes between the two. Uses everyone's first name including people who outrank them. |
| **Sample** | *"Oh, everyone was in and out. Anouk was hovering by the urn which she does. The Warden went down the ladder trunk about three carrying something and came back up not carrying it, which — I mean, that's what a ladder trunk is for, isn't it, carrying things down."* |
| **Sample** | *"Well — I mean, the Captain had her written up. Twice. Once for the duct hours and once for talking back in front of the whole muster. Hessa said she'd rather be right than rostered."* |
| **Goals** | To be at the centre of things and to have everyone be all right. |
| **Fears** | Being excluded. Not being told. |
| **Secrets** | None, and this is structurally important: **Fen never lies and is never revealed to have lied.** The red herring is entirely the player's inference from true information. |
| **Relationships** | Everyone, lightly. Pell: closest friend, corroborates them. Oram: their boss, indulgent. Delisle: Fen told her where Stray usually sits, which is how the leak happened, and Fen will never know. |
| **Under pressure** | Talks more and becomes less reliable about motive while staying perfectly reliable about movement. Distinguishing the two is a skill the player develops. |
| **Across the outcomes** | **O1:** the story goes round the ship in an hour and Fen is the reason. **O2:** told, officially, that Hessa transferred; repeats it in good faith; becomes the ship's memory of a lie. **O3:** genuinely frightened by the lockdown for the first time in the game. **O4:** unchanged and cheerful, and this is the beat that makes O4 hurt. |
| **Knowledge boundary** | Movement, K19, K20, K27 (as *"Anouk's religious about the keel"*, never as a faction). **Not** K4, K11 as a figure, K17. Fen may say a thing *smells wrong*. Fen may never assert a fact they cannot have. |

---

## Tibold Rask, 35 — Vestibule researcher

**Wants:** rigour. **Hides:** knows the cargo is tesserae. Does **not** know about
Kest Harbour. Keeps an honest log, which is the most dangerous object on the
ship. *(canon)*

| | |
|---|---|
| **Silhouette** | Neat, contained, hands behind back. Vestibule overrobe — a straight-sided garment with no visible fastening, the only asymmetric-free silhouette in the cast. |
| **Palette** | Overrobe `bruise1` with `bruise2` at the hem. **He is the only character permitted to wear the bruise family**, and he wears it because the Vestibule owns it (`DEPARTMENT_TINT.vestibule = 'bruise2'`). Under-kit `bone0`. |
| **Readable feature** | **The straight hem and the absent hands** — a clean-edged block with no arms breaking the outline. Rask reads as an object rather than a person at 16 px, which is the correct impression. |
| **Speech** | Precise, unhurried, uses the correct term every time and corrects yours. Distinguishes what he knows from what he has been told, out loud, every time, without being asked. |
| **Sample** | *"I know that there are tesserae aboard in a quantity that is not consistent with crew issue. I do not know their provenance and provenance is not my brief. Both of those sentences are exactly as strong as I intend them."* |
| **Sample** | *"Sealed at Bureau class. I'm Bureau and I can't read it, which tells you which end of the Bureau sealed it."* |
| **Goals** | A complete and defensible series of observations. He will not publish an incomplete one and this is both his integrity and his cowardice. |
| **Fears** | Being wrong in writing. Being made to choose a side of the Vestibule's internal split before the evidence is in. |
| **Secrets** | The log — kept out of method, not guilt. K28. That he stopped asking where the tesserae came from, and knows the exact date he stopped. |
| **Relationships** | Sabbat: correct, mutual, and Sabbat underestimates him. Ashkar: professional respect, careful avoidance. Cael: he does not notice Cael, which is a loss to both. Player: will help, at his own pace, on the record, for reasons of rigour rather than affection. |
| **Under pressure** | Slows down. Restates the question. Answers only what was asked and flags what he is not answering, which is more informative than he intends. |
| **Across the outcomes** | **O1:** unchanged, and will confirm the timeline if asked. **O2:** notes the filing and files his own observation about it. **O3:** confined to Deck B; the log survives. **O4:** unchanged; the log is still there in Chapter Two and is now the most valuable object the player can reach. |
| **Knowledge boundary** | K2, K3, K4 (textbook), K12, K13, K14 (has seen the term on a routing slip), K19, K28. **He may never say Kest, 91,400, live, or the unfunded.** His log is dangerous because it is complete and neutral, not because it accuses anyone. |

---

## Captain Verity Onwe, 55 — Master

**Wants:** to get her crew home. **Hides:** that she knows about 9-B, hates it,
and has been quietly stalling the burn. **Chapter One's red herring** —
unreachable, and the forged record carries her authorisation. *(canon)*

| | |
|---|---|
| **Silhouette** | Upright, square, master's coat with hard shoulders. Hands at her sides. The most *symmetrical* sprite in the cast. |
| **Palette** | Master's coat `brine3`/`brine4` — Command owns the brightest brine and she is the only person who wears it. `bone3` at the cuffs. |
| **Readable feature** | **The hard shoulder line** — a flat two-pixel bar across the top of the sprite. It reads as authority at a glance and it is the only genuinely rigid silhouette on the ship. |
| **Speech** | Economical, seamanlike, and unexpectedly plain. She does not use procedure as cover; she uses it as a tool and says so. Never raises her voice, for entirely different reasons than Sabbat. |
| **Sample (Ch2+)** | *"I've stalled this burn three times on grounds a Board auditor would call sound. That's not resistance. That's a person hoping something else breaks first so it doesn't have to be them."* |
| **Sample (Ch2+)** | *"I was told post-mortem. I've never believed it and I've never asked. Write that down, if you're writing."* |
| **Goals** | 340 crew home. She has stopped believing it is possible and has not stopped trying. |
| **Fears** | That the thing in her hold is what she suspects. She has built her whole professional practice around never having to find out. |
| **Secrets** | K9, K13, and the fact that she signed. |
| **Relationships** | Sabbat: mutual respect and mutual knowledge; the most honest relationship in the game and neither will say a true word to the other. Trave: she thinks he is adequate. Hessa: wrote her up twice, and thought she was the best spinehand aboard, and told nobody. Player: no relationship in Chapter One. |
| **Under pressure** | Becomes plainer. She is the only senior figure who tells the truth when cornered, and the truth is worse than the evasion would have been. |
| **Across the outcomes** | **O1:** learns in Chapter Two that the player suspected her and respects them more for having checked. **O2:** learns the player filed with Sabbat and writes them off permanently. **O3:** the lockdown is executed over her objection and she loses the ship in practice. **O4:** learns nothing; fully available in Chapter Three. |
| **Knowledge boundary** | K4, K5 (never aloud), K9, K12, K13, K19. **Not** K7, K8 — she does not know it was Kest, or 91,400, or that they were alive when it was done. She knows she declined to ask, which she considers the same crime, and she is right. |

---

## Minor crew

Roles are canon. Faction assignments and functional details are **proposed** —
see *Open questions*.

### Petty Marn Ivo, 33 — watchman on the Deck C duct hatch
- **Silhouette / palette:** stocky, Watch kit in `ember1` without a raised collar, helmet outline. **Readable feature:** the helmet — a flat cap over the head at pixel row 2–4, unique to on-post Watch.
- **Speech:** cheerful, bored, procedural without menace. *"Sign the board, that's all it is, sign the board and I'll never think about you again."*
- **Knows:** Hessa signed out of the duct at 02:44 and never signed back in. Nothing else.
- **Combat:** his revenant is the **Bailiff** (Hold Your Breath route 7).
- **Across the outcomes:** injured and resentful if fought; salutes and forgets if walked past.

### Deckhand Sura Pell, 24 — Fen's closest friend
- **Silhouette / palette:** slight, deck kit `iron2`, tool roll at the hip. **Readable feature:** the hip tool roll.
- **Function:** corroborates or contradicts Fen's movement claims. A player who checks Fen against Pell learns that Fen is accurate, which is a lesson in itself.
- **Hides:** she covered a shift for Hessa last week and Hessa owed her.

### Cook Bezhi Oram, 47 — galley
- **Silhouette / palette:** heavy, apron `bone0` over `amber0`, forearms bare. **Readable feature:** the bare forearms *plus* bulk — distinguishable from Hessa by mass alone.
- **Speech:** monosyllables and unsolicited food. Lapsed Recurrence; embarrassed by it.
- **Knows:** that Delisle prays over the keel bulkhead. Thinks it is embarrassing, not sinister. **Hides:** that he used to pray with her.

### Steward Anouk Delisle, 41 — Recurrence celebrant, the accidental informant
- **Silhouette / palette:** upright, steward's tabard `bone1` over `iron1`, hands clasped at the waist. **Readable feature:** the clasped hands at waist height — a single dark pixel-pair at centre-body, and the only prayer-adjacent pose in the cast.
- **Speech:** gentle, formal, slightly archaic. Uses "the keel" as though it were a proper noun, because to her it is.
- **Sample:** *"I take the tray to the sealed room and I leave it outside and I don't knock. That's the whole of my part in anything."*
- **Function:** she overheard part of the 02:50 exchange and mentioned it to Trave at 03:01, out of piety, not malice. She is a C3 substitute source and she does not know she is the reason Hessa is gone.

### Medtech Wen Corrow, 29 — medical
- **Silhouette / palette:** narrow, ward tunic `bone2`, sleeves rolled. **Readable feature:** rolled sleeves on a bone-family sprite — Ashkar's colour, Hessa's arms.
- **Speech:** apologetic, deferential, precise about records and vague about anything above his grade.
- **Knows:** he logged the 03:07 Annex 3 admission with a blank patient field under a Vestibule tag. He will not volunteer it. He will confirm it if the player gives him a reason it is not his fault.

### Spinehand Ostrow Kell, 44 — Ninth Watch, Stray's second
- **Silhouette / palette:** tall, spinehand grey `iron3`/`iron4`, cut-off sleeves like Hessa's, but a head taller and with a heavy duct harness. **Readable feature:** the harness webbing across the chest.
- **Speech:** dry, unhurried, gives you exactly what you asked for and watches what you do with it.
- **Knows:** duct geography; that Hessa's liner is still racked (a C2 substitute); that Stray runs something. **Hides:** membership.

---

## Sprite-set constraints

For the artist, so the cast does not collapse into interchangeable rectangles.

1. **Every named character owns exactly one silhouette-breaking feature.** No
   character has two. The list, in full: Hessa cut-off sleeves; Trave raised
   collar; Sabbat coat hem to pixel 20; Ashkar open coat + crossed arms; Stray
   hands in pockets; Cael lit wrist; Fen carried tray; Rask straight hem, no
   arms; Onwe hard shoulder bar; Ivo helmet; Pell hip roll; Oram bulk + bare
   arms; Delisle clasped hands; Corrow rolled sleeves; Kell chest harness.
2. **No two Chapter One characters share a garment palette family.** Trave owns
   `ember`, Sabbat and Onwe split `brine` by step, Ashkar and Corrow share `bone`
   and are separated by silhouette, Cael owns `amber`, Stray owns `moss`, Rask
   owns `bruise`, spinehands own `iron` mid-steps.
3. **`halo` appears on exactly one idle sprite** — Cael's wrist. Everything else
   in that family is a tessera, a revenant, or an interactive.
4. **`bruise` appears on exactly one idle sprite** — Rask's overrobe. Everything
   else in that family is a cognitive phenomenon.
5. **Faces do not carry identity at this resolution.** Nobody is identified by a
   face. If a character can only be told apart in a portrait, the sprite has
   failed.

---

## Open questions for the lead

1. **Minor-crew faction assignments.** Canon names six minor crew and gives them
   roles but no allegiances. This document proposes: Delisle and Oram as the
   Recurrence presence aboard (canon requires the Recurrence to be "small aboard,
   but not nothing" and names no member); Kell as Stray's Ninth Watch second.
   These are additions and should be confirmed or replaced before dialogue work.
2. **Delisle as the leak.** She is the mechanism by which Sabbat learns of
   Hessa's 02:50 conversation — canon says he "learned of it" and does not say
   how. If the lead prefers a different route (Trave's own surveillance, a
   Ninth Watch informer, Stray's own indiscretion), it changes Delisle from a
   tragic figure to set dressing. Recommend keeping her: the leak coming from
   sincere piety rather than malice is the most Board-shaped thing in the
   chapter.
3. **Onwe has no Chapter One dialogue at all.** Canon makes her unreachable, and
   this document honours that absolutely — she exists only as three documents.
   This is correct for the red herring but means the player's first real Onwe
   scene is in Chapter Three, carrying whatever they concluded about her. If the
   lead wants a Chapter One voice-only beat (an all-hands announcement, say), it
   should be added deliberately and it should be about something else entirely.
4. **Hessa's post-O1 memory state.** Canon says "partial memory loss, she
   survives". This document ties the loss to extraction time (roughly one
   subjective day per ninety minutes of cradle run). If the lead wants a fixed
   loss regardless of timing, say so — the variable version creates a real
   incentive to rush, which is dramatically good and mechanically fiddly.
5. **Ages of minor crew** are assigned here and are not canon.
