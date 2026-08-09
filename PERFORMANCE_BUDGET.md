# PERFORMANCE BUDGET

## Targets

| Metric | Budget | Measured |
|---|---|---|
| Frame rate | 60 fps | 39–43 fps under SwiftShader (software) — **not GPU-measured** |
| Draw calls per frame | ≤ 4 | **1** |
| Triangles per frame | ≤ 4,000 | ~2 (batched; the counter reports post-batch) |
| Worst frame | ≤ 33 ms | 32.6–48 ms under software rasterisation |
| Sprite atlas | ≤ 1024² | 1024², well under capacity with the Chapter One cast |
| Tile atlas | one texture | 256 x 112 (111 tiles, 16 columns) |
| Runtime dependencies | as few as possible | one (three.js) |

## How the budget is held

- **One draw call for the scene.** Tile layers are static geometry built once per
  room; every actor and effect shares one atlas and one dynamic batch.
- **Per-frame allocation is bounded.** The sprite batch reuses typed arrays and
  only grows by doubling; the lightmap canvas is fixed-size; the dialogue and
  toast systems reuse arrays.
- **Room-scoped work.** Only the current room's tiles, actors, lights and
  animated quads exist. Nothing off-screen updates.
- **Tile animation retargets UVs** on already-built geometry rather than
  rebuilding meshes.
- **Frame delta is clamped to 50 ms.** A backgrounded tab returns a huge delta
  that would otherwise teleport actors through walls and burn a whole battle
  timeline in one frame.
- **Font atlases are cached per colour** (about a dozen), so text is a `drawImage`
  per glyph rather than 40 `fillRect` calls.
- **Art is generated once at boot** and memoised — the tile atlas is built before
  the first frame so nothing pops in.

## Honest caveat

Every number above was measured in headless Chromium using SwiftShader inside a
container. That is software rasterisation and is the wrong instrument for a
frame-rate claim. The structural numbers (draw calls, atlas sizes, allocation
behaviour) are meaningful; the fps figure is a floor, not a result.
