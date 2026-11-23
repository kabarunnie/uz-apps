#!/usr/bin/env python3
"""Cache public data into site/data/ (run by GitHub Actions on a schedule).
- Currency: Central Bank of the Republic of Uzbekistan public JSON (cbu.uz). Numbers copied as published, never invented.
- Weather: MET Norway Locationforecast 2.0 (api.met.no), CC BY 4.0 / NLOD, attribution required, identifying User-Agent required.
On any fetch error the previous file is kept (no fake data)."""
import json, urllib.request, datetime, pathlib, collections, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"
UA = "uz-apps/1.0 (+https://github.com/kabarunnie/uz-apps)"
TZ = datetime.timezone(datetime.timedelta(hours=5))

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def now(): return datetime.datetime.now(TZ).isoformat(timespec="minutes")

def rates():
    raw = get("https://cbu.uz/uz/arkhiv-kursov-valyut/json/")
    out = {"source": "Oʻzbekiston Respublikasi Markaziy banki (cbu.uz)", "sourceUrl": "https://cbu.uz/uz/arkhiv-kursov-valyut/",
           "fetched": now(), "date": raw[0]["Date"], "rates": []}
    for r in raw:
        out["rates"].append({"ccy": r["Ccy"], "uz": r["CcyNm_UZ"], "ru": r["CcyNm_RU"], "nominal": int(r["Nominal"]),
                             "rate": float(r["Rate"]), "diff": float(r["Diff"])})
    assert len(out["rates"]) > 10 and any(x["ccy"] == "USD" for x in out["rates"])
    (DATA / "rates.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("rates", out["date"], len(out["rates"]))

def weather():
    cities = json.loads((DATA / "cities.json").read_text(encoding="utf-8"))
    out = {"source": "MET Norway (api.met.no), CC BY 4.0", "sourceUrl": "https://api.met.no/", "fetched": now(), "cities": {}}
    for c in cities:
        j = get(f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={c['lat']:.4f}&lon={c['lon']:.4f}&altitude={c['elv']}")
        ts = j["properties"]["timeseries"]
        first = ts[0]["data"]
        cur = {"t": first["instant"]["details"]["air_temperature"], "wind": first["instant"]["details"].get("wind_speed"),
               "hum": first["instant"]["details"].get("relative_humidity"),
               "sym": (first.get("next_1_hours") or first.get("next_6_hours") or {}).get("summary", {}).get("symbol_code", "")}
        days = collections.OrderedDict()
        for s in ts:
            t = datetime.datetime.fromisoformat(s["time"].replace("Z", "+00:00")).astimezone(TZ)
            d = days.setdefault(t.date().isoformat(), {"min": 99, "max": -99, "rain": 0.0, "syms": collections.Counter()})
            temp = s["data"]["instant"]["details"]["air_temperature"]
            d["min"] = min(d["min"], temp); d["max"] = max(d["max"], temp)
            n6 = s["data"].get("next_6_hours")
            if n6 and t.hour in (0, 6, 12, 18):
                d["rain"] += n6.get("details", {}).get("precipitation_amount", 0) or 0
                if 6 <= t.hour <= 12: d["syms"][n6["summary"]["symbol_code"]] += 2
                else: d["syms"][n6["summary"]["symbol_code"]] += 1
        daily = [{"date": k, "min": round(v["min"]), "max": round(v["max"]), "rain": round(v["rain"], 1),
                  "sym": v["syms"].most_common(1)[0][0] if v["syms"] else ""} for k, v in list(days.items())[:7]]
        out["cities"][c["id"]] = {"now": cur, "updated": j["properties"]["meta"]["updated_at"], "daily": daily}
    (DATA / "weather.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("weather", len(out["cities"]))

if __name__ == "__main__":
    ok = True
    for f in (rates, weather):
        try: f()
        except Exception as e:
            ok = False; print("FAILED", f.__name__, e, file=sys.stderr)
    sys.exit(0 if ok else 1)
