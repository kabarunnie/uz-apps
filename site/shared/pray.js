/* Prayer times — client-side calculation (not an official schedule).
 * Solar-position method as documented at https://praytimes.org/docs/calculation (own implementation).
 * Method used here: Muslim World League angles — Fajr 18°, Isha 17°; Asr Hanafi (shadow factor 2),
 * which is the madhab followed in Uzbekistan. Times rounded to the nearest minute, no extra offsets.
 * The official taqvim of the Muslim Board of Uzbekistan may differ by several minutes.
 */
(function (root) {
  "use strict";
  var D = Math.PI / 180, R = 180 / Math.PI;
  function sin(d) { return Math.sin(d * D); } function cos(d) { return Math.cos(d * D); } function tan(d) { return Math.tan(d * D); }
  function asin(x) { return Math.asin(x) * R; } function acos(x) { return Math.acos(x) * R; } function atan2(y, x) { return Math.atan2(y, x) * R; }
  function acot(x) { return Math.atan(1 / x) * R; }
  function julian(y, m, d) { if (m <= 2) { y -= 1; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
  function sun(jd) {
    var n = jd - 2451545.0, g = 357.529 + 0.98560028 * n, q = 280.459 + 0.98564736 * n;
    var L = q + 1.915 * sin(g) + 0.020 * sin(2 * g), e = 23.439 - 0.00000036 * n;
    var RA = atan2(cos(e) * sin(L), cos(L)) / 15; if (RA < 0) RA += 24;
    var eqt = q / 15 - RA; eqt -= 24 * Math.round(eqt / 24);
    return { decl: asin(sin(e) * sin(L)), eqt: eqt };
  }
  var METHOD = { name: "Muslim World League (Fajr 18°, Isha 17°), Asr Hanafi", fajr: 18, isha: 17, asr: 2 };
  function compute(o) {
    var m = o.method || METHOD;
    var jd = julian(o.y, o.m, o.d) - o.lon / (15 * 24);
    function noon(h) { return 12 - o.lon / 15 - sun(jd + h / 24).eqt + o.tz; }
    function angleTime(a, h, ccw) {
      var s = sun(jd + h / 24);
      var t = acos((-sin(a) - sin(s.decl) * sin(o.lat)) / (cos(s.decl) * cos(o.lat))) / 15;
      return noon(h) + (ccw ? -t : t);
    }
    function asrTime(f, h) { var s = sun(jd + h / 24); return angleTime(-acot(f + tan(Math.abs(o.lat - s.decl))), h, false); }
    var rs = 0.833 + 0.0347 * Math.sqrt(Math.max(o.elv || 0, 0));
    var t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
    for (var i = 0; i < 2; i++) {
      t = { fajr: angleTime(m.fajr, t.fajr, true), sunrise: angleTime(rs, t.sunrise, true), dhuhr: noon(t.dhuhr),
            asr: asrTime(m.asr, t.asr), maghrib: angleTime(rs, t.maghrib, false), isha: angleTime(m.isha, t.isha, false) };
    }
    var out = {};
    Object.keys(t).forEach(function (k) { out[k] = fmt(t[k]); });
    return out;
  }
  function fmt(h) {
    if (!isFinite(h)) return "--:--";
    var tot = Math.round(h * 60); tot = ((tot % 1440) + 1440) % 1440;
    var hh = Math.floor(tot / 60), mm = tot % 60;
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }
  var api = { compute: compute, METHOD: METHOD, fmt: fmt };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.UzPray = api;
})(typeof window !== "undefined" ? window : globalThis);
