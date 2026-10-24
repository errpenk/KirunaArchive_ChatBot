import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { once } from "node:events";
import { test } from "node:test";

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
