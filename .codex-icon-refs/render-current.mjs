import sharp from "sharp";
import { ICON_REGISTRY } from "../src/client/ui/icon-registry.js";
for (const name of ["car","bus","subway","taxi","train","tram","van"]) {
  const svg = ICON_REGISTRY[name].replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" color="#000" ');
  const { data, info } = await sharp(Buffer.from(svg)).resize(36,24,{fit:"contain",background:"white"}).flatten({background:"white"}).greyscale().raw().toBuffer({resolveWithObject:true});
  console.log(`\n=== ${name.toUpperCase()} OUTLINE ===`);
  for (let y=0;y<info.height;y+=1) {
    let line="";
    for (let x=0;x<info.width;x+=1) { const v=data[y*info.width+x]; line += v<80?"██":v<180?"▓▓":v<235?"░░":"  "; }
    console.log(line.replace(/\s+$/u,""));
  }
}