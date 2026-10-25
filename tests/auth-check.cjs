const assert = require("node:assert/strict"),
  server = require("../server.cjs");
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let r = await fetch(base + "/", { redirect: "manual" });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "/login.html");
    r = await fetch(base + "/app.js", { redirect: "manual" });
    assert.equal(r.status, 302);
    r = await fetch(base + "/login.html");
    assert.equal(r.status, 200);
    r = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "mbouaoud", password: "incorrect" }),
    });
    assert.equal(r.status, 401);
    r = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "mbouaoud",
        password: process.env.TEST_PASSWORD,
      }),
    });
    assert.equal(r.status, 200);
    const cookie = r.headers.get("set-cookie").split(";")[0];
    assert(r.headers.get("set-cookie").includes("HttpOnly"));
    r = await fetch(base + "/", { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert((await r.text()).includes("ESPACE PROF"));
    r = await fetch(base + "/api/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(r.status, 200);
    r = await fetch(base + "/", {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    assert.equal(r.status, 302);
    console.log(
      "Passed: protected dashboard/assets, login page, incorrect/correct credentials, session cookie and logout.",
    );
  } finally {
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
