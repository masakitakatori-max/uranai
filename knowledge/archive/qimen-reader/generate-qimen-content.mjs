import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const inputPath = path.join(projectRoot, "knowledge", "qimen", "transcript.txt");
const outputPath = path.join(projectRoot, "src", "lib", "data", "qimen.generated.ts");

const HEADING_PATTERN = /^第([0-9一二三四五六七八九十]+)([部章項節頃])(.*)$/;
const SPECIAL_HEADINGS = new Set(["目次", "はじめに", "全伝", "序文", "前書き", "あとがき"]);

function compactLine(line) {
  return line.trim().replace(/\s+/g, " ");
}

function normalizeHeading(line) {
  const compact = compactLine(line).replace(/\s+/g, "");

  if (SPECIAL_HEADINGS.has(compact)) {
    return compact;
  }

  const match = compact.match(HEADING_PATTERN);
  if (!match) {
    return compactLine(line);
  }

  const marker = `第${match[1]}${match[2]}`;
  const rest = match[3].trim();
  return rest ? `${marker} ${rest}` : marker;
}

function getHeadingKind(line) {
  const compact = compactLine(line).replace(/\s+/g, "");

  if (compact === "目次") {
    return "toc";
  }

  if (compact === "はじめに" || compact === "全伝" || compact === "序文" || compact === "前書き" || compact === "あとがき") {
    return "frontmatter";
  }

  const match = compact.match(HEADING_PATTERN);
  if (!match) {
    return null;
  }

  switch (match[2]) {
    case "部":
      return "part";
    case "章":
      return "chapter";
    case "項":
    case "節":
    case "頃":
      return "section";
    default:
      return null;
  }
}

function isLikelyHeading(line) {
  return getHeadingKind(line) !== null;
}

function chooseTitle(section) {
  const headings = section.headings.map((line) => normalizeHeading(line));
  const sectionHeading = [...headings].reverse().find((line) => getHeadingKind(line) === "section");
  const chapterHeading = [...headings].reverse().find((line) => getHeadingKind(line) === "chapter");
  const partHeading = [...headings].reverse().find((line) => getHeadingKind(line) === "part");
  const specialHeading = headings.find((line) => getHeadingKind(line) === "frontmatter" || getHeadingKind(line) === "toc");

  if (section.pageIndex === 0) {
    return "序文";
  }

  if (section.pageIndex === 1) {
    return "目次";
  }

  if (specialHeading === "目次") {
    return "目次";
  }

  return sectionHeading ?? chapterHeading ?? partHeading ?? specialHeading ?? section.bodyLines.find((line) => line.length > 0)?.slice(0, 48) ?? section.sourceImage;
}

function classifyKind(section) {
  if (section.pageIndex === 0) {
    return "frontmatter";
  }

  if (section.pageIndex === 1) {
    return "toc";
  }

  const title = section.title;
  const body = section.body;

  if (title === "目次" || (section.pageIndex <= 2 && section.headings.some((line) => normalizeHeading(line) === "目次"))) {
    return "toc";
  }

  if (/実例/.test(title) || /実例/.test(body)) {
    return "example";
  }

  if (/注意/.test(title) || /注意/.test(body) || /ご注意/.test(body)) {
    return "note";
  }

  if (/表/.test(title) || /一覧/.test(title) || /象意表/.test(body) || /\|/.test(body)) {
    return "table";
  }

  if (/格局|旺相|作盤|判断|用神|象意|基礎|歴史|利用法|活用|移転|方位|卜占|三奇|六儀/.test(title)) {
    return "reference";
  }

  return "page";
}

function toId(prefix, value) {
  return `${prefix}-${String(value).padStart(2, "0")}`;
}

function buildBuckets(sections) {
  const buckets = [
    { id: "frontmatter", title: "前書き・索引", sectionIds: [] },
    { id: "reference", title: "理論・解説", sectionIds: [] },
    { id: "example", title: "実例", sectionIds: [] },
    { id: "note", title: "注意事項", sectionIds: [] },
    { id: "table", title: "象意表・一覧", sectionIds: [] },
  ];

  for (const section of sections) {
    if (section.kind === "frontmatter" || section.kind === "toc") {
      buckets[0].sectionIds.push(section.id);
    }
    if (section.kind === "reference") {
      buckets[1].sectionIds.push(section.id);
    }
    if (section.kind === "example") {
      buckets[2].sectionIds.push(section.id);
    }
    if (section.kind === "note") {
      buckets[3].sectionIds.push(section.id);
    }
    if (section.kind === "table") {
      buckets[4].sectionIds.push(section.id);
    }
  }

  return buckets.filter((bucket) => bucket.sectionIds.length > 0);
}

function emptyKindCounts() {
  return {
    frontmatter: 0,
    toc: 0,
    reference: 0,
    example: 0,
    note: 0,
    table: 0,
    page: 0,
  };
}

function buildOutline(sections) {
  const partMap = new Map();
  let partSeq = 0;
  let chapterSeq = 0;

  for (const section of sections) {
    const partTitle = section.partTitle ?? "未分類";
    const chapterTitle = section.chapterTitle ?? "未分類";

    if (!partMap.has(partTitle)) {
      partSeq += 1;
      partMap.set(partTitle, {
        id: toId("part", partSeq),
        title: partTitle,
        firstSectionId: section.id,
        pageIds: [],
        chapters: [],
      });
    }

    const partNode = partMap.get(partTitle);
    partNode.pageIds.push(section.id);

    let chapterNode = partNode.chapters.find((item) => item.title === chapterTitle);
    if (!chapterNode) {
      chapterSeq += 1;
      chapterNode = {
        id: toId("chapter", chapterSeq),
        title: chapterTitle,
        firstSectionId: section.id,
        pageIds: [],
      };
      partNode.chapters.push(chapterNode);
    }

    chapterNode.pageIds.push(section.id);
  }

  return [...partMap.values()].map((part) => ({
    ...part,
    chapters: part.chapters.map((chapter) => ({
      ...chapter,
      pageCount: chapter.pageIds.length,
    })),
    pageCount: part.pageIds.length,
  }));
}

function createSectionFromBlock(block, pageIndex, state) {
  const rawLines = block.lines.map((line) => line.replace(/\r$/, ""));
  const body = rawLines.map((line) => line.trimEnd()).join("\n").trim();
  const headings = rawLines.filter((line) => isLikelyHeading(line));
  const formattedHeadings = headings.map((line) => normalizeHeading(line));

  if (pageIndex === 0) {
    state.partTitle = "序文・目次";
    state.chapterTitle = "序文";
    state.sectionTitle = null;
  }

  if (pageIndex === 1) {
    state.partTitle = "序文・目次";
    state.chapterTitle = "目次";
    state.sectionTitle = null;
  }

  if (pageIndex > 1 && headings.length > 0 && !rawLines.some((line) => compactLine(line) === "目次")) {
    for (const heading of formattedHeadings) {
      const kind = getHeadingKind(heading);
      if (kind === "part") {
        state.partTitle = heading;
        state.chapterTitle = null;
        state.sectionTitle = null;
      } else if (kind === "chapter") {
        state.chapterTitle = heading;
        state.sectionTitle = null;
      } else if (kind === "section") {
        state.sectionTitle = heading;
      }
    }
  }

  const section = {
    id: block.id,
    sourceImage: block.sourceImage,
    pageIndex,
    headings: formattedHeadings,
    bodyLines: rawLines,
    body,
    partTitle: state.partTitle,
    chapterTitle: state.chapterTitle,
    sectionTitle: state.sectionTitle,
    breadcrumbs: [state.partTitle, state.chapterTitle, state.sectionTitle].filter(Boolean),
  };

  section.title = chooseTitle(section);
  section.kind = classifyKind(section);
  section.excerpt = section.bodyLines
    .filter((line) => line.trim().length > 0 && !isLikelyHeading(line))
    .slice(0, 3)
    .join(" ");

  if (!section.excerpt) {
    section.excerpt = section.bodyLines
      .filter((line) => line.trim().length > 0)
      .slice(0, 2)
      .join(" ");
  }

  return section;
}

function escapeScriptTag(text) {
  return text.replaceAll("</script>", "<\\/script>");
}

async function main() {
  const source = await fs.readFile(inputPath, "utf8");
  const lines = source.split(/\r?\n/);

  const blocks = [];
  let current = null;

  for (const line of lines) {
    const markerMatch = line.match(/^===== (IMG_\d+\.JPG) =====$/);
    if (markerMatch) {
      if (current) {
        blocks.push(current);
      }
      const sourceImage = markerMatch[1];
      current = {
        id: `img_${sourceImage.match(/\d+/)?.[0] ?? String(blocks.length + 1).padStart(4, "0")}`,
        sourceImage,
        lines: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    current.lines.push(line);
  }

  if (current) {
    blocks.push(current);
  }

  const state = {
    partTitle: null,
    chapterTitle: null,
    sectionTitle: null,
  };

  const sections = blocks.map((block, index) => createSectionFromBlock(block, index, state));
  const outline = buildOutline(sections);
  const buckets = buildBuckets(sections);
  const kindCounts = emptyKindCounts();

  for (const section of sections) {
    kindCounts[section.kind] += 1;
  }

  const stats = {
    pageCount: sections.length,
    partCount: outline.length,
    chapterCount: outline.reduce((total, part) => total + part.chapters.length, 0),
    subsectionCount: new Set(
      sections
        .map((section) => section.sectionTitle)
        .filter((value) => value && value !== "目次" && value !== "序文"),
    ).size,
    kindCounts,
  };

  const file = `/* eslint-disable */\n/* Generated by scripts/generate-qimen-content.mjs from knowledge/qimen/transcript.txt. */\n\nexport type QimenSectionKind = "frontmatter" | "toc" | "reference" | "example" | "note" | "table" | "page";\n\nexport interface QimenSection {\n  id: string;\n  sourceImage: string;\n  pageIndex: number;\n  title: string;\n  kind: QimenSectionKind;\n  partTitle: string | null;\n  chapterTitle: string | null;\n  sectionTitle: string | null;\n  breadcrumbs: string[];\n  headings: string[];\n  bodyLines: string[];\n  body: string;\n  excerpt: string;\n}\n\nexport interface QimenOutlineChapter {\n  id: string;\n  title: string;\n  firstSectionId: string;\n  pageIds: string[];\n  pageCount: number;\n}\n\nexport interface QimenOutlinePart {\n  id: string;\n  title: string;\n  firstSectionId: string;\n  pageIds: string[];\n  pageCount: number;\n  chapters: QimenOutlineChapter[];\n}\n\nexport interface QimenReferenceBucket {\n  id: string;\n  title: string;\n  sectionIds: string[];\n}\n\nexport interface QimenStats {\n  pageCount: number;\n  partCount: number;\n  chapterCount: number;\n  subsectionCount: number;\n  kindCounts: Record<QimenSectionKind, number>;\n}\n\nexport const QIMEN_SECTIONS = ${escapeScriptTag(JSON.stringify(sections, null, 2))} as const satisfies readonly QimenSection[];\nexport const QIMEN_OUTLINE = ${escapeScriptTag(JSON.stringify(outline, null, 2))} as const satisfies readonly QimenOutlinePart[];\nexport const QIMEN_REFERENCE_BUCKETS = ${escapeScriptTag(JSON.stringify(buckets, null, 2))} as const satisfies readonly QimenReferenceBucket[];\nexport const QIMEN_STATS = ${escapeScriptTag(JSON.stringify(stats, null, 2))} as const satisfies QimenStats;\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, file, "utf8");

  console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${path.relative(projectRoot, inputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
