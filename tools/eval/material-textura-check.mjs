/* RÉGUA MAT-TEX — o que entra num slot de textura É uma textura.

   Comprada em 29/08/2026, e cara: `map_corrego.js` passou `TEX.wall` (que é um
   MATERIAL, montado em `lam({...})`) para o slot `map:` de outro material. O three
   aceitou calado na montagem e só quebrou no primeiro quadro, dentro do shader:

     ERROR: 0:396: 'uvundefined' : undeclared identifier
     TypeError: Cannot read properties of undefined (reading 'elements')
       at Matrix3.copy → refreshTransformUniform

   O jogo virou a tela "A ARENA NÃO ABRIU" no preview. E o que dói: `check:deploy` deu
   **35/35** e o `smoke` do CI passou VERDE, porque nenhum dos dois abre o córrego — o
   smoke carrega o menu e a rota padrão. Régua que não visita o mapa não mede o mapa.

   Esta cláusula é de node puro e roda os 13 mapas, então cabe no check:fast: monta cada
   mapa pelo harness e varre `scene.traverse` cobrando que todo slot de textura de todo
   material seja um `THREE.Texture` de verdade. Não precisa de browser porque o erro nasce
   na MONTAGEM — o shader só é onde ele aparece.

   CLÁUSULA
     MATTEX1  todo slot de textura (map, normalMap, roughnessMap, metalnessMap, aoMap,
              emissiveMap, bumpMap, alphaMap, displacementMap, envMap, lightMap,
              specularMap) contém `isTexture` ou nada. Material, string, número ou
              objeto solto reprovam.

   USO
     node tools/eval/material-textura-check.mjs
     node tools/eval/material-textura-check.mjs --mutante=material-no-map

   MUTANTE (lei 2)
     material-no-map   põe um MeshLambertMaterial no slot `map` do primeiro material do
                       córrego — reproduz exatamente o defeito de 29/08.

   Sai 1 se qualquer cláusula reprovar, ou se o mutante não morder. */
import * as THREE from '../../public/vendor/three.module.js';
import { MAPS, initTextures, bootGame } from './harness.mjs';

const args = process.argv.slice(2);
const MUT = (args.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'material-no-map': 'MATTEX1' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap',
  'bumpMap', 'alphaMap', 'displacementMap', 'envMap', 'lightMap', 'specularMap'];

const falhas = [];
const textures = initTextures();
let materiais = 0;

for (const id of Object.keys(MAPS)) {
  let g;
  try { g = bootGame(id, { textures, ctf: false, seed: 1 }); } catch (e) { falhas.push(`MATTEX0 ${id} não sobe: ${e.message}`); continue; }
  const vistos = new Set();
  let mutado = false;
  g.scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      if (!m || vistos.has(m.uuid)) continue;
      vistos.add(m.uuid);
      /* o mutante entra AQUI, no primeiro material do córrego, e não no map_corrego.js:
         a régua tem de morder o defeito venha ele de onde vier. */
      if (MUT === 'material-no-map' && id === 'corrego' && !mutado) {
        m.map = new THREE.MeshLambertMaterial({ color: 0xffffff });
        mutado = true;
      }
      materiais++;
      for (const slot of SLOTS) {
        const v = m[slot];
        if (v === null || v === undefined) continue;
        if (v.isTexture) continue;
        const oque = v.isMaterial ? `um MATERIAL (${v.type})` : `${typeof v} (${v.constructor?.name || '?'})`;
        falhas.push(`MATTEX1 ${id}: material "${m.name || m.type}" tem ${oque} no slot \`${slot}\` — o three lê .matrix disso no 1º quadro e a arena não abre`);
      }
    }
  });
  try { g.dispose(); } catch { /* harness sem renderer */ }
}

console.log(`  ${materiais} materiais varridos em ${Object.keys(MAPS).length} mapas, ${SLOTS.length} slots cada`);
for (const f of [...new Set(falhas)]) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m MATTEX todo slot de textura contém textura');
if (MUT && !falhas.some((f) => f.startsWith(MUTANTES[MUT]))) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu ${MUTANTES[MUT]} — portão cego (lei 2)`);
  process.exit(1);
}
process.exit(falhas.length ? 1 : 0);
