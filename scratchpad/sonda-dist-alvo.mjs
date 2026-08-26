import { bootGame, initTextures } from '../tools/eval/harness.mjs';
const textures = initTextures();
const DT = 1 / 60;
for (const mapa of ['lajes', 'escadao', 'ferro_velho']) {
  const ds = [];
  for (const seed of [12345, 777]) {
    const g = bootGame(mapa, { textures, bots: 4, seed });
    g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
    for (let i = 0; i < Math.round(60 / DT); i++) {
      g.update(DT);
      if (i % 9) continue;
      for (const b of g.bots) if (b.alive && b.target) ds.push(Math.hypot(b.pos.x - b.target.pos.x, b.pos.z - b.target.pos.z));
    }
  }
  ds.sort((a, c) => a - c);
  const q = (p) => ds[Math.floor(ds.length * p)].toFixed(1);
  console.log(mapa, 'n', ds.length, 'p25', q(.25), 'mediana', q(.5), 'p75', q(.75), 'p90', q(.9),
    '| > 25 m:', (100 * ds.filter((d) => d > 25).length / ds.length).toFixed(0) + '%');
}
