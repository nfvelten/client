import { bootGame, initTextures, THREE } from '../tools/eval/harness.mjs';
import sharp from 'sharp';
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 1 });
const W = g.world, nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const B = W.bounds, S = 12;   // px por metro
const w = Math.ceil((B.maxX-B.minX)*S), h = Math.ceil((B.maxZ-B.minZ)*S);
const px = Buffer.alloc(w*h*3, 24);
const P = new THREE.Vector3();
// fundo: livre = cinza
for (let i=0;i<w;i++) for (let k=0;k<h;k++){
  const x=B.minX+i/S, z=B.minZ+k/S;
  if (W.groundHeightAt(x,z,0)>0.55) continue;
  P.set(x,0,z); g._collide(P,0.38);
  if (Math.abs(P.x-x)<1e-3&&Math.abs(P.z-z)<1e-3){const o=(k*w+i)*3;px[o]=70;px[o+1]=70;px[o+2]=72;}
}
const put=(x,z,r,gg,b)=>{const i=Math.round((x-B.minX)*S),k=Math.round((z-B.minZ)*S);
  if(i<0||i>=w||k<0||k>=h)return; const o=(k*w+i)*3; px[o]=r;px[o+1]=gg;px[o+2]=b;};
// arestas de térreo em verde
for (let a=0;a<nodes.length;a++){ if(nodes[a].y>=1.6) continue;
  for (const b of adj[a]){ if(b<a||nodes[b].y>=1.6) continue;
    const n=Math.ceil(Math.hypot(nodes[b].x-nodes[a].x,nodes[b].z-nodes[a].z)*S);
    for(let s=0;s<=n;s++){const t=s/n; put(nodes[a].x+(nodes[b].x-nodes[a].x)*t, nodes[a].z+(nodes[b].z-nodes[a].z)*t, 60,210,90);} } }
// nós
for (const n of nodes) if (n.y<1.6) for(const [dx,dz] of [[0,0],[1,0],[0,1],[-1,0],[0,-1]]) put(n.x+dx/S,n.z+dz/S,250,220,60);
await sharp(px,{raw:{width:w,height:h,channels:3}}).png().toFile('/tmp/grafo-terreo.png');
console.log('ok',w,h);
