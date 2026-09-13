import { build } from "esbuild";
await build({
  entryPoints: ["client/workspace.js"],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  outfile: "dist/workspace.js",
});
console.log("Built the agent workspace.");
await build({entryPoints:['lib/pipeline.mjs'],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:'supabase/functions/job-worker/pipeline.js'});
