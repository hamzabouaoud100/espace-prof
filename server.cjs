const http = require("node:http"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "dist"),
  sessions = new Map(),
  attempts = new Map(),
  ttl = 8 * 60 * 60 * 1000;
const localAuthPath = path.join(__dirname, ".local-auth.json");
const localAuth =
  process.env.NODE_ENV !== "production" &&
  require("node:fs").existsSync(localAuthPath)
    ? JSON.parse(require("node:fs").readFileSync(localAuthPath, "utf8"))
    : null;
const username = process.env.TEACHER_USERNAME || localAuth?.username;
const salt = process.env.TEACHER_PASSWORD
  ? crypto.randomBytes(16).toString("hex")
  : localAuth?.salt;
const hash = process.env.TEACHER_PASSWORD
  ? crypto.scryptSync(process.env.TEACHER_PASSWORD, salt, 64)
  : localAuth?.hash
    ? Buffer.from(localAuth.hash, "hex")
    : null;
if (!username || !salt || !hash)
  throw new Error(
    "Set TEACHER_USERNAME and TEACHER_PASSWORD before starting the server.",
  );
function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(body);
}
async function body(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 4096) throw Error("Body too large");
  }
  return JSON.parse(data);
}
function token(req) {
  return (req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("prof_session="))
    ?.slice(13);
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"),
      sessionToken = token(req),
      expires = sessions.get(sessionToken),
      logged = expires > Date.now();
    if (expires && !logged) sessions.delete(sessionToken);
    if (req.method === "POST") {
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}` &&
        req.headers.origin !== `https://${req.headers.host}`
      )
        return send(res, 403, "Forbidden");
      if (url.pathname === "/api/login") {
        const ip = req.socket.remoteAddress,
          now = Date.now();
        let attempt = attempts.get(ip);
        if (!attempt || now > attempt.until) {
          attempt = { count: 0, until: now + 15 * 60 * 1000 };
          attempts.set(ip, attempt);
        }
        if (attempt.count >= 10)
          return send(
            res,
            429,
            JSON.stringify({
              error: "Too many attempts. Try again in 15 minutes.",
            }),
            { "Content-Type": "application/json" },
          );
        const input = await body(req);
        attempt.count++;
        const candidate = await new Promise((resolve, reject) =>
          crypto.scrypt(String(input.password || ""), salt, 64, (e, v) =>
            e ? reject(e) : resolve(v),
          ),
        );
        if (
          input.username !== username ||
          !crypto.timingSafeEqual(candidate, hash)
        )
          return send(
            res,
            401,
            JSON.stringify({
              error:
                "اسم المستخدم أو كلمة المرور غير صحيحة / Identifiants incorrects",
            }),
            { "Content-Type": "application/json" },
          );
        attempts.delete(ip);
        const id = crypto.randomBytes(32).toString("hex");
        sessions.set(id, now + ttl);
        return send(res, 200, "{}", {
          "Content-Type": "application/json",
          "Set-Cookie": `prof_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ttl / 1000}${process.env.COOKIE_SECURE === "1" ? "; Secure" : ""}`,
        });
      }
      if (url.pathname === "/api/logout") {
        sessions.delete(sessionToken);
        return send(res, 200, "{}", {
          "Set-Cookie":
            "prof_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        });
      }
    }
    if (req.method !== "GET" && req.method !== "HEAD")
      return send(res, 405, "Method not allowed");
    const publicPaths = ["/login.html", "/login.js", "/style.css"];
    if (!logged && !publicPaths.includes(url.pathname))
      return send(res, 302, "", { Location: "/login.html" });
    if (logged && url.pathname === "/login.html")
      return send(res, 302, "", { Location: "/" });
    const requested =
      url.pathname === "/"
        ? "dashboard.html"
        : decodeURIComponent(url.pathname.slice(1));
    const target = path.resolve(root, requested);
    if (!target.startsWith(root + path.sep)) return send(res, 403, "Forbidden");
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
    };
    const content = await fs.readFile(target);
    send(res, 200, req.method === "HEAD" ? "" : content, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
    });
  } catch (e) {
    send(res, e.code === "ENOENT" ? 404 : 400, "Request failed");
  }
});
if (require.main === module)
  server.listen(
    Number(process.env.PORT || 4173),
    process.env.HOST || "127.0.0.1",
    () =>
      console.log(
        `Espace Prof: http://localhost:${server.address().port}/login.html`,
      ),
  );
module.exports = server;
