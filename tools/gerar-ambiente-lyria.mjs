#!/usr/bin/env node
/* LOOPS DE AMBIENTE por IA (Lyria 3 no OpenRouter) — som que sai de uma CAIXA dentro do
   mapa, não trilha de menu.

   Irmão do `gerar-vinhetas-lyria.mjs` (que faz vinheta de round). A diferença não é
   cosmética: vinheta é evento e toca alto por 3 s; loop de ambiente toca por minutos, de
   um emissor posicional, atrás do tiro. Então o prompt pede mixagem seca, sem clímax e
   sem silêncio no fim — emenda que não se percebe.

   Por que gerado e não sample: decisão do dono em 20/08, "áudio é troca TOTAL". Sample
   pirata morre no Content ID e mata o clipe viral, e portal/Steam exige direitos.

   USO
     OPENROUTER_API_KEY=... node tools/gerar-ambiente-lyria.mjs
     node tools/gerar-ambiente-lyria.mjs --dry
     node tools/gerar-ambiente-lyria.mjs --so=forro-pisadinha
     node tools/gerar-ambiente-lyria.mjs --model=google/lyria-3-pro-preview  */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ambiente';
const CLIP = 'google/lyria-3-clip-preview';

const LOTE = [
  {
    id: 'forro-pisadinha',
    style: 'forró pisadinha, arrasta-pé nordestino moderno, zabumba and triangle groove, '
      + 'accordion riff repeating, electronic bass drum layered under the zabumba, simple '
      + 'two chord vamp with no resolution, dry close mixed, sounds like a cheap loudspeaker '
      + 'on a street corner, no intro, no ending, no build up, steady from the first bar, '
      + '104 BPM. Instrumental, no vocals, no crowd noise.',
  },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const model = (args.find((a) => a.startsWith('--model=')) || `--model=${CLIP}`).split('=')[1];
const so = (args.find((a) => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = LOTE.filter((p) => !so.length || so.includes(p.id));

if (dry) {
  console.log(`${lote.length} loop(s) → ${OUT}/ (modelo ${model})`);
  for (const p of lote) console.log(`  ${p.id}: ${p.style.slice(0, 90)}…`);
  process.exit(0);
}

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) { console.error('OPENROUTER_API_KEY ausente no ambiente.'); process.exit(1); }

/* Assinatura de container pelos magic bytes, igual ao irmão: o modelo às vezes devolve wav
   e às vezes mp3, e gravar com a extensão errada faz o Audio falhar EM SILÊNCIO. */
const EXT = [[0x52, 0x49, 0x46, 0x46, '.wav'], [0x49, 0x44, 0x33, null, '.mp3'], [0xff, 0xfb, null, null, '.mp3'], [0x4f, 0x67, 0x67, 0x53, '.ogg'], [0x66, 0x4c, 0x61, 0x43, '.flac']];
const extDe = (buf) => (EXT.find(([a, b, c, d]) => buf[0] === a && (b === null || buf[1] === b) && (c === null || buf[2] === c) && (d === null || buf[3] === d)) || [])[4] || '.bin';

await mkdir(OUT, { recursive: true });
let ok = 0, erro = 0;
for (const p of lote) {
  process.stdout.write(`${p.id}… `);
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      modalities: ['text', 'audio'],
      audio: { format: 'wav' },
      messages: [{ role: 'user', content: `Generate a seamless looping background music bed for a video game street scene: ${p.style}` }],
    }),
  });
  if (!res.ok) { erro++; console.error(`✗ HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`); continue; }
  const sse = await res.text();
  let b64 = '';
  for (const linha of sse.split('\n')) {
    if (!linha.startsWith('data: ') || linha === 'data: [DONE]') continue;
    try { b64 += JSON.parse(linha.slice(6)).choices?.[0]?.delta?.audio?.data || ''; } catch { /* chunk parcial */ }
  }
  if (!b64) { erro++; console.error(`✗ sem áudio no stream (${sse.length} bytes SSE)`); continue; }
  const buf = Buffer.from(b64, 'base64');
  const nome = `${p.id}${extDe(buf)}`;
  await writeFile(join(OUT, nome), buf);
  ok++;
  console.log(`✓ ${nome} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log(`\n${ok} gerado(s), ${erro} erro(s) → ${OUT}/`);
process.exit(erro ? 1 : 0);
