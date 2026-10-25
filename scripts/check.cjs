const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const postcss = require("postcss");

const assetDirectory = "dist";
for (const filename of fs.readdirSync(assetDirectory)) {
  const target = path.join(assetDirectory, filename);
  if (filename.endsWith(".js"))
    execFileSync(process.execPath, ["--check", target]);
  if (filename.endsWith(".css"))
    postcss.parse(fs.readFileSync(target, "utf8"), { from: target });
  if (filename.endsWith(".html")) {
    const html = fs.readFileSync(target, "utf8");
    for (const [, reference] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^(https?:|\/|#)/.test(reference)) continue;
      const localPath = path.resolve(assetDirectory, reference.split("?")[0]);
      if (!fs.existsSync(localPath))
        throw Error(`Missing asset in ${filename}: ${reference}`);
    }
  }
}
execFileSync(process.execPath, ["--check", "server.cjs"]);
console.log(
  "JavaScript syntax, CSS syntax, and local HTML asset references passed.",
);
