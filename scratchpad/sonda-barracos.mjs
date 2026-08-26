import { bootGame, initTextures } from '../tools/eval/harness.mjs';
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 1 });
const casas = g.world.colliders.filter((c) => c.casa);
console.log('casas do kit:', casas.length);
const larg = casas.map((c) => Math.min(c.maxX - c.minX, c.maxZ - c.minZ));
const frente = casas.map((c) => Math.max(c.maxX - c.minX, c.maxZ - c.minZ));
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)];
console.log('frente(m) min/med/max', Math.min(...frente).toFixed(2), q(frente, .5).toFixed(2), Math.max(...frente).toFixed(2));
console.log('fundo(m)  min/med/max', Math.min(...larg).toFixed(2), q(larg, .5).toFixed(2), Math.max(...larg).toFixed(2));
const h = casas.map((c) => c.casaH);
console.log('altura(m) min/med/max', Math.min(...h).toFixed(2), q(h, .5).toFixed(2), Math.max(...h).toFixed(2));
console.log('estreitas (frente < 2.2 m):', frente.filter((f) => f < 2.2).length);
/* AGLOMERADO: casa cujo centro está a <= 2.6 m do centro de outra casa (fachada colada) */
let clusters = [];
const vis = new Set();
const cx = (c) => (c.minX + c.maxX) / 2, cz = (c) => (c.minZ + c.maxZ) / 2;
for (let i = 0; i < casas.length; i++) {
  if (vis.has(i)) continue;
  const st = [i]; vis.add(i); const grp = [];
  while (st.length) {
    const k = st.pop(); grp.push(k);
    for (let j = 0; j < casas.length; j++) {
      if (vis.has(j)) continue;
      if (Math.hypot(cx(casas[k]) - cx(casas[j]), cz(casas[k]) - cz(casas[j])) <= 2.6) { vis.add(j); st.push(j); }
    }
  }
  clusters.push(grp);
}
clusters.sort((a, b) => b.length - a.length);
console.log('aglomerados por tamanho:', clusters.map((c) => c.length).slice(0, 14).join(','));
console.log('aglomerados com >= 3 casas:', clusters.filter((c) => c.length >= 3).length, '/', clusters.length);
for (const grp of clusters.slice(0, 5)) {
  console.log('  grupo', grp.length, grp.map((i) => `${casas[i].casa.slice(-2)}@${cx(casas[i]).toFixed(1)},${cz(casas[i]).toFixed(1)} f=${frente[i].toFixed(1)} h=${casas[i].casaH.toFixed(1)}`).join(' | '));
}
