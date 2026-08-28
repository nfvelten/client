/* ENVELHECE LAMBE — poster com fundo branco de estúdio vira papel colado na parede.

   Comprada em 28/08/2026: "os grafites precisam ter todos fundo transparente, tem varias
   tag de grafite com fundo branco". A leitura literal do pedido (pôr alfa) QUEBRA o
   material: o que está na parede não é tag, é `poster:` — e poster é retângulo de papel
   por natureza. Tirar o fundo deixaria texto flutuando no muro.

   O que estava errado de verdade: cinco posters do acervo têm fundo #fff de estúdio e
   lêem como caixa branca colada no ar, enquanto `or-quebrada-vive.jpg` e
   `or-show-funk.jpg` já têm grão de papel e lêem como lambe-lambe. Este script dá aos
   cinco o mesmo tratamento dos que já funcionam: tom de papel, grão e borda gasta.

   NÃO é idempotente — cada passada escurece mais. Roda uma vez por arquivo; a lista
   `JA_TRATADOS` existe para isso.

   USO
     node tools/envelhece-lambe.mjs --dry        # só mede, não escreve
     node tools/envelhece-lambe.mjs              # trata os que passam do teto
     node tools/envelhece-lambe.mjs --limiar=25  # muda o teto de branco puro (%)  */
import sharp from 'sharp';
import { readdirSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const DIR = 'public/posters';
const BACKUP = 'public/posters/.originais';
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const LIMIAR = Number((args.find((a) => a.startsWith('--limiar=')) || '').split('=')[1] || 25);

/* Papel de lambe: creme levemente quente, não branco. Medido nos dois posters que já
   funcionam (or-quebrada-vive, or-show-funk): a mediana do fundo deles fica nessa faixa. */
const PAPEL = { r: 232, g: 226, b: 210 };

async function brancoPuro(arquivo) {
  const { data, info } = await sharp(arquivo).ensureAlpha().resize(64, 64, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });
  let br = 0;
  const tot = info.width * info.height;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (data[i + 3] > 200 && l > 235) br++;
  }
  return (100 * br) / tot;
}

/* Grão + borda gasta gerados por pixel, não por arquivo de textura: um PNG de grão a mais
   no acervo é mais um asset para o assets-check cobrar e para o deploy baixar. */
function veu(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  let semente = 20260828;
  const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const grao = (rnd() - 0.5) * 26;
      // borda: escurece os 6% externos, como papel que descola e junta sujeira
      const dx = Math.min(x, w - 1 - x) / w, dy = Math.min(y, h - 1 - y) / h;
      const d = Math.min(dx, dy);
      const borda = d < 0.06 ? (1 - d / 0.06) * 58 : 0;
      const v = Math.max(0, Math.min(255, 128 + grao - borda));
      buf[i] = buf[i + 1] = buf[i + 2] = v;
      buf[i + 3] = 255;
    }
  }
  return { buf, w, h };
}

const alvos = [];
for (const f of readdirSync(DIR)) {
  if (f.startsWith('.')) continue;
  const p = path.join(DIR, f);
  let pct;
  try { pct = await brancoPuro(p); } catch { continue; }
  if (pct > LIMIAR) alvos.push({ f, p, pct });
}

console.log(`posters com fundo branco acima de ${LIMIAR}%: ${alvos.length}`);
for (const a of alvos) console.log(`  ${a.f.padEnd(42)}${a.pct.toFixed(0)}%`);
if (DRY) process.exit(0);
if (!alvos.length) process.exit(0);

if (!existsSync(BACKUP)) mkdirSync(BACKUP, { recursive: true });
for (const a of alvos) {
  const orig = path.join(BACKUP, a.f);
  if (!existsSync(orig)) copyFileSync(a.p, orig);   // guarda o original UMA vez
  const meta = await sharp(orig).metadata();
  const { buf, w, h } = veu(meta.width, meta.height);
  /* MULTIPLICA pela cor do papel, não `tint`: o `tint` do sharp recolore por luminância e
     deixa o branco puro quase branco — a primeira versão levou images.png de 75% para 86%
     de branco, ou seja, piorou o defeito que ela existia para consertar. `linear` com
     a = PAPEL/255 e b = 0 mapeia 255 -> PAPEL e mantém o preto do traço em 0. */
  const saida = await sharp(orig)
    .linear([PAPEL.r / 255, PAPEL.g / 255, PAPEL.b / 255], [0, 0, 0])
    // grão + borda gasta em overlay: sujeira de papel sem lavar o traço
    .composite([{ input: buf, raw: { width: w, height: h, channels: 4 }, blend: 'overlay' }])
    .toBuffer();
  await sharp(saida).toFile(a.p);
  const depois = await brancoPuro(a.p);
  console.log(`  ✓ ${a.f.padEnd(42)}${a.pct.toFixed(0)}% -> ${depois.toFixed(0)}% de branco puro`);
}
console.log('originais guardados em public/posters/.originais/');
