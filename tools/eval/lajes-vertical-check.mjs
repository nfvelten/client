/* LAJES — VERTICAL: cima × baixo. Régua comprada pelo relato do dono (25/08/2026):
   "a ideia era os times irem tanto por baixo quanto por cima, e agora só vai por cima.
    Por baixo tinha que ter uma praça no meio, ver os becos e jogar cima contra baixo."

   A CTF2 do map-check já exige 2 rotas SEPARADAS por par spawn↔bandeira, e o lajes passava
   com 2 a 4 rotas — todas pela laje. Medido pela sonda de 25/08 (scratchpad/sonda-lajes-vertical.mjs,
   harness real): nos 8 pares spawn↔bandeira, 20 rotas achadas, TODAS com 0% do comprimento
   no térreo. O grafo tinha 152 dos 363 nós no chão (42%) e nenhum deles era usado: os dois
   spawns nascem em laje, as quatro bandeiras estão em laje, e não havia descida perto do
   spawn. A CTF2 é cega para isso por construção — ela conta rotas, não mede a altura delas.

   Esta régua classifica as MESMAS rotas que a CTF2 enumera (limiar e enumerador
   compartilhados em rotas-separadas.mjs — lição 2) e cobra o resto do pedido:

     LV1  cada par spawn↔bandeira tem ao menos uma rota TÉRREA  (≥ 40% do comprimento no chão);
     LV2  cada par spawn↔bandeira tem ao menos uma rota SUPERIOR (≥ 60% do comprimento em laje);
     LV3  existe PRAÇA no térreo, no meio do mapa: sala livre contígua de ≥ 90 m² com largura
          útil ≥ 7 m nos dois eixos, centro a ≤ 9 m do meio do mapa;
     LV4  a praça tem COVER e não é corredor morto: ≥ 6 peças de cobertura (0,4–2,2 m de
          altura) dentro dela, espaçamento médio ≤ 7,0 m — o mesmo teto da QUAD_ESPAC do
          map-check, pela mesma conta (√(100/densidade) = duas arestas do grafo);
     LV5  BECOS VISÍVEIS DE CIMA: das bordas de laje que dão para o miolo, ≥ 55% das amostras
          do térreo central têm linha de visada limpa.

   LIMITE CONHECIDO (lição 3): roda em node, onde NENHUM GLB carrega. A visada da LV5 é
   medida contra a lista de COLLIDERS, não contra a malha — e os colisores das casas nascem
   da tabela HOUSE_BOUNDS, idêntica nos dois mundos (map_lajes_authored.js:56). O que ela NÃO
   vê é oclusão por peça puramente visual (varal, caixa d'água sem colisor, pipa). Confirme a
   leitura na captura 3:2, não só neste número.

   Mutantes:
     so-por-cima   sela as descidas de spawn com um colisor  → LV1 vermelha
     praca-cheia   enche a praça de colisores                → LV3/LV4 vermelhas
     laje-cega     ergue platibanda de 2,4 m na borda das lajes → LV5 vermelha
*/
import { THREE, bootGame, initTextures } from './harness.mjs';
import { rotasSeparadas } from './rotas-separadas.mjs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
const conhecidos = new Set(['', 'so-por-cima', 'praca-cheia', 'laje-cega']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 25082026 });
const W = game.world;

const Y_TERREO = 1.6;           // abaixo disso o nó é térreo (a laje do lajes está a 5,2 m)
const FRAC_TERREA = 0.40;       // rota TÉRREA: ≥ 40% do comprimento no chão
const FRAC_SUPERIOR = 0.60;     // rota SUPERIOR: ≥ 60% do comprimento em laje
const PRACA_AREA = 90;          // m² mínimos da sala livre do meio
const PRACA_LARG = 7.0;         // m de largura útil mínima nos dois eixos
const PRACA_RAIO = 9.0;         // m: distância máxima do centro da praça ao meio do mapa
const PRACA_COVER = 6;          // peças de cobertura mínimas dentro da praça
const COVER_ESPAC = 7.0;        // m — mesmo teto da QUAD_ESPAC do map-check (mesma conta)
const VISADA_MIN = 0.55;        // fração mínima de amostras do miolo visíveis das bordas

if (mutante === 'so-por-cima') {
  /* Sela a faixa das descidas de spawn nas duas pontas: quem nasce em laje não chega ao chão
     senão atravessando o mapa inteiro por cima. É o estado que o dono reprovou. */
  const antes = W.waypoints.nodes.length;
  const dentro = (n) => Math.abs(n.x) < 3.2 && (Math.abs(n.z + 26) < 3.4 || Math.abs(n.z - 26) < 3.4);
  let cortados = 0;
  for (let i = 0; i < W.waypoints.nodes.length; i++) {
    if (!dentro(W.waypoints.nodes[i])) continue;
    for (const m of W.waypoints.adj[i]) {
      const j = W.waypoints.adj[m].indexOf(i);
      if (j >= 0) W.waypoints.adj[m].splice(j, 1);
    }
    W.waypoints.adj[i] = []; cortados++;
  }
  if (!cortados) throw new Error('MUTANTE NÃO APLICOU: nenhuma descida de spawn no grafo — o defeito já está posto');
  void antes;
}
if (mutante === 'praca-cheia') {
  for (let x = -6; x <= 6; x += 1.2) for (let z = -6; z <= 5; z += 1.2)
    W.colliders.push({ minX: x - .55, maxX: x + .55, minY: 0, maxY: 3, minZ: z - .55, maxZ: z + .55 });
}
if (mutante === 'laje-cega') {
  const antes = W.colliders.length;
  for (const roof of W.levels || []) {
    for (const [x0, x1, z0, z1] of [[roof.x0, roof.x1, roof.z0, roof.z0 + .2], [roof.x0, roof.x1, roof.z1 - .2, roof.z1],
      [roof.x0, roof.x0 + .2, roof.z0, roof.z1], [roof.x1 - .2, roof.x1, roof.z0, roof.z1]])
      W.colliders.push({ minX: x0, maxX: x1, minY: 5.2, maxY: 7.6, minZ: z0, maxZ: z1 });
  }
  if (W.colliders.length <= antes) throw new Error('MUTANTE NÃO APLICOU: nenhuma laje declarada em levels');
}

/* ===================== LV1 / LV2 — altura das rotas ===================== */
const nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const pares = [], semTerrea = [], semSuperior = [];
for (const [time, ss] of Object.entries(W.spawns || {})) {
  for (const p of W.ctfPoints || []) {
    const from = W.nearestWaypoint(ss[0].x, ss[0].z), to = W.nearestWaypoint(p.x, p.z);
    const classes = [];
    for (const cam of rotasSeparadas(nodes, adj, from, to)) {
      let total = 0, terreo = 0;
      for (let i = 1; i < cam.length; i++) {
        const A = nodes[cam[i - 1]], B = nodes[cam[i]];
        const seg = Math.hypot(B.x - A.x, B.z - A.z);
        total += seg;
        if ((A.y + B.y) / 2 < Y_TERREO) terreo += seg;
      }
      const frac = total ? terreo / total : 0;
      classes.push({ total, frac, terrea: frac >= FRAC_TERREA, superior: (1 - frac) >= FRAC_SUPERIOR });
    }
    const rotulo = `${time}→${p.id}`;
    const temT = classes.some((c) => c.terrea), temS = classes.some((c) => c.superior);
    if (!temT) semTerrea.push(rotulo);
    if (!temS) semSuperior.push(rotulo);
    pares.push({ rotulo, n: classes.length,
      perfis: classes.map((c) => `${c.total.toFixed(0)}m/${(c.frac * 100).toFixed(0)}%chão`).join(' ') });
  }
}
const lv1 = semTerrea.length === 0;
const lv2 = semSuperior.length === 0;

/* ===================== LV3 / LV4 — a praça ===================== */
const B = W.bounds, STEP = 0.30;
const nx = Math.ceil((B.maxX - B.minX) / STEP), nz = Math.ceil((B.maxZ - B.minZ) / STEP);
const p3 = new THREE.Vector3();
const livreEm = (x, z) => {
  if (W.groundHeightAt(x, z, 0) > 0.55) return false;
  p3.set(x, 0, z); game._collide(p3, 0.38);
  return Math.abs(p3.x - x) < 1e-3 && Math.abs(p3.z - z) < 1e-3;
};
/* Sala do miolo: flood restrito à janela central do mapa e SEM tocar os becos estreitos —
   uma praça é uma sala, e um corredor de 1,8 m que atravessa o mapa não é praça. O flood
   só entra em célula cujo disco de 1,9 m de raio esteja livre (o "miolo largo"). */
const JAN = { x0: -11, x1: 11, z0: -14, z1: 13 };
const jx = Math.ceil((JAN.x1 - JAN.x0) / STEP), jz = Math.ceil((JAN.z1 - JAN.z0) / STEP);
const largo = new Uint8Array(jx * jz);
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  const x = JAN.x0 + (i + .5) * STEP, z = JAN.z0 + (k + .5) * STEP;
  if (!livreEm(x, z)) continue;
  let ok = true;
  for (let a = 0; a < 12 && ok; a++) {
    const ang = a * Math.PI / 6;
    if (!livreEm(x + Math.cos(ang) * 1.9, z + Math.sin(ang) * 1.9)) ok = false;
  }
  if (ok) largo[i * jz + k] = 1;
}
const comp = new Int32Array(jx * jz).fill(-1);
const salas = [];
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  if (!largo[i * jz + k] || comp[i * jz + k] >= 0) continue;
  const cid = salas.length, fila = [i * jz + k]; comp[i * jz + k] = cid;
  let minI = i, maxI = i, minK = k, maxK = k;
  for (let h = 0; h < fila.length; h++) {
    const c = fila[h], ci = (c / jz) | 0, ck = c % jz;
    minI = Math.min(minI, ci); maxI = Math.max(maxI, ci); minK = Math.min(minK, ck); maxK = Math.max(maxK, ck);
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= jx || l < 0 || l >= jz) continue;
      const d = j * jz + l;
      if (largo[d] && comp[d] < 0) { comp[d] = cid; fila.push(d); }
    }
  }
  salas.push({ cid, cel: fila.length, minI, maxI, minK, maxK });
}
/* A área da praça é a do miolo largo DILATADO pelo raio do disco: a célula do flood é o
   CENTRO de um disco de 1,9 m que cabe, então a sala real chega até a parede. */
salas.sort((a, b) => b.cel - a.cel);
const sala = salas[0] || null;
const praca = sala ? {
  area: sala.cel * STEP * STEP + (sala.maxI - sala.minI + sala.maxK - sala.minK + 2) * STEP * 1.9,
  largX: (sala.maxI - sala.minI + 1) * STEP + 3.8,
  largZ: (sala.maxK - sala.minK + 1) * STEP + 3.8,
  cx: JAN.x0 + (sala.minI + sala.maxI + 1) / 2 * STEP,
  cz: JAN.z0 + (sala.minK + sala.maxK + 1) / 2 * STEP,
} : null;
const lv3 = !!praca && praca.area >= PRACA_AREA && praca.largX >= PRACA_LARG && praca.largZ >= PRACA_LARG
  && Math.hypot(praca.cx, praca.cz) <= PRACA_RAIO;

/* Cover: colisor de peça (não parede, não laje) com o topo entre 0,4 e 2,2 m dentro da praça. */
const dentroPraca = (x, z) => praca && Math.abs(x - praca.cx) <= praca.largX / 2 && Math.abs(z - praca.cz) <= praca.largZ / 2;
const covers = (W.colliders || []).filter((c) => {
  const alt = c.maxY - c.minY;
  if (c.minY > 0.3 || alt < 0.4 || alt > 2.2) return false;
  const larg = Math.max(c.maxX - c.minX, c.maxZ - c.minZ);
  if (larg > 4.5) return false;                      // parede corrida não é cover de praça
  return dentroPraca((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2);
});
const areaPraca = praca ? praca.largX * praca.largZ : 0;
const espacCover = covers.length ? Math.sqrt(areaPraca / covers.length) : Infinity;
const lv4 = covers.length >= PRACA_COVER && espacCover <= COVER_ESPAC;

/* ===================== LV5 — becos visíveis de cima ===================== */
/* Ray-march contra os COLLIDERS (idênticos nos dois mundos — ver LIMITE CONHECIDO). */
const cols = W.colliders || [];
const visivel = (ax, ay, az, bx, by, bz) => {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  const passos = Math.ceil(len / 0.25);
  for (let s = 1; s < passos; s++) {
    const t = s / passos, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    for (const c of cols) {
      if (x > c.minX && x < c.maxX && y > c.minY && y < c.maxY && z > c.minZ && z < c.maxZ) return false;
    }
  }
  return true;
};
/* Olhos nas bordas de laje que dão para o miolo (altura do olho 1,6 m sobre a laje). */
const OLHOS = [[-7.6, -12], [7.6, -12], [-7.6, -1], [7.6, -1], [-7.6, 5.5], [7.6, 5.5], [-7.6, 9], [7.6, 9]];
const alvos = [];
for (let x = -6; x <= 6.01; x += 1.5) for (let z = -8; z <= 7.01; z += 1.5) if (livreEm(x, z)) alvos.push([x, z]);
let vistos = 0, testes = 0;
for (const [ox, oz] of OLHOS) {
  const oy = W.groundHeightAt(ox, oz, 1e3) + 1.6;
  for (const [tx, tz] of alvos) { testes++; if (visivel(ox, oy, oz, tx, 1.2, tz)) vistos++; }
}
const fracVisada = testes ? vistos / testes : 0;
const lv5 = fracVisada >= VISADA_MIN;

const checks = [
  ['LV1', 'todo par spawn↔bandeira tem rota TÉRREA', lv1,
    semTerrea.length ? `sem térrea: ${semTerrea.join(', ')}` : `${pares.length} pares · ${pares.map((p) => `${p.rotulo}[${p.perfis}]`).join(' · ')}`],
  ['LV2', 'todo par spawn↔bandeira tem rota SUPERIOR', lv2,
    semSuperior.length ? `sem superior: ${semSuperior.join(', ')}` : `${pares.length} pares ok`],
  ['LV3', 'praça no térreo, no meio do mapa', lv3, praca
    ? `${praca.area.toFixed(0)} m² (min ${PRACA_AREA}) · ${praca.largX.toFixed(1)}×${praca.largZ.toFixed(1)} m (min ${PRACA_LARG}) · centro (${praca.cx.toFixed(1)},${praca.cz.toFixed(1)}) a ${Math.hypot(praca.cx, praca.cz).toFixed(1)} m do meio (max ${PRACA_RAIO})`
    : 'nenhuma sala larga no miolo'],
  ['LV4', 'a praça tem cover (não é corredor morto)', lv4,
    `${covers.length} peças (min ${PRACA_COVER}) · espaçamento ${espacCover === Infinity ? '∞' : espacCover.toFixed(1)} m (max ${COVER_ESPAC})`],
  ['LV5', 'os becos do miolo são visíveis das bordas de laje', lv5,
    `${(fracVisada * 100).toFixed(1)}% de ${testes} visadas limpas (min ${(VISADA_MIN * 100).toFixed(0)}%)`],
];
let falhas = 0;
for (const [id, desc, ok, ev] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${ev}`);
}
if (falhas) { console.error(`LAJES-VERTICAL FALHA: ${falhas}/${checks.length}`); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-VERTICAL OK');
