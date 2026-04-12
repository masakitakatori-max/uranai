import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const baseIndexPath = path.join(distDir, "index.html");

const SITE_NAME = "Divination Workspace";
const DEFAULT_KEYWORDS = "六壬神課,金口訣,断易,五行易,東洋占術,占い,相談文,解釈,Webアプリ";
const DEFAULT_IMAGE_PATH = "/social-card.svg";
const DEFAULT_LOCALE = "ja_JP";
const DEFAULT_ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
const PREVIEW_ROBOTS = "noindex,nofollow,noarchive";

const routes = {
  liuren: {
    path: "/",
    title: "六壬神課盤を自動作成 | Divination Workspace",
    description:
      "六壬神課の月将・四課・三伝・十二天将・六親をまとめて確認できる占断アプリ。相談文から読み筋の整理まで対応します。",
    keywords: `${DEFAULT_KEYWORDS},六壬神課,三伝,十二天将`,
    headline: "六壬神課盤を自動作成できる東洋占術Webアプリ",
    featureList: ["月将・四課・三伝の自動表示", "相談文に沿った解釈整理", "地方時差を含む作盤条件の確認"],
  },
  kingoketsu: {
    path: "/kingoketsu/",
    title: "金口訣盤を自動作成 | Divination Workspace",
    description:
      "金口訣の四柱・月将・貴神・将神・地分・用爻を一画面で確認できる占断アプリ。相談内容に沿って解釈の軸を整理できます。",
    keywords: `${DEFAULT_KEYWORDS},金口訣,貴神,将神,用爻`,
    headline: "金口訣の盤面と解釈を整理できるWebアプリ",
    featureList: ["四柱と月将の自動算出", "貴神・将神・用爻の一画面表示", "相談文に合わせた解釈補助"],
  },
  danneki: {
    path: "/danneki/",
    title: "断易で相談文を解釈 | Divination Workspace",
    description:
      "断易・五行易の本卦・之卦・動爻・用神候補を相談文とあわせて確認し、解説と解釈まで返す占断アプリです。",
    keywords: `${DEFAULT_KEYWORDS},断易,五行易,本卦,之卦,動爻,用神`,
    headline: "断易の本卦・之卦・動爻を相談文と一緒に読めるWebアプリ",
    featureList: ["相談文から解釈軸を補強", "本卦・之卦・動爻の同時表示", "用神候補と読み筋の自動整理"],
  },
};

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

function resolveSiteUrl() {
  const explicitUrl = process.env.VITE_SITE_URL || process.env.SITE_URL;

  if (explicitUrl) {
    return stripTrailingSlash(explicitUrl);
  }

  if (process.env.VERCEL_URL) {
    return `https://${stripTrailingSlash(process.env.VERCEL_URL)}`;
  }

  return "http://127.0.0.1:4173";
}

function getRobotsPolicy() {
  if (process.env.SEO_INDEXABLE === "true") {
    return DEFAULT_ROBOTS;
  }

  return process.env.VERCEL_ENV === "production" ? DEFAULT_ROBOTS : PREVIEW_ROBOTS;
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`Expected tag not found for pattern: ${pattern}`);
  }

  return html.replace(pattern, replacement);
}

function buildStructuredData(routeUrl, route) {
  const payload = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      inLanguage: "ja-JP",
      url: routeUrl,
      description: route.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: route.title.replace(" | Divination Workspace", ""),
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web Browser",
      inLanguage: "ja-JP",
      url: routeUrl,
      description: route.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
      featureList: route.featureList,
    },
  ];

  return JSON.stringify(payload, null, 2).replaceAll("</script>", "<\\/script>");
}

function buildRouteHtml(sourceHtml, route, siteUrl, robotsPolicy) {
  const routeUrl = new URL(route.path, `${siteUrl}/`).toString();
  const imageUrl = new URL(DEFAULT_IMAGE_PATH, `${siteUrl}/`).toString();
  const structuredData = buildStructuredData(routeUrl, route);

  let html = sourceHtml;
  html = replaceTag(html, /<title>.*?<\/title>/s, `<title>${escapeAttribute(route.title)}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttribute(route.description)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
    `<meta name="keywords" content="${escapeAttribute(route.keywords)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${escapeAttribute(robotsPolicy)}" />`,
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeAttribute(routeUrl)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:locale" content="${DEFAULT_LOCALE}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeAttribute(route.title)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeAttribute(route.description)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeAttribute(routeUrl)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${escapeAttribute(imageUrl)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeAttribute(route.title)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeAttribute(route.description)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeAttribute(imageUrl)}" />`,
  );
  html = replaceTag(
    html,
    /<script\s+id="structured-data"\s+type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="structured-data" type="application/ld+json">${structuredData}</script>`,
  );

  return html;
}

function buildSitemap(siteUrl) {
  const today = new Date().toISOString();
  const urls = Object.values(routes)
    .map((route) => {
      const location = new URL(route.path, `${siteUrl}/`).toString();
      return `  <url>
    <loc>${location}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.path === "/" ? "1.0" : "0.8"}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function writeRoutePage(sourceHtml, route, siteUrl, robotsPolicy) {
  const routeHtml = buildRouteHtml(sourceHtml, route, siteUrl, robotsPolicy);
  const routeDir = route.path === "/" ? distDir : path.join(distDir, route.path.replace(/^\/|\/$/g, ""));
  const routePath = route.path === "/" ? baseIndexPath : path.join(routeDir, "index.html");

  if (route.path !== "/") {
    await fs.mkdir(routeDir, { recursive: true });
  }

  await fs.writeFile(routePath, routeHtml, "utf8");
}

const siteUrl = resolveSiteUrl();
const robotsPolicy = getRobotsPolicy();
const sourceHtml = await fs.readFile(baseIndexPath, "utf8");

await writeRoutePage(sourceHtml, routes.liuren, siteUrl, robotsPolicy);
await writeRoutePage(sourceHtml, routes.kingoketsu, siteUrl, robotsPolicy);
await writeRoutePage(sourceHtml, routes.danneki, siteUrl, robotsPolicy);
await fs.writeFile(
  path.join(distDir, "robots.txt"),
  `User-agent: *\n${robotsPolicy.startsWith("noindex") ? "Disallow: /\n" : "Allow: /\n"}Sitemap: ${siteUrl}/sitemap.xml\n`,
  "utf8",
);
await fs.writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(siteUrl), "utf8");
