// Run after NEXT_PUBLIC_ALLOW_INDEXING=true npm run build; rebuild default afterwards.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";

test("production indexing opt-in permits home/credits while style guide remains excluded", async () => {
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3201"], { env: { ...process.env, NEXT_PUBLIC_ALLOW_INDEXING: "true", NEXT_TELEMETRY_DISABLED: "1" } });
  let log = "";
  server.stdout.on("data", (chunk) => { log += chunk; }); server.stderr.on("data", (chunk) => { log += chunk; });
  const base = "http://127.0.0.1:3201";
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(log);
      try { ready = (await fetch(base)).ok; } catch { /* Starting. */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, log);
    for (const path of ["/", "/credits"]) {
      const response = await fetch(base + path); const html = await response.text();
      assert.match(html, /name="robots" content="index, follow"/);
      assert.equal(response.headers.get("x-robots-tag"), null);
    }
    const guide = await fetch(base + "/style-guide");
    assert.match(await guide.text(), /name="robots" content="noindex, nofollow"/);
    assert.equal(guide.headers.get("x-robots-tag"), "noindex, nofollow");
    const robots = await (await fetch(base + "/robots.txt")).text();
    assert.match(robots, /Allow: \/\s/); assert.match(robots, /Disallow: \/style-guide/);
    const sitemap = await (await fetch(base + "/sitemap.xml")).text();
    assert.equal((sitemap.match(/<loc>/g) || []).length, 2);
    assert.match(sitemap, /\/credits<\/loc>/); assert.doesNotMatch(sitemap, /style-guide/);
  } finally { server.kill("SIGTERM"); }
});
