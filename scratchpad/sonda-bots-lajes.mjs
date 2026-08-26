/* SONDA: onde os bots do lajes realmente andam? (y por amostra, praça alcançada) */
import { bootGame, initTextures } from '../tools/eval/harness.mjs';

const textures = initTextures();
const PRACA = { x0: -7.2, x1: 7.2, z0: -8.2, z1: 9.0 };
const DT = 1 / 60;
const SECS = parseFloat(process.argv[2] || '90');
const CTF = process.env.SONDA_CTF === '1';

let totAmostras = 0, terreo = 0, praca = 0;
const botsQueDesceram = new Set(); let botsTot = 0;
for (const seed of [12345, 777, 4242]) {
  const g = bootGame('lajes', { textures, bots: 4, seed, ctf: CTF });
  g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
  const marca = new Map(g.bots.map((b) => [b, { desceu: false, praca: false, ymin: 99 }]));
  for (let i = 0; i < Math.round(SECS / DT); i++) {
    g.update(DT);
    if (i % 9) continue;
    for (const b of g.bots) {
      if (!b.alive) continue;
      totAmostras++;
      const s = marca.get(b);
      s.ymin = Math.min(s.ymin, b.pos.y);
      if (b.pos.y < 1.6) { terreo++; s.desceu = true; }
      if (b.pos.y < 1.6 && b.pos.x > PRACA.x0 && b.pos.x < PRACA.x1 && b.pos.z > PRACA.z0 && b.pos.z < PRACA.z1) { praca++; s.praca = true; }
    }
  }
  for (const [b, s] of marca) { botsTot++; if (s.praca) botsQueDesceram.add(`${seed}:${b.name || botsTot}`); }
  console.log(`seed ${seed}: ymin por bot = ${[...marca.values()].map((s) => s.ymin.toFixed(2)).join(', ')} | praca = ${[...marca.values()].map((s) => (s.praca ? 'S' : 'n')).join('')}`);
}
console.log(JSON.stringify({
  amostras: totAmostras,
  fracTerreo: +(terreo / totAmostras).toFixed(3),
  fracPraca: +(praca / totAmostras).toFixed(3),
  botsQueChegaramNaPraca: botsQueDesceram.size, botsTot,
}, null, 1));
