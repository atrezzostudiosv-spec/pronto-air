#!/usr/bin/env node
'use strict';
/* Generate visually faithful WebP derivatives for the approved Home pictures.
 * This script never rewrites source assets, avoids changing the approved crop,
 * and rejects variants that do not save bytes at a safe image-fidelity threshold.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname,'..','images');
const photos = [
  {src:'pronto-home-family-team-840.webp',dest:'pronto-home-family-team-840-optimized.webp',width:null,minSavings:0.20},
  {src:'home-service-cooling.webp',dest:'home-service-cooling-640.webp',width:640,minSavings:0.20}
];
const qList = [86,83,80,78,76,74,72,70,68];
function psnr(bufferA,bufferB) {
 let sum=0;
 for(let i=0;i<bufferA.length;i++){const d=bufferA[i]-bufferB[i];sum+=d*d;}
 const mse=sum/bufferA.length;
 return mse?10*Math.log10(255*255/mse):Infinity;
}
(async()=>{
 const manifest=[];
 for(const {src,dest,width,minSavings} of photos){
  const inFile=path.join(root,src),outFile=path.join(root,dest);
  const bytes=fs.readFileSync(inFile),meta=await sharp(bytes).metadata();
  const outW=width||meta.width;
  const outH=Math.round(meta.height*outW/meta.width);
  const originalReference=await sharp(bytes)
    .resize(outW,outH,{fit:'fill',kernel:'lanczos3'})
    .removeAlpha().raw().toBuffer();
  let pick=null;
  for(const quality of qList){
    const encoded=await sharp(bytes)
      .resize(outW,outH,{fit:'fill',kernel:'lanczos3'})
      .webp({quality,effort:6}).toBuffer();
    const decoded=await sharp(encoded).removeAlpha().raw().toBuffer();
    const db=psnr(originalReference,decoded);
    const saving=(bytes.length-encoded.length)/bytes.length;
    if(db>=34 && saving>=minSavings) {
      pick={encoded,quality,psnr:+db.toFixed(2),saving:+(100*saving).toFixed(1)};
      // Prefer highest image quality that reaches meaningful byte savings.
      break;
    }
  }
  if(!pick) throw new Error('Cannot preserve quality and reach 20% savings for '+src);
  fs.writeFileSync(outFile,pick.encoded);
  const record={src,dest,originalBytes:bytes.length,optimizedBytes:pick.encoded.length,
   width:outW,height:outH,quality:pick.quality,psnrDb:pick.psnr,savingsPct:pick.saving};
  console.log('OPTIMIZED_IMAGE '+JSON.stringify(record));manifest.push(record);
 }
 fs.writeFileSync(path.join(process.cwd(),'home-image-optimization.json'),JSON.stringify(manifest,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
