/* Uz apps — hub, prayer times, weather, currency. Uzbek Latin primary, Russian toggle. */
(function () {
  "use strict";
  var tg = window.Telegram && window.Telegram.WebApp;
  var PAGE = document.body.getAttribute("data-page");
  var BASE = document.body.getAttribute("data-base") || "../";
  var $ = function (s) { return document.querySelector(s); };
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var lang = load("uz:lang", null);
  if (!lang) { var lc = ""; try { lc = tg.initDataUnsafe.user.language_code || ""; } catch (e) {} lang = /^ru/.test(lc) ? "ru" : "uz"; }
  var T = function (k) { return (window.UZ_I18N[lang] || {})[k] || k; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function theme() {
    var dark = tg && tg.initData && tg.colorScheme ? tg.colorScheme === "dark" : (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }
  function nowTash() { var d = new Date(Date.now() + 5 * 3600000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), dow: d.getUTCDay() }; }
  function getJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
  function header(title) {
    return (PAGE !== "hub" ? '<a class="back" href="' + BASE + '" aria-label="back">←</a>' : "") + "<h1>" + esc(title) + "</h1>" +
      '<div class="lang"><button data-l="uz" aria-pressed="' + (lang === "uz") + '">UZ</button><button data-l="ru" aria-pressed="' + (lang === "ru") + '">RU</button></div>';
  }
  function bindLang() {
    Array.prototype.forEach.call(document.querySelectorAll(".lang button"), function (b) {
      b.addEventListener("click", function () { lang = b.getAttribute("data-l"); save("uz:lang", lang); render(); });
    });
  }
  var cities = [];
  function cityId() { return load("uz:city", "toshkent"); }
  function citySelect() {
    return '<select id="city" aria-label="' + T("city") + '">' + cities.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === cityId() ? " selected" : "") + ">" + esc(c[lang] || c.uz) + "</option>"; }).join("") + "</select>";
  }
  function bindCity() { var s = $("#city"); if (s) s.addEventListener("change", function () { save("uz:city", s.value); render(); }); }
  function puzzleCard() {
    var href = lang === "ru" ? "https://kabarunnie.github.io/daily-puzzles/ru/" : "https://kabarunnie.github.io/daily-puzzles/uz/";
    return '<a class="card puz" href="' + href + '"><span class="grid"><i class="g"></i><i></i><i class="y"></i><i></i><i class="g"></i><i class="g"></i><i class="g"></i><i class="g"></i><i class="g"></i></span><span><b>' +
      T("puzzle") + '</b><br><span class="sub">' + T("puzzle_d") + "</span></span></a>";
  }
  var timer = null;
  var weatherData = null, ratesData = null;
  function render() {
    clearInterval(timer);
    document.documentElement.lang = lang;
    var main = $("#app");
    if (PAGE === "hub") {
      main.innerHTML = '<div class="top">' + header(T("hub_title")) + '</div><p class="sub">' + T("hub_sub") + '</p><div class="hub">' +
        card("namoz/", "🕌", "#e6f4f1", T("namoz"), T("namoz_d")) + card("ob-havo/", "⛅", "#e8f0fb", T("obhavo"), T("obhavo_d")) +
        card("valyuta/", "💱", "#fbf3e2", T("valyuta"), T("valyuta_d")) + "</div>" + puzzleCard() + foot();
    }
    if (PAGE === "namoz") renderNamoz(main);
    if (PAGE === "ob-havo") renderWeather(main);
    if (PAGE === "valyuta") renderRates(main);
    bindLang(); bindCity();
    if (window.MiniAds) MiniAds.apply(document);
  }
  function card(href, ico, bg, h, p) {
    return '<a class="card" href="' + href + '"><span class="ico" style="background:' + bg + '">' + ico + "</span><span><h2>" + esc(h) + "</h2><p>" + esc(p) + '</p></span><span class="go">›</span></a>';
  }
  function foot() { return '<div class="ad-slot" data-ad-slot="banner" hidden></div><p class="foot">' + T("foot") + "</p>"; }
  /* ---- prayer ---- */
  function renderNamoz(main) {
    var c = cities.filter(function (x) { return x.id === cityId(); })[0] || cities[0];
    var n = nowTash();
    var tt = UzPray.compute({ y: n.y, m: n.m, d: n.d, lat: c.lat, lon: c.lon, elv: c.elv, tz: 5 });
    var keys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    var mins = keys.map(function (k) { var p = tt[k].split(":"); return +p[0] * 60 + +p[1]; });
    var nextI = mins.findIndex(function (m) { return m > n.min; });
    var curI = nextI === -1 ? 5 : nextI - 1;
    var nextLabel, left;
    if (nextI === -1) {
      var tm = new Date(Date.UTC(n.y, n.m - 1, n.d + 1));
      var t2 = UzPray.compute({ y: tm.getUTCFullYear(), m: tm.getUTCMonth() + 1, d: tm.getUTCDate(), lat: c.lat, lon: c.lon, elv: c.elv, tz: 5 });
      var p = t2.fajr.split(":"); left = 1440 - n.min + (+p[0] * 60 + +p[1]); nextLabel = T("fajr") + " · " + t2.fajr;
    } else { left = mins[nextI] - n.min; nextLabel = T(keys[nextI]) + " · " + tt[keys[nextI]]; }
    main.innerHTML = '<div class="top">' + header(T("namoz")) + "</div>" + '<div class="card">' + citySelect() + "</div>" +
      '<div class="card next"><div><span>' + T("next") + "</span><br><b>" + esc(nextLabel) + "</b></div><span>" + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0") + " " + T("in") + "</span></div>" +
      '<div class="card times">' + keys.map(function (k, i) { return '<div class="' + (i === curI && k !== "sunrise" ? "now" : "") + '"><span>' + T(k) + "</span><b>" + tt[k] + "</b></div>"; }).join("") + "</div>" +
      '<p class="sub">' + T("calc_note") + "</p>" + monthTable(c, n) + puzzleCard() + foot();
    timer = setInterval(function () { if (nowTash().min !== n.min) render(); }, 15000);
  }
  function monthTable(c, n) {
    var rows = "";
    for (var i = 0; i < 30; i++) {
      var dt = new Date(Date.UTC(n.y, n.m - 1, n.d + i));
      var x = UzPray.compute({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), lat: c.lat, lon: c.lon, elv: c.elv, tz: 5 });
      rows += "<tr" + (i === 0 ? ' class="today"' : "") + "><td>" + dt.getUTCDate() + "." + String(dt.getUTCMonth() + 1).padStart(2, "0") + "</td><td><b>" + x.fajr + "</b></td><td>" + x.sunrise + "</td><td>" + x.dhuhr + "</td><td>" + x.asr + "</td><td><b>" + x.maghrib + "</b></td><td>" + x.isha + "</td></tr>";
    }
    return '<details class="card month"><summary><b>' + T("month") + '</b></summary><p class="sub">' + T("sahar_note") + '</p><div class="tw"><table><thead><tr><th>' + T("date") + "</th><th>" + T("sahar") + "</th><th>" + T("sunrise") + "</th><th>" + T("dhuhr") + "</th><th>" + T("asr") + "</th><th>" + T("iftor") + "</th><th>" + T("isha") + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></details>";
  }
  /* ---- weather ---- */
  var EMO = [[/thunder/, "⛈️"], [/snow|sleet/, "🌨️"], [/rain|shower/, "🌧️"], [/fog/, "🌫️"], [/partlycloudy/, "⛅"], [/fair/, "🌤️"], [/clearsky/, "☀️"], [/cloudy/, "☁️"]];
  function emo(sym) { for (var i = 0; i < EMO.length; i++) if (EMO[i][0].test(sym || "")) return /night/.test(sym) && /clearsky|fair/.test(sym) ? "🌙" : EMO[i][1]; return "🌡️"; }
  function renderWeather(main) {
    var head = '<div class="top">' + header(T("obhavo")) + '</div><div class="card">' + citySelect() + "</div>";
    var w = weatherData && weatherData.cities[cityId()];
    var cc = cities.filter(function (x) { return x.id === cityId(); })[0];
    if (!w) { main.innerHTML = head + '<div class="card sub">' + (cc && cc.weather === false ? T("wnone") : T("nodata")) + "</div>" + foot(); return; }
    var dn = T("days");
    var rows = w.daily.slice(0, 7).map(function (d, i) {
      var dt = new Date(d.date + "T12:00:00Z");
      var name = i === 0 ? T("today") : i === 1 ? T("tomorrow") : dn[dt.getUTCDay()] + ", " + dt.getUTCDate();
      return "<div><span>" + name + "</span><span>" + emo(d.sym) + '</span><span class="r">' + d.min + "° / <b>" + d.max + '°</b></span><span class="rain">' + (d.rain > 0 ? d.rain + " mm" : "") + "</span></div>";
    }).join("");
    main.innerHTML = head + '<div class="card wnow"><span class="emo">' + emo(w.now.sym) + '</span><span class="big">' + Math.round(w.now.t) + '°</span><span class="sub">' + T("feels") + ": " + Math.round(w.now.hum) + "%<br>" + T("wind") + ": " + w.now.wind + " " + T("ms") + "</span></div>" +
      '<div class="card days">' + rows + "</div>" + '<p class="sub">' + T("updated") + ": " + esc(new Date(weatherData.fetched).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", { timeZone: "Asia/Tashkent", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) +
      ' · <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer">' + T("w_src") + "</a></p>" + puzzleCard() + foot();
  }
  /* ---- currency ---- */
  var TOP = ["USD", "EUR", "RUB", "KZT", "CNY", "GBP", "TRY", "KRW", "AED", "JPY", "KGS", "TJS"];
  function fmtN(x) { return x.toLocaleString(lang === "ru" ? "ru-RU" : "uz-UZ", { maximumFractionDigits: 2 }); }
  function renderRates(main) {
    var head = '<div class="top">' + header(T("valyuta")) + "</div>";
    if (!ratesData) { main.innerHTML = head + '<div class="card sub">' + T("nodata") + "</div>" + foot(); return; }
    var list = ratesData.rates.slice().sort(function (a, b) { var ia = TOP.indexOf(a.ccy), ib = TOP.indexOf(b.ccy); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    var sel = load("uz:ccy", "USD");
    var r = list.filter(function (x) { return x.ccy === sel; })[0] || list[0];
    main.innerHTML = head + '<div class="card"><b>' + T("conv") + '</b><div class="conv" style="margin-top:8px"><input id="amt" inputmode="decimal" value="' + esc(load("uz:amt", "100")) + '" aria-label="amount"><select id="ccy" style="width:auto">' +
      list.map(function (x) { return '<option' + (x.ccy === r.ccy ? " selected" : "") + ">" + x.ccy + "</option>"; }).join("") + '</select><div class="res" id="res"></div></div></div>' +
      '<div class="card"><div class="sub">' + T("r_date") + ": <b>" + esc(ratesData.date) + '</b></div><div class="rates">' +
      list.map(function (x) {
        var cls = x.diff > 0 ? "up" : x.diff < 0 ? "down" : "";
        return '<div><span class="c">' + x.ccy + '</span><span class="n">' + (x.nominal > 1 ? x.nominal + " · " : "") + esc(x[lang] || x.uz) + '</span><span class="v">' + fmtN(x.rate) + ' <small class="' + cls + '">' + (x.diff > 0 ? "▲ +" : x.diff < 0 ? "▼ " : "") + fmtN(x.diff) + "</small></span></div>";
      }).join("") + "</div></div>" +
      '<p class="sub">' + T("r_note") + ' <a href="' + ratesData.sourceUrl + '" target="_blank" rel="noopener noreferrer">' + T("r_src") + "</a></p>" + puzzleCard() + foot();
    function calc() {
      var a = parseFloat(($("#amt").value || "0").replace(",", ".")) || 0;
      var cur = list.filter(function (x) { return x.ccy === $("#ccy").value; })[0];
      save("uz:amt", $("#amt").value); save("uz:ccy", cur.ccy);
      $("#res").textContent = fmtN(a) + " " + cur.ccy + " = " + fmtN(a * cur.rate / cur.nominal) + " " + T("sum");
    }
    $("#amt").addEventListener("input", calc); $("#ccy").addEventListener("change", calc); calc();
  }
  function start() {
    if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} try { tg.onEvent("themeChanged", theme); } catch (e) {} }
    theme();
    var jobs = [getJSON(BASE + "data/cities.json").then(function (c) { cities = c; })];
    if (PAGE === "ob-havo") jobs.push(getJSON(BASE + "data/weather.json").then(function (w) { weatherData = w; }, function () {}));
    if (PAGE === "valyuta") jobs.push(getJSON(BASE + "data/rates.json").then(function (r) { ratesData = r; }, function () {}));
    Promise.all(jobs).then(function () {
      render();
      document.body.classList.add("ready");
      if (window.MiniAds) MiniAds.load(BASE + "data/ads.json").then(function () { MiniAds.apply(document); });
    });
  }
  start();
})();
