/* "3-4 barracos onde deviam ser apenas um": casas ombro a ombro na mesma fachada.
   Métrica sem depender de rumo — distância centro a centro. */
import { bootGame, initTextures } from '../tools/eval/harness.mjs';
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 1 });
const casas = g.world.colliders.filter((c) => c.casa)
  .map((c) => ({ x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2 }));
const OMBRO = 2.3;   // abaixo disso as duas fachadas se encostam
let coladas = 0; const graus = [];
for (let i = 0; i < casas.length; i++) {
  let n = 0;
  for (let j = 0; j < casas.length; j++) {
    if (i === j) continue;
    if (Math.hypot(casas[i].x - casas[j].x, casas[i].z - casas[j].z) <= OMBRO) n++;
  }
  graus.push(n); if (n) coladas++;
}
console.log('casas', casas.length, '| coladas em outra (<=2,3 m):', coladas,
  `(${(100 * coladas / casas.length).toFixed(0)}%)`, '| pior grau', Math.max(...graus));
