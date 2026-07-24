import sharp from "sharp";
const base = "C:/Users/Admin/Desktop/Projects/vps-travel-plan/.codex-icon-refs";
const names = ["car","bus","subway","taxi","train","tram","van"];
const layers = [];
for (let i = 0; i < names.length; i += 1) {
  const input = await sharp(`${base}/${names[i]}.png`).resize(46,46,{fit:"contain",background:"white"}).flatten({background:"white"}).jpeg({quality:55}).toBuffer();
  layers.push({input,left:i*50+2,top:2});
}
const output = await sharp({create:{width:350,height:50,channels:3,background:"white"}}).composite(layers).jpeg({quality:60,chromaSubsampling:"4:4:4"}).toBuffer();
console.log(output.toString("base64"));