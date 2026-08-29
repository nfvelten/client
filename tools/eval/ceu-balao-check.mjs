/* RÉGUA DO PADRE NO BALÃO — o prop de céu está NA CENA, e não só no registro.

   Comprada em 28/08/2026: "coloque o santos dumont voando no ceu" / "queria colocar
   também o padre voando no balão... em todos os mapas que tem ceu azul".

   Por que ela existe, e por que não confia em declaração: o BUG-79 (27/08) foi exatamente
   isto num vizinho — o `corrego-contract-check` cobrava que a grama estivesse RESERVADA
   (26 spots) e passava verde com 0 grama SERVIDA na cena. Régua de céu que só lê a
   configuração do mapa repetiria o mesmo furo. Aqui o que se mede é o objeto montado.

   CLÁUSULAS
     BAL1  todo mapa de CÉU AZUL tem exatamente 1 balão MONTADO na cena (não na config)
     BAL2  nenhum mapa de céu não-azul tem balão — o prop é editorial, não decoração solta
     BAL3  o balão se MOVE: deriva >= DERIVA_MIN entre dois instantes distantes. Prop de
           céu parado lê como maquete pendurada, e foi assim que a arara nasceu errada
     BAL4  o balão fica ACIMA do teto de tiro do mapa: nada de padre no meio do combate
     BAL5  o balão não é colisor e não entra na conta de occluder

   USO
     node tools/eval/ceu-balao-check.mjs
     node tools/eval/ceu-balao-check.mjs --mutante=<nome>

   MUTANTES (lei 2)
     sem-balao     tira o balão dos mapas azuis          -> BAL1
     balao-solto   põe balão em mapa de céu laranja      -> BAL2
     balao-parado  zera a velocidade de deriva           -> BAL3
     balao-baixo   desce o balão para a altura do jogo   -> BAL4
     sem-demo      tira o Demoiselle dos mapas azuis      -> BAL6

   Sai 1 se qualquer cláusula reprovar, ou se um mutante não acender a dele. */
import { MAPS, initTextures, bootGame } from './harness.mjs';

const args = process.argv.slice(2);
const MUT = (args.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'sem-balao': 'BAL1', 'balao-solto': 'BAL2', 'balao-parado': 'BAL3', 'balao-baixo': 'BAL4', 'sem-demo': 'BAL6' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* Os mapas de céu AZUL, medidos e não opinados: `scene.background` é textura de céu de dia
   (os seis primeiros) ou cor clara de dia (parque #75cef2, atacadão #dfe6ec). Ficam de
   fora, também por medição, posto_treta #f1b063, upa_24h #14181c, obras #c7bfa8,
   velho_oeste #d88b55 e penitenciaria #a8b5b7 — poente, noite e cinza. */
const CEU_AZUL = new Set(['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho', 'quebrada', 'corrego', 'parque_treta', 'atacadao_treta']);
const DERIVA_MIN = 12;     // metros entre t=3 s e t=45 s; abaixo disso lê como parado
const ALTURA_MIN = 34;     // acima do telhado mais alto do acervo (lajes ~11 m) com folga

const falhas = [];
const infos = [];
const textures = initTextures();

for (const id of Object.keys(MAPS)) {
  let g;
  try { g = bootGame(id, { textures, ctf: false, seed: 1 }); } catch (e) { falhas.push(`BAL0 ${id} não sobe: ${e.message}`); continue; }
  const sl = g.world.skyLife;
  if (sl) await sl.ready;
  let baloes = sl ? sl.items.filter((i) => i.tipo === 'balao') : [];
  let demos = sl ? sl.items.filter((i) => i.tipo === 'demoiselle') : [];
  if (MUT === 'sem-demo' && CEU_AZUL.has(id)) demos = [];
  if (MUT === 'sem-balao' && CEU_AZUL.has(id)) baloes = [];
  if (MUT === 'balao-solto' && id === 'velho_oeste') baloes = [{ root: { position: { y: 50, clone: () => ({ distanceTo: () => 99 }) } } }];
  const azul = CEU_AZUL.has(id);

  if (azul && baloes.length !== 1) {
    falhas.push(`BAL1 ${id} tem céu azul e ${baloes.length} balão(ões) montado(s) na cena — esperado 1`);
  }
  if (!azul && baloes.length) {
    falhas.push(`BAL2 ${id} não tem céu azul e ganhou ${baloes.length} balão(ões)`);
  }
  /* BAL6: os dois props de céu andam juntos. Se um entra e o outro não, alguém mexeu em
     sete mapas e esqueceu um — e é justamente o que ninguém percebe olhando um mapa só. */
  if (MUT !== 'sem-balao' && MUT !== 'balao-solto') {
    const esperado = azul ? 1 : 0;
    if (demos.length !== esperado) falhas.push(`BAL6 ${id}: ${demos.length} demoiselle(s), esperado ${esperado} (o balão tem ${baloes.length})`);
  }
  if (azul && baloes.length === 1 && MUT !== 'balao-solto') {
    const b = baloes[0];
    if (MUT === 'balao-parado') b.speed = 0;
    if (MUT === 'balao-baixo') b.center.y = 8;
    g.world.update?.(0.016, 3);
    const p1 = b.root.position.clone();
    const y1 = b.root.position.y;
    g.world.update?.(0.016, 45);
    const deriva = p1.distanceTo(b.root.position);
    const yMin = Math.min(y1, b.root.position.y);
    infos.push(`  ${id.padEnd(17)} balão y=${yMin.toFixed(0)} m deriva ${deriva.toFixed(0)} m · demoiselle ${demos.length ? 'ok' : 'AUSENTE'} · ${b.usouGlb ? 'GLB' : 'proxy'}`);
    if (deriva < DERIVA_MIN) falhas.push(`BAL3 ${id}: o balão derivou ${deriva.toFixed(1)} m entre t=3 s e t=45 s (mínimo ${DERIVA_MIN}) — prop de céu parado lê como maquete`);
    if (yMin < ALTURA_MIN) falhas.push(`BAL4 ${id}: o balão desce a ${yMin.toFixed(1)} m (mínimo ${ALTURA_MIN}) — entra na altura do combate`);
    /* BAL5: o grupo do balão não pode ter virado colisor nem occluder. `marcarCeu` existe
       para isto; sem a cláusula, um refactor silencioso põe o padre na frente da bala. */
    const nome = b.root.name || '';
    const ocl = (g.world.occluders || []).some((o) => o === b.root || (o.name && o.name === nome));
    const col = (g.world.colliders || []).some((c) => c.minY > ALTURA_MIN - 1);
    if (ocl) falhas.push(`BAL5 ${id}: o balão entrou na lista de occluders — a bala passa a parar nele`);
    if (col) falhas.push(`BAL5 ${id}: há colisor acima de ${ALTURA_MIN - 1} m, na faixa do balão`);
  }
  try { g.dispose(); } catch { /* harness sem renderer */ }
}

for (const i of infos) console.log(i);
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m BALÃO ${CEU_AZUL.size} mapas de céu azul com o padre montado, derivando e fora do alcance do jogo`);
if (MUT && !falhas.some((f) => f.startsWith(MUTANTES[MUT]))) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu a cláusula ${MUTANTES[MUT]} — portão cego (lei 2)`);
  process.exit(1);
}
process.exit(falhas.length ? 1 : 0);
