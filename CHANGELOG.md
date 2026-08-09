# CHANGELOG

## 0.1.0 — Chapter One vertical slice (in progress)

### Added
- Vite + TypeScript + Three.js foundation; 384x216 integer-scaled pixel-perfect
  presentation with a WebGL world layer and a 2D interface layer on one grid
- Hand-authored 5x8 bitmap font; canvas-only interface painter
- Orthographic renderer with batched static tile layers, a y-sorted dynamic
  sprite batch, and a quantised half-resolution dynamic lightmap
- Procedural art: 111-tile ship tileset, layered character sprites and portraits
- Six Deck C rooms authored as ASCII with auto floor variation and three-slice
  walls; doors, restricted access, per-room ambience and lighting
- Branching dialogue runtime with typed conditions and displayed tone
- Five crew with schedules and knowledge-bounded dialogue
- 12 clues, 6 deductions (each needing two independent sources), one fair red
  herring that a reachable deduction retires
- Evidence board with player-driven clue linking
- Turn-based Revenant combat: integrity/coherence, five aspects, six statuses,
  board-reading AI, free READ action that yields real evidence
- Four save slots with version migration and damaged-slot reporting
- Title, character creation, pause, 16 functional settings including
  accessibility, chapter-end summary
- Web Audio synthesis engine and score (implemented, unheard — see KNOWN_ISSUES)
- Automated playtest, content validator, screenshot harness, tile review page

### Fixed (all found by inspecting captured frames or by the playtest)
- Colour management left on made every pixel a gamma step too dark
- Texture `flipY` mirrored every tile and made sprites invisible
- Lightmap could not exceed 1.0, so lamps could never light a room
- Neutral iron ramp sat in the bottom third of the value range
- Commons decking drew two stacked grids; deck-plate seams were too hard
- Ambient tints were saturated enough to act as channel filters
- Input dropped any key tap shorter than one frame
- One-tile doorways demanded near-pixel-perfect alignment
- Arrival spawns sat on door tiles and could bounce the player straight back
- Interaction demanded exact facing alignment
- Music layer emitters bypassed their per-layer gain, so intensity did nothing
