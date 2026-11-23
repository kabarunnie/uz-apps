# uz-apps — Foydali (Uzbekistan utility Mini Apps)

Static Telegram Mini Apps, Uzbek (Latin) primary with a Russian toggle. Free on GitHub Pages, no server, no paid API, no tracking.

| Path | App | Data |
|---|---|---|
| `/uz-apps/` | hub | — |
| `/uz-apps/namoz/` | Namoz vaqtlari | calculated in the browser (`site/shared/pray.js`): Muslim World League angles (Fajr 18°, Isha 17°), Asr Hanafi. **Calculated, not the official taqvim.** |
| `/uz-apps/ob-havo/` | Ob-havo | MET Norway Locationforecast 2.0 (CC BY 4.0), cached every 3 h by `.github/workflows/refresh.yml` |
| `/uz-apps/valyuta/` | Valyuta kursi | Central Bank of Uzbekistan public JSON `cbu.uz/uz/arkhiv-kursov-valyut/json/`, cached every 3 h; shows the bank's own rate date; never invents numbers (on fetch failure the old file stays) |

Each page links to the Uzbek / Russian daily word puzzle (`/daily-puzzles/uz/`, `/ru/`).

Ads: `site/data/ads.json` — slots stay hidden until block ids are filled (Adsgram). Interstitial cap 3 min.

Local: `python3 tools/refresh.py` · tests `node --test tests/*.test.js` · screenshots `node tests/e2e.js <baseUrl>`.

## BotFather (user does this)
| Name | Username (1st / 2nd) | Web App URL |
|---|---|---|
| Foydali UZ | @foydali_uz_bot / @foydali_ilova_bot | https://kabarunnie.github.io/uz-apps/ |
(Optional separate bots: @namozvaqti_uz_bot → /namoz/, @valyuta_kurs_uz_bot → /valyuta/ — availability 미확인.)

## 미확인
- CBU data redistribution terms: the JSON is public and we show the source + date, but no explicit licence was found (미확인).
- Which angles the Muslim Board of Uzbekistan uses: not verified; method shown openly in the app.
