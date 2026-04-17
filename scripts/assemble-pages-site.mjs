import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const staticDir = path.join(projectRoot, "site");
const outputDir = path.join(projectRoot, "site-build");
const today = new Date().toISOString().slice(0, 10);

const extraAppUrls = [
  "https://uranai.mozule.co.jp/qimen/",
  "https://uranai.mozule.co.jp/kingoketsu/",
  "https://uranai.mozule.co.jp/danneki/",
];

async function copyDirectoryContents(fromDir, toDir, options = {}) {
  const { skipNames = new Set() } = options;
  const entries = await fs.readdir(fromDir, { withFileTypes: true });

  for (const entry of entries) {
    if (skipNames.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(fromDir, entry.name);
    const targetPath = path.join(toDir, entry.name);
    await fs.cp(sourcePath, targetPath, { recursive: true, force: true });
  }
}

function appendSitemapEntries(xml, urls) {
  const additions = urls
    .filter((url) => !xml.includes(`<loc>${url}</loc>`))
    .map(
      (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    );

  if (additions.length === 0) {
    return xml;
  }

  return xml.replace("</urlset>", `${additions.join("\n")}\n</urlset>`);
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

await copyDirectoryContents(distDir, outputDir);
await copyDirectoryContents(staticDir, outputDir, { skipNames: new Set(["index.html"]) });

const sitemapPath = path.join(outputDir, "sitemap.xml");
const sitemapXml = await fs.readFile(sitemapPath, "utf8");
const mergedSitemap = appendSitemapEntries(sitemapXml, extraAppUrls);
await fs.writeFile(sitemapPath, mergedSitemap, "utf8");
