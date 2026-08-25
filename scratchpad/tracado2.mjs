import { bootGame, initTextures } from '../tools/eval/harness.mjs';
import { caminhoBloqueado } from '../tools/eval/rotas-separadas.mjs';
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 1 });
const W = g.world, nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const bloq = new Uint8Array(nodes.length);
for (let i=0;i<nodes.length;i++) if (nodes[i].y>=1.6 && Math.abs(nodes[i].z)<=13) bloq[i]=1;
for (const [nome, sx,sz, fx,fz] of [['B->R',0,32.3,-10.2,-23.5],['E->B',0,-32.3,10.2,15.5]]) {
  const cam = caminhoBloqueado(nodes,adj,W.nearestWaypoint(sx,sz),W.nearestWaypoint(fx,fz),bloq);
  let L=0; const marcos=[];
  for(let i=1;i<cam.length;i++){const a=nodes[cam[i-1]],b=nodes[cam[i]];L+=Math.hypot(b.x-a.x,b.z-a.z);}
  for(let i=0;i<cam.length;i+=Math.ceil(cam.length/16)) {const n=nodes[cam[i]];marcos.push(`(${n.x.toFixed(0)},${n.z.toFixed(0)},y${n.y.toFixed(1)})`);}
  console.log(`${nome}: ${L.toFixed(0)}m — ${marcos.join(' ')}`);
}
