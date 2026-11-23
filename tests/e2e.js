const PW = process.env.PW_CORE || "/var/tmp/sand-playwright-runtime/1dbae8a3d26e8a687de05cc0b75c68c3/node_modules/playwright-core";
const { chromium } = require(PW); const path = require("path");
const BASE = process.argv[2] || "http://127.0.0.1:18437/uz-apps/";
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] }); let fails = 0;
  for (const [p, lang] of [["", "uz"], ["namoz/", "uz"], ["ob-havo/", "uz"], ["valyuta/", "uz"], ["valyuta/", "ru"], ["namoz/", "ru"]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
    await ctx.addInitScript(l => localStorage.setItem("uz:lang", JSON.stringify(l)), lang);
    const pg = await ctx.newPage(); const errs = [];
    pg.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); pg.on("pageerror", e => errs.push(String(e)));
    const r = await pg.goto(BASE + p, { waitUntil: "networkidle" }); await pg.waitForSelector("body.ready");
    const name = (p.replace("/", "") || "hub") + "-" + lang;
    await pg.screenshot({ path: path.join(__dirname, "..", "screens", name + ".png"), fullPage: true });
    const ok = r.status() === 200 && !errs.length; if (!ok) fails++;
    console.log(ok ? "PASS" : "FAIL", name, "http=" + r.status(), "consoleErrors=" + errs.length, errs.join(" | "));
    await ctx.close();
  }
  await b.close(); process.exit(fails ? 1 : 0);
})();
