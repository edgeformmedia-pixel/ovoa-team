// Tells Bing (and so ChatGPT search, Copilot and DuckDuckGo), Yandex and the
// other IndexNow engines that ovoa.ai's pages changed, so they recrawl now
// instead of whenever they next pass by. Run it after a deploy that changes
// what pages say:
//
//   node scripts/indexnow.mjs            every page in the live sitemap
//   node scripts/indexnow.mjs /faq /     just these pages
//
// The key is the file public/<key>.txt, which the site serves so the engines
// can check the request came from us. Google doesn't use IndexNow; it reads
// the sitemap (submitted in Search Console).

import { readdirSync } from "node:fs";

const SITE = "https://ovoa.ai";

const keyFile = readdirSync(new URL("../public/", import.meta.url)).find((name) =>
  /^[0-9a-f]{32}\.txt$/.test(name),
);
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex characters>.txt)");
const key = keyFile.slice(0, -4);

let urls = process.argv.slice(2).map((path) => new URL(path, SITE).href);
if (urls.length === 0) {
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE).host,
    key,
    keyLocation: `${SITE}/${keyFile}`,
    urlList: urls,
  }),
});

// 200 = accepted, 202 = accepted while the key is being checked.
console.log(`IndexNow ${res.status} for ${urls.length} URLs`);
for (const url of urls) console.log(`  ${url}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
