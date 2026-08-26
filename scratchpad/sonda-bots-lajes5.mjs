import { bootGame, initTextures } from '../tools/eval/harness.mjs';
const textures = initTextures();
const DT = 1 / 60, SECS = parseFloat(process.argv[2] || '60');
const PRACA = { x0: -7.2, x1: 7.2, z0: -8.2, z1: 9.0 };
let am = 0, terreo = 0, escada = 0, praca = 0, alvoTerreo = 0, alvoTot = 0, chegou = 0, botsTot = 0;
for (const seed of [12345, 777, 4242]) {
  const g = bootGame('lajes', { textures, bots: 4, seed });
  g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
  const N = g.world.waypoints.nodes;
  const tocou = new Map(g.bots.map((b) => [b, false]));
  for (let i = 0; i < Math.round(SECS / DT); i++) {
    g.update(DT);
    if (i % 9) continue;
    for (const b of g.bots) {
      if (!b.alive) continue;
      am++;
      if (b.pos.y < 1.6) { terreo++; if (b.pos.x > PRACA.x0 && b.pos.x < PRACA.x1 && b.pos.z > PRACA.z0 && b.pos.z < PRACA.z1) { praca++; tocou.set(b, true); } }
      else if (b.pos.y < 4.6) escada++;
      if (b.roamIdx !== undefined) { alvoTot++; if (N[b.roamIdx].y < 1.6) alvoTerreo++; }
    }
  }
  for (const [, v] of tocou) { botsTot++; if (v) chegou++; }
}
console.log(JSON.stringify({ amostras: am, fracTerreo: +(terreo/am).toFixed(3), fracEscada: +(escada/am).toFixed(3),
  fracPraca: +(praca/am).toFixed(3), alvosNoTerreo: +(alvoTerreo/alvoTot).toFixed(3), botsNaPraca: chegou, botsTot }, null, 1));
