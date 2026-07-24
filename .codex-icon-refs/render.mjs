import sharp from "sharp";
const base = "C:/Users/Admin/Desktop/Projects/vps-travel-plan/.codex-icon-refs";
const names = ["car","bus","subway","taxi","train","tram","van"];
const layers = [];
for (let i = 0; i < names.length; i += 1) {
  const input = await sharp(`${base}/${names[i]}.png`).resize(84,84,{fit:"contain",background:"white"}).flatten({background:"white"}).png().toBuffer();
  layers.push({input,left:i*100+8,top:4});
}
const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="112">${names.map((name,index)=>`<text x="${index*100+50}" y="106" text-anchor="middle" font-family="Arial" font-size="12" fill="#303030">${name}</text>`).join("")}</svg>`);
const output = await sharp({create:{width:700,height:112,channels:4,background:"white"}}).composite([...layers,{input:labels,left:0,top:0}]).png({compressionLevel:9,palette:true}).toBuffer();
console.log(output.toString("base64"));