import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("module URLs round-trip and reject unsupported route values", async()=>{
  const context={URL,URLSearchParams,window:{addEventListener(){}},document:{addEventListener(){}}};
  vm.runInNewContext(await readFile(new URL('../public/js/routes.js',import.meta.url),'utf8'),context);
  const {parse,format}=context.window.KirunaRoutes;
  for(const path of [
    '/', '/map', '/map/event/42?view=calendar&type=urban&details=1',
    '/time/inside/year?year=2014&event=42', '/time/outside/cards?event=4',
    '/gallery/inside/42', '/gallery/outside/4',
    '/discourse/x/posts', '/discourse/x/replies', '/discourse/reddit/posts',
    '/discourse/reddit/replies?compare=keywords', '/chat'
  ])assert.equal(format(parse(new URL(path,'https://archive.test'))),path);
  assert.equal(format(parse(new URL('/map/event/not-a-number?type=invalid&details=oops','https://archive.test'))),'/map');
  assert.equal(format(parse(new URL('/time/inside/cards?year=nope','https://archive.test'))),'/time/inside/overview');
  assert.equal(format(parse(new URL('/discourse','https://archive.test'))),'/discourse/x/posts');
});

test("split archive data is available to chat", async () => {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));

  const server = spawn(process.execPath, ["server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), ARK_API_KEY: "", ARK_MODEL: "", ARK_ENDPOINT_ID: "" },
    stdio: "ignore"
  });

  try {
    let health;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        health = await fetch(`http://127.0.0.1:${port}/api/health`).then((response) => response.json());
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal(health?.ok, true);
    assert.ok(health.archiveChunks >= 100);

    const mapPage = await fetch(`http://127.0.0.1:${port}/map`);
    assert.equal(mapPage.status, 200);
    assert.match(await mapPage.text(), /id="page-archive"/);
    const deepPage=await fetch(`http://127.0.0.1:${port}/map/event/42?details=1`);
    assert.equal(deepPage.status,200);
    assert.match(await deepPage.text(), /<base href="\/">/);

    const response = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "What is Vision 2099?" })
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.sources[0]?.title, "Vision 2099");
    assert.equal(result.sources[0]?.locator?.docIdx, 4);
  } finally {
    server.kill();
  }
});
