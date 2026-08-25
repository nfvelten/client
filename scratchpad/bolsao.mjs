import { THREE, bootGame, initTextures } from '../tools/eval/harness.mjs';
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 1 });
const W = g.world; const p = new THREE.Vector3();
const livre=(x,z)=>{ if(W.groundHeightAt(x,z,0)>0.55) return false; p.set(x,0,z); g._collide(p,0.38);
  return Math.abs(p.x-x)<1e-3&&Math.abs(p.z-z)<1e-3; };
for (const [cx,cz] of [[-3.4,20.9],[7.1,7.9],[-6.9,-2.9]]) {
  console.log(`\n=== bolsão (${cx},${cz}) ===`);
  for (let z=cz-3; z<=cz+3.01; z+=0.5) {
    let row = z.toFixed(1).padStart(6);
    for (let x=cx-4; x<=cx+4.01; x+=0.5) row += livre(x,z)?'.':'#';
    console.log(row + (Math.abs(z-cz)<0.26?'  <':''));
  }
  const hits = W.colliders.filter(c=>cx>c.minX-1&&cx<c.maxX+1&&cz>c.minZ-1&&cz<c.maxZ+1&&c.minY<1.5);
  for (const c of hits.slice(0,5)) console.log(`   colisor x[${c.minX.toFixed(2)},${c.maxX.toFixed(2)}] z[${c.minZ.toFixed(2)},${c.maxZ.toFixed(2)}] y[${c.minY.toFixed(1)},${c.maxY.toFixed(1)}]`);
}
