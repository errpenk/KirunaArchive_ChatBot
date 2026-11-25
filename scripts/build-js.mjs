import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const sourceRoot = new URL("../src/js/", import.meta.url);
const output = new URL("../public/js/generated/", import.meta.url);
await mkdir(output, { recursive: true });

for (const name of ["archive", "chat", "discourse", "timeline", "outside-map"]) {
  const source = new URL(`${name}/`, sourceRoot);
  const parts = (await readdir(source)).filter(file => /^\d\d-.*\.js$/.test(file)).sort();
  if (!parts.length) throw new Error(`No source parts for ${name}`);
  const code = (await Promise.all(parts.map(file => readFile(new URL(file, source), "utf8")))).join("");
  await writeFile(new URL(`${name}.js`, output), code);
}
