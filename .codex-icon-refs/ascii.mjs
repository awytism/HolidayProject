import sharp from "sharp";
const base = "C:/Users/Admin/Desktop/Projects/vps-travel-plan/.codex-icon-refs";
for (const name of ["car","bus","subway","taxi","train","tram","van"]) {
  const { data, info } = await sharp(`${base}/${name}.png`).resize(36,24,{fit:"contain",background:"white"}).flatten({background:"white"}).greyscale().raw().toBuffer({resolveWithObject:true});
  console.log(`\n=== ${name.toUpperCase()} ===`);
  for (let y=0;y<info.height;y+=1) {
    let line="";
    for (let x=0;x<info.width;x+=1) { const v=data[y*info.width+x]; line += v<70?"██":v<150?"▓▓":v<220?"░░":"  "; }
    console.log(line.replace(/\s+$/u,""));
  }
}