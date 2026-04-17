import type { AppMode } from "./types";

export const SITE_NAME = "Divination Workspace";
export const SITE_URL_ENV = import.meta.env.VITE_SITE_URL?.trim() ?? "";
export const DEFAULT_SOCIAL_IMAGE_PATH = "/social-card.svg";
export const DEFAULT_KEYWORDS =
  "六壬神課,金口訣,奇門遁甲,断易,五行易,東洋占術,占い,相談文,解釈,Webアプリ";

type ModeSeo = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  featureList: string[];
};

export const MODE_SEO: Record<AppMode, ModeSeo> = {
  liuren: {
    path: "/",
    title: "六壬神課盤を自動作成 | Divination Workspace",
    description:
      "六壬神課の月将・四課・三伝・十二天将・六親をまとめて確認できる占断アプリ。相談文から読み筋の整理まで対応します。",
    keywords: `${DEFAULT_KEYWORDS},六壬神課,三伝,十二天将`,
    featureList: ["月将・四課・三伝の自動表示", "相談文に沿った解釈整理", "地方時差を含む作盤条件の確認"],
  },
  qimen: {
    path: "/qimen/",
    title: "奇門遁甲上級編 文字資料室 | Divination Workspace",
    description:
      "手直し済みの奇門遁甲OCRを章・節・画像ID単位で読める参照ページ。将来の盤面ロジックに向けた土台として整理しています。",
    keywords: `${DEFAULT_KEYWORDS},奇門遁甲,奇門遁甲上級編,文字起こし,OCR`,
    featureList: ["手直し済みOCRの章立て表示", "画像IDごとの本文参照", "将来の盤面ロジックに向けた土台"],
  },
  kingoketsu: {
    path: "/kingoketsu/",
    title: "金口訣盤を自動作成 | Divination Workspace",
    description:
      "金口訣の四柱・月将・貴神・将神・地分・用爻を一画面で確認できる占断アプリ。相談内容に沿って解釈の軸を整理できます。",
    keywords: `${DEFAULT_KEYWORDS},金口訣,貴神,将神,用爻`,
    featureList: ["四柱と月将の自動算出", "貴神・将神・用爻の一画面表示", "相談文に合わせた解釈補助"],
  },
  danneki: {
    path: "/danneki/",
    title: "断易で相談文を解釈 | Divination Workspace",
    description:
      "断易・五行易の本卦・之卦・動爻・用神候補を相談文とあわせて確認し、解説と解釈まで返す占断アプリです。",
    keywords: `${DEFAULT_KEYWORDS},断易,五行易,本卦,之卦,動爻,用神`,
    featureList: ["相談文から解釈軸を補強", "本卦・之卦・動爻の同時表示", "用神候補と読み筋の自動整理"],
  },
  taiitsu: {
    path: "/taiitsu/",
    title: "太乙神数盤を自動作成 | Divination Workspace",
    description:
      "太乙神数入門 測局篇の構造化PDFインデックスを参照し、起局日時・方位・起局条件から太乙神数盤を確認できる占断アプリです。",
    keywords: `${DEFAULT_KEYWORDS},太乙神数,太乙,測局,起局,方位`,
    featureList: ["起局日時と方位の入力", "PDFページ単位の根拠参照", "同一入力で再現可能な局序とtrace"],
  },
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function normalizePath(pathname: string) {
  const trimmed = pathname.trim();

  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getModeFromPath(pathname: string): AppMode {
  const normalized = normalizePath(pathname);

  if (normalized === MODE_SEO.qimen.path) {
    return "qimen";
  }

  if (normalized === MODE_SEO.kingoketsu.path) {
    return "kingoketsu";
  }

  if (normalized === MODE_SEO.danneki.path) {
    return "danneki";
  }

  if (normalized === MODE_SEO.taiitsu.path) {
    return "taiitsu";
  }

  return "liuren";
}

export function getPathForMode(mode: AppMode) {
  return MODE_SEO[mode].path;
}

function resolveSiteUrl() {
  if (SITE_URL_ENV) {
    return stripTrailingSlash(SITE_URL_ENV);
  }

  return stripTrailingSlash(window.location.origin);
}

function resolveRouteUrl(mode: AppMode) {
  return new URL(getPathForMode(mode), `${resolveSiteUrl()}/`).toString();
}

function resolveImageUrl() {
  return new URL(DEFAULT_SOCIAL_IMAGE_PATH, `${resolveSiteUrl()}/`).toString();
}

function isIndexableRoute(routeUrl: string) {
  if (!SITE_URL_ENV) {
    return false;
  }

  return new URL(routeUrl).origin === new URL(SITE_URL_ENV).origin;
}

function updateMetaTag(selector: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");

    const [, attributeName, attributeValue] = selector.match(/^meta\[(name|property)="([^"]+)"\]$/) ?? [];

    if (attributeName && attributeValue) {
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
  }

  if (element) {
    element.setAttribute("content", content);
  }
}

function updateCanonical(routeUrl: string) {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  if (canonical) {
    canonical.setAttribute("href", routeUrl);
  }
}

function buildStructuredData(mode: AppMode, routeUrl: string) {
  const seo = MODE_SEO[mode];

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      inLanguage: "ja-JP",
      url: routeUrl,
      description: seo.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: seo.title.replace(" | Divination Workspace", ""),
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web Browser",
      inLanguage: "ja-JP",
      url: routeUrl,
      description: seo.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
      featureList: seo.featureList,
    },
  ];
}

export function applyModeSeo(mode: AppMode) {
  const seo = MODE_SEO[mode];
  const routeUrl = resolveRouteUrl(mode);
  const imageUrl = resolveImageUrl();
  const robots = isIndexableRoute(routeUrl)
    ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    : "noindex,nofollow,noarchive";
  let structuredData = document.getElementById("structured-data");

  document.title = seo.title;
  updateCanonical(routeUrl);
  updateMetaTag('meta[name="description"]', seo.description);
  updateMetaTag('meta[name="keywords"]', seo.keywords);
  updateMetaTag('meta[name="robots"]', robots);
  updateMetaTag('meta[property="og:title"]', seo.title);
  updateMetaTag('meta[property="og:description"]', seo.description);
  updateMetaTag('meta[property="og:url"]', routeUrl);
  updateMetaTag('meta[property="og:image"]', imageUrl);
  updateMetaTag('meta[name="twitter:title"]', seo.title);
  updateMetaTag('meta[name="twitter:description"]', seo.description);
  updateMetaTag('meta[name="twitter:image"]', imageUrl);

  if (!structuredData) {
    structuredData = document.createElement("script");
    structuredData.id = "structured-data";
    structuredData.setAttribute("type", "application/ld+json");
    document.head.appendChild(structuredData);
  }

  structuredData.textContent = JSON.stringify(buildStructuredData(mode, routeUrl));
}
