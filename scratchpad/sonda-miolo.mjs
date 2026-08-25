import { THREE, bootGame, initTextures } from '../tools/eval/harness.mjs';
const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 1 });
const W = game.world; const p = new THREE.Vector3();
const livre = (x,z) => { if (W.groundHeightAt(x,z,0) > .55) return false; p.set(x,0,z); game._collide(p,.38);
  return Math.abs(p.x-x)<1e-3 && Math.abs(p.z-z)<1e-3; };
console.log('MIOLO x de -9 a 9, z de -14 a 13 (passo 0.5). "." livre  "#" bloqueado');
let head='      '; for (let x=-9;x<=9.01;x+=0.5) head += (Math.abs(x%3)<0.01? (x<0?'-':'+') : ' '); console.log(head);
for (let z=-14; z<=13.01; z+=0.5) {
  let row = String(z.toFixed(1)).padStart(6);
  for (let x=-9; x<=9.01; x+=0.5) row += livre(x,z) ? '.' : '#';
  console.log(row);
}
