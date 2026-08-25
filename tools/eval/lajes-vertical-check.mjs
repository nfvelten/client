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

     LV1  ir POR BAIXO é opção viável, não castigo: para cada par spawn↔bandeira distante, a
          melhor rota que passa PELA PRAÇA gasta ≥ 40% do caminho no térreo e não é mais de
          1,6× mais longa que a melhor rota do mapa;
     LV2  ir POR CIMA continua sendo opção: a melhor rota do par corre ≥ 60% em laje;
     LV3  existe PRAÇA no térreo, no meio do mapa: sala livre contígua de ≥ 90 m² com largura
          útil ≥ 7 m nos dois eixos, centro a ≤ 9 m do meio do mapa;
     LV4  a praça tem COVER e não é corredor morto: ≥ 6 peças de cobertura (0,4–2,2 m de
          altura) dentro dela, espaçamento médio ≤ 7,0 m — o mesmo teto da QUAD_ESPAC do
          map-check, pela mesma conta (√(100/densidade) = duas arestas do grafo);
     LV6  toda aresta de térreo do grafo é ANDÁVEL de ponta a ponta (vão inteiro livre para o
          corpo de 0,38 m), não só nas pontas;
     LV5  BECOS VISÍVEIS DE CIMA: das bordas de laje que dão para o miolo, ≥ 55% das amostras
          do térreo central têm linha de visada limpa.

   LIMITE CONHECIDO (lição 3): roda em node, onde NENHUM GLB carrega. A visada da LV5 é
   medida contra a lista de COLLIDERS, não contra a malha — e os colisores das casas nascem
   da tabela HOUSE_BOUNDS, idêntica nos dois mundos (map_lajes_authored.js:56). O que ela NÃO
   vê é oclusão por peça puramente visual (varal, caixa d'água sem colisor, pipa). Confirme a
   leitura na captura 3:2, não só neste número.

   Mutantes:
     so-por-cima   religa o pé de cada escada só nos próprios degraus (o defeito original)
                   → LV1 vermelha
     praca-cheia   enche a praça de colisores                → LV3/LV4 vermelhas
     laje-cega     ergue platibanda cega de 2,4 m na borda das lajes do miolo → LV5 vermelha
     aresta-fantasma liga dois nós de térreo através de um muro → LV6 vermelha
*/
import { THREE, bootGame, initTextures } from './harness.mjs';
import { rotasSeparadas, caminhoBloqueado, RAIO_PONTA } from './rotas-separadas.mjs';
import { QUAD_ESPAC } from './limiares-mapa.mjs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
const conhecidos = new Set(['', 'so-por-cima', 'praca-cheia', 'laje-cega', 'aresta-fantasma']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 25082026 });
const W = game.world;

const Y_TERREO = 1.6;           // abaixo disso o nó é térreo (a laje do lajes está a 5,2 m)
const FRAC_TERREA = 0.40;       // rota TÉRREA: ≥ 40% do comprimento no chão
const FRAC_SUPERIOR = 0.60;     // rota SUPERIOR: ≥ 60% do comprimento em laje
/* O QUE SE COMPARA, e por quê não é a rota de cima mais curta. A rota de cima mais curta é
   quase a reta entre spawn e bandeira (53,5 m para 49 m de distância no par E→P): as lajes
   formam um tabuleiro contínuo. Ir por baixo carrega dois custos que o projeto do mapa impõe
   e que nenhum conserto tira: as duas escadas em U custam 22,6 m fixos de caminhada (medido
   na geometria da addStaircase — 2 lances de 4,2 m + 2 patamares de 1,45 m, por escada) e a
   espinha inferior é SINUOSA de propósito (LAJES_LOOPS.beco, "espinha sinuosa inferior";
   medido 62 m de beco para 46 m de reta entre os pés das escadas, 1,35×). Sobre a rota de
   cima mais curta isso já dá ~1,87× antes de qualquer desperdício — cobrar 1,6× seria cobrar
   que o térreo deixasse de ser o térreo deste mapa.
   O que o dono pediu é que o time possa ir "tanto por baixo quanto por cima". O par honesto
   disso é o FLANCO: a segunda rota separada que a CTF2 já conta como alternativa jogável por
   cima (100,4 m no E→P, 1,88× a direta). Se atravessar por baixo custa o mesmo que flanquear
   por cima, ir por baixo é escolha e não castigo — e é isso que a LV1 mede.
   Só vale para par que ATRAVESSA o mapa (spawn e bandeira em lados opostos de z = 0). É o
   "onde fizer sentido" do pedido: para esses a praça está NO CAMINHO, então descer não é
   detour, é escolha. Cobrar rota de praça de par do mesmo lado (spawn E e bandeira a 13,5 m,
   ambos ao norte) seria exigir descer 5 m e subir 5 m para andar 13 — castigo, não rota. */
const FATOR_DETOUR = 1.5;   // rota de baixo ≤ 1,5 × a rota de FLANCO por cima
void RAIO_PONTA;
/* 90 m²: a praça é a MAIOR sala do mapa por construção — a maior laje é a CN do spawn
   (x −4,6..4,6 × z −36..−28,5 = 9,2 × 7,5 = 69 m², map_lajes_authored.js:38). Uma praça que
   não passa da maior laje não é o "encontro por baixo" que o dono pediu, é mais um pátio. */
const PRACA_AREA = 90;          // m² mínimos da sala livre do meio
const PRACA_LARG = 7.0;         // m de largura útil mínima nos dois eixos
/* Raio do disco que define "sala" e não "corredor". O beco mais largo do mapa tem 1,76 m
   (addAlleySegment, width 1,76/1,62), meia-largura 0,88 — nenhuma célula de beco cabe num
   disco de 1,20 m, com folga. Acima disso (1,9 m) a régua passava a reprovar praça MOBILIADA,
   que é o que ela deveria premiar: dois bancos a 2,5 m um do outro quebravam a sala inteira. */
const R_SALA = 1.20;
const PRACA_RAIO = 9.0;         // m: distância máxima do centro da praça ao meio do mapa
const PRACA_COVER = 6;          // peças de cobertura mínimas dentro da praça
const VISADA_MIN = 0.55;        // fração mínima de amostras do miolo visíveis das bordas

if (mutante === 'so-por-cima') {
  /* Recria EXATAMENTE o defeito que esta rodada consertou: o pé de cada escada ligado só aos
     próprios degraus, nunca ao grafo do térreo (map_lajes_authored.js linkava o nó mais
     próximo com y < 1 e achava o primeiro degrau da própria escada, a 0,28 m). O chão vira um
     componente separado do telhado e não existe travessia por baixo — o mapa que o dono
     reprovou. Se a LV1 não ficar vermelha aqui, ela não mede o que diz medir. */
  /* Corta TODA aresta que sobe do chão puro (y ≈ 0) para qualquer nó elevado. Duas versões
     anteriores sobreviveram por serem tímidas demais: cortar só o nó-pé poupava o ramal novo
     do beco (a 0,4 m dele), e cortar só vizinho distante poupava os DEGRAUS baixos, em que a
     malha de térreo encosta de lado. Mutante que não aplica parece mutante que passou. */
  let cortados = 0;
  for (let a = 0; a < W.waypoints.nodes.length; a++) {
    if (W.waypoints.nodes[a].y >= .06) continue;
    for (const b of [...W.waypoints.adj[a]]) {
      if (W.waypoints.nodes[b].y < .06) continue;
      W.waypoints.adj[a] = W.waypoints.adj[a].filter((i) => i !== b);
      W.waypoints.adj[b] = W.waypoints.adj[b].filter((i) => i !== a);
      cortados++;
    }
  }
  if (!cortados) throw new Error('MUTANTE NÃO APLICOU: o térreo já não sobe — o defeito já está posto');
}
if (mutante === 'praca-cheia') {
  for (let x = -7; x <= 7; x += 1.2) for (let z = -8; z <= 9; z += 1.2)
    W.colliders.push({ minX: x - .55, maxX: x + .55, minY: 0, maxY: 3, minZ: z - .55, maxZ: z + .55 });
}
if (mutante === 'laje-cega') {
  /* Platibanda cega de 2,4 m na borda das lajes que olham o miolo (x = ∓7,4): é o "andar de
     cima travado com parede cega" que o critério 3 proíbe. */
  const antes = W.colliders.length;
  for (const side of [-1, 1])
    W.colliders.push({ minX: side * 7.3 - .15, maxX: side * 7.3 + .15, minY: 5.2, maxY: 7.6,
      minZ: -16, maxZ: 14 });
  if (W.colliders.length <= antes) throw new Error('MUTANTE NÃO APLICOU');
}

if (mutante === 'aresta-fantasma') {
  /* Liga dois nós de térreo separados por um muro de beco. É o defeito que o vaoLivre do
     map_lajes_authored corrigiu: a aresta era aceita testando SÓ o ponto médio, então com nós
     a 2,0 m e muro de 0,26 m o médio caía fora da parede e o grafo jurava passagem. */
  const N = W.waypoints.nodes;
  let ligou = 0;
  for (let a = 0; a < N.length && !ligou; a++) {
    if (N[a].y >= 1.6) continue;
    for (let b = 0; b < N.length; b++) {
      if (b === a || N[b].y >= 1.6) continue;
      const d = Math.hypot(N[b].x - N[a].x, N[b].z - N[a].z);
      if (d < 1.5 || d > 3.5) continue;
      if (W.waypoints.adj[a].includes(b)) continue;
      /* As DUAS pontas têm que ser andáveis e o MEIO bloqueado — é a assinatura exata do
         defeito. Primeira versão só exigia o meio bloqueado, pegava par com ponta dentro de
         sólido, e a LV6 (que pula ponta em sólido, isso é a LC5) não mordia: o mutante
         sobreviveu parecendo que a régua não servia. */
      const solido = (x, z) => {
        const p = new THREE.Vector3(x, 0, z); game._collide(p, .38);
        return Math.hypot(p.x - x, p.z - z) >= 1e-3;
      };
      if (solido(N[a].x, N[a].z) || solido(N[b].x, N[b].z)) continue;
      if (!solido((N[a].x + N[b].x) / 2, (N[a].z + N[b].z) / 2)) continue;
      W.waypoints.adj[a].push(b); W.waypoints.adj[b].push(a); ligou = 1; break;
    }
  }
  if (!ligou) throw new Error('MUTANTE NÃO APLICOU: não achei par de nós de térreo separados por sólido');
}

/* ===================== LV1 / LV2 — cima × baixo ===================== */
const nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const SEM_BLOQUEIO = new Uint8Array(nodes.length);
const comprimento = (cam) => {
  let total = 0;
  for (let i = 1; i < cam.length; i++) total += Math.hypot(nodes[cam[i]].x - nodes[cam[i - 1]].x, nodes[cam[i]].z - nodes[cam[i - 1]].z);
  return total;
};
const fracTerreo = (cam) => {
  let total = 0, terreo = 0;
  for (let i = 1; i < cam.length; i++) {
    const A = nodes[cam[i - 1]], B = nodes[cam[i]];
    const seg = Math.hypot(B.x - A.x, B.z - A.z);
    total += seg;
    if ((A.y + B.y) / 2 < Y_TERREO) terreo += seg;
  }
  return total ? terreo / total : 0;
};
/* ROTA POR BAIXO = a melhor rota que ATRAVESSA O MIOLO NO CHÃO. Bloqueia toda laje no terço
   central do mapa (|z| ≤ 13 de 39): perto do spawn e perto da bandeira a laje continua
   liberada — o que se cobra é que dê para CRUZAR por baixo, não que se rasteje o trajeto todo.
   Primeira tentativa foi "melhor rota que encosta num nó da praça", e ela media outra coisa:
   o caminho corria pela laje e só descia no último metro para tocar a praça (16% de chão num
   trajeto dito "por baixo"). Tocar a praça não é ir por baixo. */
const MIOLO_Z = 13;
const bloqLaje = new Uint8Array(nodes.length);
for (let i = 0; i < nodes.length; i++)
  if (nodes[i].y >= Y_TERREO && Math.abs(nodes[i].z) <= MIOLO_Z) bloqLaje[i] = 1;
const pares = [], falhouTerrea = [], falhouSuperior = [];
for (const [time, ss] of Object.entries(W.spawns || {})) {
  for (const p of W.ctfPoints || []) {
    const from = W.nearestWaypoint(ss[0].x, ss[0].z), to = W.nearestWaypoint(p.x, p.z);
    const rotulo = `${time}→${p.id}`;
    const direto = Math.hypot(nodes[from].x - nodes[to].x, nodes[from].z - nodes[to].z);
    const porCima = rotasSeparadas(nodes, adj, from, to);
    if (!porCima.length) { falhouTerrea.push(`${rotulo}(sem rota)`); falhouSuperior.push(`${rotulo}(sem rota)`); continue; }
    const L0 = comprimento(porCima[0]), fracCima = 1 - fracTerreo(porCima[0]);
    const Lflanco = comprimento(porCima[1] || porCima[0]);
    if (fracCima < FRAC_SUPERIOR) falhouSuperior.push(`${rotulo} ${(fracCima * 100).toFixed(0)}%laje`);
    const atravessa = (ss[0].z < 0) !== (p.z < 0);
    if (!atravessa) { pares.push(`${rotulo} mesmo lado(${direto.toFixed(0)}m) — só LV2`); continue; }
    const porBaixo = caminhoBloqueado(nodes, adj, from, to, bloqLaje);
    if (!porBaixo) { falhouTerrea.push(`${rotulo}(sem travessia por baixo)`); continue; }
    const L1 = comprimento(porBaixo), frac = fracTerreo(porBaixo);
    const fator = Lflanco ? L1 / Lflanco : Infinity;
    const ok = frac >= FRAC_TERREA && fator <= FATOR_DETOUR;
    if (!ok) falhouTerrea.push(`${rotulo} ${(frac * 100).toFixed(0)}%chão ${fator.toFixed(2)}×`);
    pares.push(`${rotulo} direta ${L0.toFixed(0)}m · flanco ${Lflanco.toFixed(0)}m · baixo ${L1.toFixed(0)}m (${fator.toFixed(2)}× o flanco, ${(frac * 100).toFixed(0)}%chão)`);
  }
}
const lv1 = falhouTerrea.length === 0;
const lv2 = falhouSuperior.length === 0;
void rotasSeparadas;

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
const cel = (i, k) => [JAN.x0 + (i + .5) * STEP, JAN.z0 + (k + .5) * STEP];
const livreCache = new Uint8Array(jx * jz);
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  const [x, z] = cel(i, k);
  if (livreEm(x, z)) livreCache[i * jz + k] = 1;
}
/* Miolo LARGO: célula cujo disco de R_SALA está livre. É o que separa sala de corredor. */
const largo = new Uint8Array(jx * jz);
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  if (!livreCache[i * jz + k]) continue;
  const [x, z] = cel(i, k);
  let ok = true;
  for (let a = 0; a < 12 && ok; a++) {
    const ang = a * Math.PI / 6;
    if (!livreEm(x + Math.cos(ang) * R_SALA, z + Math.sin(ang) * R_SALA)) ok = false;
  }
  if (ok) largo[i * jz + k] = 1;
}
const comp = new Int32Array(jx * jz).fill(-1);
const salas = [];
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  if (!largo[i * jz + k] || comp[i * jz + k] >= 0) continue;
  const cid = salas.length, fila = [i * jz + k]; comp[i * jz + k] = cid;
  for (let h = 0; h < fila.length; h++) {
    const c = fila[h], ci = (c / jz) | 0, ck = c % jz;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= jx || l < 0 || l >= jz) continue;
      const d = j * jz + l;
      if (largo[d] && comp[d] < 0) { comp[d] = cid; fila.push(d); }
    }
  }
  salas.push({ cid, cel: fila });
}
/* A sala real = as células LIVRES a até R_SALA do miolo largo (dilatação exata). A célula do
   flood é o CENTRO de um disco que cabe, então sem dilatar a praça mediria só o esqueleto. */
salas.sort((a, b) => b.cel.length - a.cel.length);
const sala = salas[0] || null;
let praca = null;
if (sala) {
  const raioCel = Math.ceil(R_SALA / STEP);
  const dil = new Uint8Array(jx * jz);
  for (const c of sala.cel) {
    const ci = (c / jz) | 0, ck = c % jz;
    for (let di = -raioCel; di <= raioCel; di++) for (let dk = -raioCel; dk <= raioCel; dk++) {
      if (Math.hypot(di, dk) * STEP > R_SALA) continue;
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= jx || l < 0 || l >= jz) continue;
      if (livreCache[j * jz + l]) dil[j * jz + l] = 1;
    }
  }
  let n = 0, minI = jx, maxI = -1, minK = jz, maxK = -1;
  for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
    if (!dil[i * jz + k]) continue;
    n++; minI = Math.min(minI, i); maxI = Math.max(maxI, i); minK = Math.min(minK, k); maxK = Math.max(maxK, k);
  }
  praca = { area: n * STEP * STEP,
    largX: (maxI - minI + 1) * STEP, largZ: (maxK - minK + 1) * STEP,
    cx: JAN.x0 + (minI + maxI + 1) / 2 * STEP, cz: JAN.z0 + (minK + maxK + 1) / 2 * STEP };
}
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
const lv4 = covers.length >= PRACA_COVER && espacCover <= QUAD_ESPAC;

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

/* ===================== LV6 — aresta atravessável ===================== */
/* Usa o _collide de PRODUÇÃO com o raio do jogador (0,38), não a caixa do gerador: a régua e
   o jogo têm que rodar no mesmo mundo (lição 3). Amostra a 0,3 m — menor que a parede mais
   fina que colide no mapa (0,14 m de guarda-corpo / 0,18 m de poço de escada). */
const pLV6 = new THREE.Vector3();
const andavel = (x, z) => {
  pLV6.set(x, 0, z); game._collide(pLV6, .38);
  return Math.hypot(pLV6.x - x, pLV6.z - z) < 1e-3;
};
const arestasRuins = [];
let arestasTerreo = 0;
for (let a = 0; a < nodes.length; a++) {
  if (nodes[a].y >= Y_TERREO) continue;
  for (const b of adj[a]) {
    if (b <= a || nodes[b].y >= Y_TERREO) continue;
    arestasTerreo++;
    const A = nodes[a], B = nodes[b], d = Math.hypot(B.x - A.x, B.z - A.z);
    if (!andavel(A.x, A.z) || !andavel(B.x, B.z)) continue;   // ponta em sólido é outra régua (LC5)
    const passos = Math.max(1, Math.ceil(d / .3));
    for (let s2 = 1; s2 < passos; s2++) {
      const t = s2 / passos;
      if (andavel(A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t)) continue;
      arestasRuins.push(`(${A.x.toFixed(1)},${A.z.toFixed(1)})→(${B.x.toFixed(1)},${B.z.toFixed(1)})`);
      break;
    }
  }
}
const lv6 = arestasRuins.length === 0;

const checks = [
  ['LV1', 'atravessar por baixo custa o mesmo que flanquear por cima (≥40% chão, ≤1,5× o flanco)', lv1,
    falhouTerrea.length ? `reprova: ${falhouTerrea.join(' · ')}` : pares.join(' · ')],
  ['LV2', 'ir por cima continua sendo opção (≥60% em laje)', lv2,
    falhouSuperior.length ? `reprova: ${falhouSuperior.join(', ')}` : `${pares.length} pares ok`],
  ['LV3', 'praça no térreo, no meio do mapa', lv3, praca
    ? `${praca.area.toFixed(0)} m² (min ${PRACA_AREA}) · ${praca.largX.toFixed(1)}×${praca.largZ.toFixed(1)} m (min ${PRACA_LARG}) · centro (${praca.cx.toFixed(1)},${praca.cz.toFixed(1)}) a ${Math.hypot(praca.cx, praca.cz).toFixed(1)} m do meio (max ${PRACA_RAIO})`
    : 'nenhuma sala larga no miolo'],
  ['LV4', 'a praça tem cover (não é corredor morto)', lv4,
    `${covers.length} peças (min ${PRACA_COVER}) · espaçamento ${espacCover === Infinity ? '∞' : espacCover.toFixed(1)} m (max ${QUAD_ESPAC})`],
  ['LV6', 'toda aresta de térreo é andável de ponta a ponta', lv6,
    `${arestasTerreo} arestas de térreo · ${arestasRuins.length} atravessam sólido${arestasRuins.length ? `: ${arestasRuins.slice(0, 6).join(' · ')}` : ''}`],
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
