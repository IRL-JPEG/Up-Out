const fs = require("node:fs"), { execFileSync } = require("node:child_process");
for (const dir of ["server", "public/js", "scripts"]) for (const name of fs.readdirSync(dir)) if (name.endsWith(".js")) execFileSync(process.execPath, ["--check", `${dir}/${name}`]);
let pending=0;
const allowPending=process.argv.includes("--allow-pending-images");
const { floors, clipPlan } = require("../public/js/floors");
for (const floor of Object.values(floors)) {
  for (const ref of floor.references) {
    if(allowPending && !fs.existsSync(`public${ref}`)){pending++;continue;}
    const bytes = fs.readFileSync(`public${ref}`);
    if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`${ref} is not a PNG image`);
    const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
    if (Math.abs(w / h - 9 / 16) > 0.003) throw new Error(`${ref} is not a 9:16 portrait image (${w}x${h})`);
  }
  for (const beat of ["tour", "instruction", "ask", "reunion"]) if (clipPlan(floor, beat).prompt.length > 12000) throw new Error("H3 prompt too long");
  if (!floor.validationPrompt.includes(floor.quest.task)) throw new Error("Quest rubric does not match request");
}
console.log(`Syntax, available portrait references, prompt budgets and paired quest rubrics checked.${pending ? ` ${pending} images still pending.` : " All room images are present."}`);
