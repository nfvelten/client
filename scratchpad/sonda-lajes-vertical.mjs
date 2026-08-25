/* Sonda: perfil de ALTURA das rotas separadas spawn↔bandeira no lajes.
   Reproduz o CTF2 do map-check e mede, por rota, quanto do comprimento corre no térreo. */
import { bootGame, initTextures } from '../tools/eval/harness.mjs';

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 16082026 });
const W = game.world;
const nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const SEP_ROTA = 6.0;

const caminho = (from, to, bloq) => {
  const n = nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
  const vis = new Uint8Array(n);
  if (bloq[from] || bloq[to]) return null;
  dist[from] = 0;
  for (;;) {
    let cur = -1, bd = Infinity;
    for (let i = 0; i < n; i++) if (!vis[i] && dist[i] < bd) { bd = dist[i]; cur = i; }
    if (cur === -1 || cur === to) break;
    vis[cur] = 1;
    for (const m of adj[cur]) {
      if (bloq[m]) continue;
      const d = dist[cur] + Math.hypot(nodes[cur].x - nodes[m].x, nodes[cur].z - nodes[m].z);
      if (d < dist[m]) { dist[m] = d; prev[m] = cur; }
    }
  }
  if (!isFinite(dist[to])) return null;
  const p = [to]; let c = prev[to]; while (c !== -1) { p.unshift(c); c = prev[c]; }
  return p;
};

const TERREO_Y = 1.6;   // abaixo disso é térreo (laje está a 5,2)
console.log('time bandeira | rota | comprimento | %térreo | classe');
let piorTerreo = 0, paresSemTerrea = [];
for (const [team, ss] of Object.entries(W.spawns)) {
  for (const p of W.ctfPoints) {
    const from = W.nearestWaypoint(ss[0].x, ss[0].z), to = W.nearestWaypoint(p.x, p.z);
    const bloq = new Uint8Array(nodes.length);
    const classes = [];
    for (let k = 0; k < 4; k++) {
      const cam = caminho(from, to, bloq);
      if (!cam) break;
      let total = 0, terreo = 0;
      for (let i = 1; i < cam.length; i++) {
        const A = nodes[cam[i - 1]], B = nodes[cam[i]];
        const seg = Math.hypot(B.x - A.x, B.z - A.z);
        total += seg;
        if ((A.y + B.y) / 2 < TERREO_Y) terreo += seg;
      }
      const frac = total ? terreo / total : 0;
      const classe = frac >= .5 ? 'TÉRREA' : frac <= .2 ? 'SUPERIOR' : 'mista';
      classes.push(classe);
      console.log(`${team} ${p.id} | ${k + 1} | ${total.toFixed(1)}m | ${(frac * 100).toFixed(0)}% | ${classe}`);
      const RAIO_PONTA = SEP_ROTA + 3.4, pA = nodes[from], pB = nodes[to];
      for (let i = 0; i < nodes.length; i++) {
        if (i === from || i === to) continue;
        if (Math.hypot(nodes[i].x - pA.x, nodes[i].z - pA.z) <= RAIO_PONTA) continue;
        if (Math.hypot(nodes[i].x - pB.x, nodes[i].z - pB.z) <= RAIO_PONTA) continue;
        for (const c2 of cam) if (Math.hypot(nodes[i].x - nodes[c2].x, nodes[i].z - nodes[c2].z) <= SEP_ROTA) { bloq[i] = 1; break; }
      }
    }
    if (!classes.includes('TÉRREA')) paresSemTerrea.push(`${team}→${p.id}`);
    piorTerreo = Math.max(piorTerreo, 0);
  }
}
console.log('\nPares spawn↔bandeira SEM nenhuma rota térrea:', paresSemTerrea.length, paresSemTerrea.join(', '));
const yTerreo = nodes.filter((n) => n.y < TERREO_Y).length;
console.log(`nós do grafo: ${nodes.length} total, ${yTerreo} no térreo (${(yTerreo / nodes.length * 100).toFixed(0)}%)`);
