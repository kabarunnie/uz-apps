const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const P = require("../site/shared/pray.js");
const D = p => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "site", "data", p), "utf8"));
test("prayer times are ordered and plausible for every city, every month", () => {
  for (const c of D("cities.json")) for (let m = 1; m <= 12; m++) {
    const t = P.compute({ y: 2026, m, d: 15, lat: c.lat, lon: c.lon, elv: c.elv, tz: 5 });
    const v = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(k => { const [h, mi] = t[k].split(":"); return +h * 60 + +mi; });
    for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1], `${c.id} m${m} ${JSON.stringify(t)}`);
    assert.ok(v[2] > 11 * 60 + 30 && v[2] < 13 * 60 + 30, "dhuhr near local noon");
  }
});
test("Tashkent 23 Nov 2026 sunrise/sunset close to astronomical tables (±3 min)", () => {
  const t = P.compute({ y: 2026, m: 11, d: 23, lat: 41.3111, lon: 69.2797, elv: 455, tz: 5 });
  const mins = s => +s.slice(0, 2) * 60 + +s.slice(3);
  assert.ok(Math.abs(mins(t.sunrise) - mins("07:16")) <= 3, t.sunrise);
  assert.ok(Math.abs(mins(t.maghrib) - mins("17:02")) <= 3, t.maghrib);
});
test("rates come from CBU file with a date, no invented numbers", () => {
  const r = D("rates.json");
  assert.match(r.date, /^\d\d\.\d\d\.\d{4}$/);
  assert.match(r.source, /Markaziy bank/);
  const usd = r.rates.find(x => x.ccy === "USD");
  assert.ok(usd.rate > 1000 && usd.rate < 100000);
});
test("weather cache has all cities with daily rows", () => {
  const w = D("weather.json"), cities = D("cities.json");
  for (const c of cities.filter(c => c.weather !== false)) assert.ok(w.cities[c.id] && w.cities[c.id].daily.length >= 5, c.id);
  assert.match(w.source, /MET Norway/);
});
test("ads off until configured", () => {
  assert.deepStrictEqual(D("ads.json").blockIds, { banner: "", interstitial: "", rewarded: "" });
});
