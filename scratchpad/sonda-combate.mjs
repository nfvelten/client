import { bootGame, initTextures } from '../tools/eval/harness.mjs';
const textures = initTextures();
const DT = 1 / 60, SECS = 60;
for (const mapa of ['lajes', 'escadao', 'piscina_treta', 'ferro_velho']) {
  let am = 0, comAlvo = 0, path = 0, netSoma = 0, nb = 0;
  for (const seed of [12345, 777]) {
    const g = bootGame(mapa, { textures, bots: 4, seed });
    g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
    const p0 = new Map(g.bots.map((b) => [b, { x: b.pos.x, z: b.pos.z, max: 0 }]));
    for (let i = 0; i < Math.round(SECS / DT); i++) {
      g.update(DT);
      if (i % 9) continue;
      for (const b of g.bots) {
        if (!b.alive) continue;
        am++; if (b.target) comAlvo++; if (b.path && b.path.length > 1) path++;
        const s = p0.get(b); s.max = Math.max(s.max, Math.hypot(b.pos.x - s.x, b.pos.z - s.z));
      }
    }
    for (const [, s] of p0) { nb++; netSoma += s.max; }
  }
  console.log(mapa, 'fracComAlvo', +(comAlvo / am).toFixed(3), 'fracComRota', +(path / am).toFixed(3),
    'raio maximo medio (m)', +(netSoma / nb).toFixed(1));
}
