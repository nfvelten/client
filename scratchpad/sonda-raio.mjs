import { bootGame, initTextures } from '../tools/eval/harness.mjs';
const textures = initTextures();
const DT = 1 / 60, SECS = 60;
const mapas = process.argv[2] ? [process.argv[2]] : ['lajes'];
for (const mapa of mapas) {
  let nb = 0, soma = 0, am = 0, terreo = 0, escada = 0, praca = 0;
  for (const seed of [12345, 777, 4242]) {
    const g = bootGame(mapa, { textures, bots: 4, seed });
    g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
    const s0 = new Map(g.bots.map((b) => [b, { x: b.pos.x, z: b.pos.z, max: 0 }]));
    for (let i = 0; i < Math.round(SECS / DT); i++) {
      g.update(DT);
      if (i % 9) continue;
      for (const b of g.bots) {
        if (!b.alive) continue;
        am++;
        if (b.pos.y < 1.6) { terreo++; if (Math.abs(b.pos.x) < 7.2 && b.pos.z > -8.2 && b.pos.z < 9) praca++; }
        else if (b.pos.y < 4.6) escada++;
        const s = s0.get(b); s.max = Math.max(s.max, Math.hypot(b.pos.x - s.x, b.pos.z - s.z));
      }
    }
    for (const [, s] of s0) { nb++; soma += s.max; }
  }
  console.log(mapa, 'raio', +(soma / nb).toFixed(1), 'fracTerreo', +(terreo / am).toFixed(3),
    'fracEscada', +(escada / am).toFixed(3), 'fracPraca', +(praca / am).toFixed(3));
}
