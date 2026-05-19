#!/usr/bin/env node
// Baseline license-clean photos from Wikimedia Commons (no rate limits).
// Saves the best landscape JPG per concept to assets/img/ + CREDITS.txt.
import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const OUT = "/Users/yuki/Projects/personal/Coding/e-book/assets/img";
mkdirSync(OUT, { recursive: true });
const API = "https://commons.wikimedia.org/w/api.php";
const UA = { "User-Agent": "ebook-storefront-build/1.0 (contact: local)" };

const WANT = {
  hero:      ["sports car", "car parked", "automobile sedan", "coupe car"],
  exterior:  ["car body paint", "car door panel", "car fender", "car bodywork"],
  engine:    ["car engine bay", "engine compartment", "automobile engine", "car motor"],
  oil:       ["engine oil dipstick", "engine oil filler", "checking oil car", "engine oil"],
  tire:      ["car tire", "automobile tyre", "tire tread", "car wheel"],
  interior:  ["car interior", "car dashboard", "automobile dashboard", "car cockpit"],
  underbody: ["car on lift", "car undercarriage", "automobile chassis underside", "car suspension"],
  drive:     ["steering wheel", "driving automobile", "car driver", "car interior driving"],
  docs:      ["car sale contract", "vehicle registration document", "signing contract", "paperwork desk"],
};

async function search(term, limit = 14) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: "query", format: "json", origin: "*",
    generator: "search", gsrnamespace: "6", gsrsearch: term, gsrlimit: String(limit),
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1800",
  });
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error("api " + r.status);
  const j = await r.json();
  const pages = j?.query?.pages ? Object.values(j.query.pages) : [];
  return pages.map(p => (p.imageinfo?.[0] ? { title: p.title, ...p.imageinfo[0] } : null)).filter(Boolean);
}

const txt = s => (s ? String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "");
const credits = [];

for (const [name, terms] of Object.entries(WANT)) {
  let saved = false;
  for (const term of terms) {
    let list;
    try { list = await search(term); } catch { continue; }
    const cand = list
      .filter(i => /image\/jpeg/.test(i.mime || ""))
      .filter(i => i.width && i.height && i.width / i.height >= 1.15 && i.width / i.height <= 2.2)
      .filter(i => i.width >= 1100)
      .filter(i => !/(\.svg|logo|icon|\bmap\b|diagram|chart|seal|coat of arms)/i.test(i.title))
      .sort((a, b) => b.width - a.width);
    for (const i of cand.slice(0, 6)) {
      const src = i.thumburl || i.url;
      try {
        const res = await fetch(src, { headers: UA });
        if (!res.ok || !res.body) continue;
        await pipeline(res.body, createWriteStream(`${OUT}/${name}.jpg`));
        const lic = txt(i.extmetadata?.LicenseShortName?.value) || "see source";
        const art = txt(i.extmetadata?.Artist?.value) || "Unknown";
        credits.push(`${name}.jpg  —  ${i.title.replace(/^File:/, "")}  —  ${art}  —  ${lic}  —  https://commons.wikimedia.org/wiki/${encodeURIComponent(i.title)}`);
        console.log(`OK  ${name.padEnd(10)} ${String(i.width).padStart(4)}x${i.height}  ${lic}  <- "${term}"`);
        saved = true; break;
      } catch { /* next */ }
    }
    if (saved) break;
  }
  if (!saved) console.log(`MISS ${name}`);
}

writeFileSync(`${OUT}/CREDITS.txt`,
  "Photography via Wikimedia Commons — Creative Commons / public domain.\n" +
  "file — source title — author — licence — page\n\n" + credits.join("\n") + "\n");
console.log(`\n${credits.length}/9 saved -> assets/img/`);
