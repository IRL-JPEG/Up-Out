const { build } = require("esbuild");
const fs = require("node:fs");
(async () => {
  await build({ entryPoints: ["scripts/providers-entry.js"], outfile: "public/vendor/providers.js", bundle: true, format: "esm", platform: "browser", target: "es2022", external: ["./wasm/reactor_wasm.js"], minify: true });
  fs.cpSync("node_modules/@reactor-team/js-sdk/dist/wasm", "public/vendor/wasm", { recursive: true });
  console.log("Browser providers and Reactor WASM built locally.");
})().catch(error => { console.error(error); process.exitCode = 1; });
