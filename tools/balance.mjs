/**
 * Combat balance measurement.
 *
 * Runs the REAL battle rules headlessly (BattleScene.simulate) across every
 * tessera x encounter pair, under several player policies, and reports the
 * numbers a balance pass actually needs: win rate, battle length, damage
 * economy, ability usage, and — the two that matter most — which abilities are
 * dominant and which are dead.
 *
 * A "dominant" ability is one a greedy policy picks so often that the other
 * options are decoration. A "dead" ability is one no sensible policy ever
 * wants. Both are balance failures and both are invisible without counting.
 *
 *   node tools/balance.mjs            # summary
 *   node tools/balance.mjs --runs 400 # more samples
 *   node tools/balance.mjs --json     # machine-readable
 *   node tools/balance.mjs --reuse    # a dev server is already on --port
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const RUNS = Number(arg('runs', 300));
const PORT = Number(arg('port', 5179));
const JSON_OUT = process.argv.includes('--json');
// Booting vite and Chromium costs far more than 36,000 battles do. During a
// tuning pass the server is left running and only the browser is recycled.
const REUSE = process.argv.includes('--reuse');

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined;
}

async function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up */ }
    await sleep(250);
  }
  return false;
}

async function main() {
  let server = null;
  if (!REUSE) {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', () => {});
    server.stderr.on('data', (d) => process.stderr.write('[vite] ' + d));
  }
  console.error('[dbg] waiting for server...');
  if (!(await waitForServer(`http://localhost:${PORT}/`))) throw new Error('server down');
  console.error('[dbg] server up');

  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--no-sandbox', '--disable-dev-shm-usage'],
  });
  console.error('[dbg] browser launched');
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  console.error('[dbg] page loaded');
  await page.waitForTimeout(1500);

  console.error('[dbg] entering evaluate');
  const data = await page.evaluate(async (RUNS) => {
    const { BattleScene, TESSERAE, ENCOUNTERS, effectiveness } =
      await import('/src/combat/battle.ts');

    const expected = (a, foe) => a.power * effectiveness(a.aspect, foe.def.aspect);

    /** Best single blow one combatant can land on the other, in damage. */
    const bestHit = (src, dst) =>
      src.def.abilities.reduce(
        (m, a) => Math.max(m, a.power * effectiveness(a.aspect, dst.def.aspect)),
        1,
      );
    /** Damage a combatant buys per point of coherence. Prices grip in damage. */
    const perCoherence = (src, dst) =>
      src.def.abilities.reduce(
        (m, a) => Math.max(m, (a.power * effectiveness(a.aspect, dst.def.aspect)) / Math.max(1, a.cost)),
        0.5,
      );

    /**
     * How many of the target's turns a status actually bites for.
     * `tickStatuses` decrements before it checks, so the tick that takes a
     * status from 1 to gone never fires: N turns is N-1 turns of effect.
     */
    const bite = (turns, chance) => Math.max(0, turns - 1) * chance;

    /**
     * The damage-equivalent of everything an ability does that is not damage.
     *
     * The old scoring function was `power * effectiveness` and nothing else, so
     * it could not represent one single rider in a system whose stated design
     * rule is that no ability may be a renamed damage number. Every guard and
     * every control ability in the game measured dead under it \x7f including
     * the ones the enemies win with. That is an instrument fault, not five
     * coincidences: a tool that cannot see a rider cannot tell a dead ability
     * from an unmeasurable one.
     *
     * Every price below is the rule it models, converted into damage. None of
     * them is a taste knob, and none was moved to make a number look better.
     */
    const rider = (inf, me, foe) => {
      const n = bite(inf.turns, inf.chance);
      switch (inf.status) {
        // 2 coherence a turn against +1/turn regeneration is 1 net, and a
        // coherence is worth whatever damage that cast buys with it.
        case 'frayed': return n * 1 * perCoherence(foe, me);
        // damage() multiplies an anchored attacker's output by 0.65.
        case 'anchored': return n * 0.35 * bestHit(foe, me);
        // 35% of unsure strikes are lost, and the cast cannot read.
        case 'static': return n * 0.35 * bestHit(foe, me);
        // The next hit taken is x1.5, once.
        case 'bleedover': return inf.chance * 0.5 * bestHit(me, foe);
        // Everything but strikes is locked. A kit with no strike in it is
        // exempt by rule, so sealing it is worth nothing.
        case 'sealed':
          return foe.def.abilities.some((a) => a.kind === 'strike')
            ? n * 0.35 * bestHit(foe, me)
            : 0;
        default: return 0;
      }
    };

    /**
     * What one point of coherence is worth right now, in damage.
     *
     * Not simply "the damage it buys": a combatant gets one action a turn
     * whatever its grip, so a cast sitting on a full bar cannot spend the
     * surplus and an extra point is worth nothing to it. Grip only becomes
     * valuable as it runs out, which is the whole reason GUTTERING exists.
     */
    const gripValue = (me, foe) => perCoherence(me, foe) * (1 - me.coherence / me.maxCoherence);

    /** Losing the race: they take you apart before you take them apart. */
    const race = (me, foe) =>
      me.integrity / bestHit(foe, me) <= foe.integrity / bestHit(me, foe) + 1;

    const worth = (a, me, foe) => {
      let v = expected(a, foe) - a.cost * gripValue(me, foe);
      for (const inf of a.inflict ?? []) {
        // Re-applying a status the target already carries buys nothing.
        if (!foe.statuses.has(inf.status)) v += rider(inf, me, foe);
      }
      if (a.selfBuff) {
        // Guards are cleared at the top of every turn, so a brace only ever
        // covers the opponent's next action \x7f and only if you act first.
        if (a.selfBuff.guard && me.def.grip >= foe.def.grip) {
          v += a.selfBuff.guard * bestHit(foe, me);
        }
        if (a.selfBuff.coherence) {
          const gained = Math.min(a.selfBuff.coherence, me.maxCoherence - me.coherence);
          v += gained * gripValue(me, foe);
        }
        if (a.selfBuff.integrity) {
          const gain = Math.min(a.selfBuff.integrity, me.maxIntegrity - me.integrity);
          // A heal buys turns, and turns are only worth anything if you are
          // losing the race. Priced at face value the scorer healed Lampwright
          // for fourteen turns against a boss it was never going to out-damage,
          // and lost 100% of them. Outside a race it is worth what it defers.
          v += race(me, foe) ? gain : gain * 0.25;
        }
      }
      // Every condition cleared is the rest of that condition not happening.
      if (a.clears) {
        for (const st of me.statuses.keys()) {
          v += st === 'guttering' ? 8 : rider({ status: st, turns: 3, chance: 1 }, foe, me);
        }
      }
      // A read is +30% damage for the rest of the fight, so it removes about a
      // quarter of the turns still needed to finish the job.
      if (a.kind === 'read' && !foe.analysed) v += 0.23 * foe.integrity;
      return v;
    };

    /** Whether an ability would change the board at all, rather than repeat it. */
    const changes = (a, foe) =>
      a.kind === 'read'
        ? !foe.analysed
        : (a.inflict ?? []).some((i) => !foe.statuses.has(i.status));

    /**
     * Player policies. Each stands in for a way a real person plays.
     *  - greedy:   always the biggest expected damage, riders ignored. The "is
     *              there a dominant damage strategy" probe, deliberately blind.
     *  - random:   picks anything affordable. The floor.
     *  - considered: picks the highest total worth. What a thoughtful player
     *              does \x7f it reads first, heals when a heal is not wasted,
     *              braces when grip is the scarce thing, and otherwise hits.
     *  - support:  control first, and only control that changes something.
     *              Probes whether the non-damage kit is a strategy at all.
     *  - damage:   the previous `considered` policy, kept verbatim. It scores
     *              nothing but power x effectiveness, so it is the control
     *              group for the scorer above: any usage share it reports is
     *              what the old instrument could see.
     */
    const byWorth = (me, foe) => (b, a) => (worth(a, me, foe) > worth(b, me, foe) ? a : b);
    const policies = {
      greedy: (me, foe, kit) =>
        kit.reduce((b, a) => (expected(a, foe) > expected(b, foe) ? a : b)),
      random: (me, foe, kit, rng) => kit[rng.int(kit.length)],
      considered: (me, foe, kit) => kit.reduce(byWorth(me, foe)),
      damage: (me, foe, kit, rng) => {
        const hurt = me.integrity / me.maxIntegrity < 0.4;
        const strikes = kit.filter((a) => a.power > 0);
        const cheapest = strikes.length ? Math.min(...strikes.map((a) => a.cost)) : 99;
        if (!foe.analysed) { const r = kit.find((a) => a.kind === 'read'); if (r) return r; }
        if (hurt) { const m = kit.find((a) => a.kind === 'mend'); if (m) return m; }
        if (me.coherence < cheapest) { const g = kit.find((a) => a.kind === 'guard'); if (g) return g; }
        if (strikes.length) return strikes.reduce((b, a) => (expected(a, foe) > expected(b, foe) ? a : b));
        return kit[rng.int(kit.length)];
      },
      support: (me, foe, kit) => {
        const ctl = kit.filter(
          (a) => (a.kind === 'control' || a.kind === 'disrupt' || a.kind === 'read') && changes(a, foe),
        );
        if (ctl.length) return ctl.reduce(byWorth(me, foe));
        return kit.reduce(byWorth(me, foe));
      },
    };

    const out = { pairs: [], abilityTotals: {}, policyTotals: {} };
    const tesseraIds = Object.keys(TESSERAE);
    const encounterIds = Object.keys(ENCOUNTERS);

    for (const encId of encounterIds) {
      for (const tid of tesseraIds) {
        for (const [pname, policy] of Object.entries(policies)) {
          let wins = 0, losses = 0, timeouts = 0;
          let turnsSum = 0, dealtSum = 0, takenSum = 0, leftSum = 0;
          const used = {};
          for (let i = 0; i < RUNS; i++) {
            const scene = new BattleScene(encId, null);
            scene.simTessera = TESSERAE[tid];
            const r = scene.simulate(policy, 1000 + i * 7919);
            if (r.result === 'win') wins++;
            else if (r.result === 'lose') losses++;
            else timeouts++;
            turnsSum += r.turns;
            dealtSum += r.damageDealt;
            takenSum += r.damageTaken;
            leftSum += r.meIntegrityLeft;
            for (const [k, v] of r.used) used[k] = (used[k] ?? 0) + v;
          }
          const n = RUNS;
          const rec = {
            encounter: encId, tessera: tid, policy: pname,
            winRate: wins / n, lossRate: losses / n, timeoutRate: timeouts / n,
            avgTurns: turnsSum / n,
            avgDealt: dealtSum / n, avgTaken: takenSum / n,
            avgIntegrityLeft: leftSum / n,
            used,
          };
          out.pairs.push(rec);
          // ability usage aggregated per tessera (abilities are per-tessera)
          for (const [k, v] of Object.entries(used)) {
            out.abilityTotals[k] = (out.abilityTotals[k] ?? 0) + v;
          }
          out.policyTotals[pname] = out.policyTotals[pname] ?? { wins: 0, n: 0, turns: 0 };
          out.policyTotals[pname].wins += wins;
          out.policyTotals[pname].n += n;
          out.policyTotals[pname].turns += turnsSum;
        }
      }
    }

    // Per-tessera ability share, so a rarely-picked ability inside a good kit
    // is still visible. Reported under both scorers: dead and dominant are
    // claims about the game, and a claim that only holds under one instrument
    // is a claim about the instrument.
    out.kitShare = {};
    for (const pname of ['considered', 'damage']) {
      out.kitShare[pname] = {};
      for (const tid of tesseraIds) {
        const ids = TESSERAE[tid].abilities.map((a) => a.id);
        const counts = {};
        let total = 0;
        for (const rec of out.pairs) {
          if (rec.tessera !== tid || rec.policy !== pname) continue;
          for (const id of ids) { counts[id] = (counts[id] ?? 0) + (rec.used[id] ?? 0); total += rec.used[id] ?? 0; }
        }
        out.kitShare[pname][tid] = {
          total,
          share: Object.fromEntries(ids.map((id) => [id, total ? counts[id] / total : 0])),
        };
      }
    }
    return out;
  }, RUNS);

  console.error('[dbg] evaluate done');
  await browser.close();
  server?.kill('SIGTERM');

  if (JSON_OUT) {
    writeFileSync(path.join(ROOT, 'shots', 'balance.json'), JSON.stringify(data, null, 2));
    console.log('wrote shots/balance.json');
  }

  const pct = (x) => (x * 100).toFixed(0) + '%';
  console.log(`\nCOMBAT BALANCE — ${RUNS} battles per cell\n`);

  console.log('win rate by encounter x policy (averaged over all five tesserae)');
  const encs = [...new Set(data.pairs.map((p) => p.encounter))];
  const pols = [...new Set(data.pairs.map((p) => p.policy))];
  console.log('  ' + 'encounter'.padEnd(20) + pols.map((p) => p.padStart(12)).join(''));
  for (const e of encs) {
    const row = pols.map((p) => {
      const rs = data.pairs.filter((x) => x.encounter === e && x.policy === p);
      const w = rs.reduce((a, b) => a + b.winRate, 0) / rs.length;
      return pct(w).padStart(12);
    });
    console.log('  ' + e.padEnd(20) + row.join(''));
  }

  console.log('\naverage battle length in turns');
  console.log('  ' + 'encounter'.padEnd(20) + pols.map((p) => p.padStart(12)).join(''));
  for (const e of encs) {
    const row = pols.map((p) => {
      const rs = data.pairs.filter((x) => x.encounter === e && x.policy === p);
      const t = rs.reduce((a, b) => a + b.avgTurns, 0) / rs.length;
      return t.toFixed(1).padStart(12);
    });
    console.log('  ' + e.padEnd(20) + row.join(''));
  }

  console.log('\nper-tessera win rate vs the boss (considered policy)');
  for (const rec of data.pairs.filter((p) => p.encounter === 'registry-sentinel' && p.policy === 'considered')) {
    console.log(`  ${rec.tessera.padEnd(16)} ${pct(rec.winRate).padStart(5)}  ` +
      `${rec.avgTurns.toFixed(1)} turns  ${pct(rec.avgIntegrityLeft)} integrity left`);
  }

  const dead = [];
  const dominant = [];
  for (const [pname, kits] of Object.entries(data.kitShare)) {
    console.log(`\nability usage share within its own kit (${pname} policy)`);
    for (const [tid, k] of Object.entries(kits)) {
      console.log(`  ${tid}`);
      for (const [id, sh] of Object.entries(k.share).sort((a, b) => b[1] - a[1])) {
        const bar = '#'.repeat(Math.round(sh * 30));
        console.log(`    ${id.padEnd(16)} ${pct(sh).padStart(5)} ${bar}`);
        if (pname !== 'considered') continue;
        if (sh < 0.02) dead.push(`${tid}/${id} (${pct(sh)})`);
        if (sh > 0.60) dominant.push(`${tid}/${id} (${pct(sh)})`);
      }
    }
  }

  console.log('\n--- findings ---');
  if (dominant.length) {
    console.log('DOMINANT (>60% of its kit — the other options are decoration):');
    for (const d of dominant) console.log('  ! ' + d);
  } else console.log('no dominant ability (>60% share)');
  if (dead.length) {
    console.log('DEAD (<2% — no sensible policy wants it):');
    for (const d of dead) console.log('  ! ' + d);
  } else console.log('no dead abilities (<2% share)');

  const to = data.pairs.filter((p) => p.timeoutRate > 0.02);
  if (to.length) {
    console.log(`STALLED: ${to.length} cells time out >2% of the time:`);
    for (const t of to.slice(0, 6)) console.log(`  ! ${t.encounter}/${t.tessera}/${t.policy} ${pct(t.timeoutRate)}`);
  } else console.log('no stalled matchups');

  // A tutorial you can lose, or a boss you cannot, are both design failures.
  const tut = data.pairs.filter((p) => p.encounter === 'tutorial-spar' && p.policy === 'considered');
  const tutWin = tut.reduce((a, b) => a + b.winRate, 0) / tut.length;
  console.log(`tutorial win rate (considered): ${pct(tutWin)} — target >90%`);
  const boss = data.pairs.filter((p) => p.encounter === 'registry-sentinel' && p.policy === 'considered');
  const bossWin = boss.reduce((a, b) => a + b.winRate, 0) / boss.length;
  console.log(`boss win rate (considered):     ${pct(bossWin)} — target 55-80%`);
  const bossRandom = data.pairs.filter((p) => p.encounter === 'registry-sentinel' && p.policy === 'random');
  const bossRandWin = bossRandom.reduce((a, b) => a + b.winRate, 0) / bossRandom.length;
  console.log(`boss win rate (random):         ${pct(bossRandWin)} — target <35%, or thought does not matter`);

  if (errors.length) { console.error('\nPAGE ERRORS:'); for (const e of errors) console.error('  ' + e); }
}

main().catch((e) => { console.error(e); process.exit(1); });
