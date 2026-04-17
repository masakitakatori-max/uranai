import { useState } from "react";

import { QIMEN_OUTLINE, QIMEN_REFERENCE_BUCKETS, QIMEN_SECTIONS, QIMEN_STATS, type QimenReferenceBucket, type QimenSection, type QimenSectionKind } from "../lib/data/qimen.generated";

type OutlineChapterView = {
  id: string;
  title: string;
  firstSectionId: string;
  pageIds: string[];
  pageCount: number;
};

type OutlinePartView = {
  id: string;
  title: string;
  firstSectionId: string;
  pageIds: string[];
  pageCount: number;
  chapters: OutlineChapterView[];
};

const KIND_LABELS: Record<QimenSectionKind, string> = {
  frontmatter: "前書き",
  toc: "目次",
  reference: "理論",
  example: "実例",
  note: "注意",
  table: "表",
  page: "本文",
};

function matchesQuery(section: QimenSection, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [section.title, section.excerpt, section.body, section.breadcrumbs.join(" / "), section.headings.join(" "), section.sourceImage]
    .join("\n")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function buildOutlineChapters(part: OutlinePartView, visibleIds: Set<string>): OutlineChapterView[] {
  return part.chapters
    .map((chapter) => {
      const pageIds = chapter.pageIds.filter((id) => visibleIds.has(id));
      if (!pageIds.length) {
        return null;
      }

      return {
        ...chapter,
        pageIds,
        firstSectionId: pageIds[0] ?? chapter.firstSectionId,
        pageCount: pageIds.length,
      };
    })
    .filter((chapter): chapter is OutlineChapterView => chapter !== null);
}

function OutlineBucketCard({ bucket, firstSection }: { bucket: QimenReferenceBucket; firstSection: QimenSection | undefined }) {
  if (!bucket.sectionIds.length || !firstSection) {
    return null;
  }

  return (
    <a className="qimen-bucket-card" href={`#qimen-${firstSection.id}`}>
      <span>{bucket.title}</span>
      <strong>{bucket.sectionIds.length}件</strong>
      <p>{firstSection.title}</p>
    </a>
  );
}

export function QimenReaderPanel() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSections = QIMEN_SECTIONS.filter((section) => matchesQuery(section, normalizedQuery));
  const visibleIds = new Set<string>(filteredSections.map((section) => section.id as string));
  const sectionById = new Map<string, QimenSection>(QIMEN_SECTIONS.map((section) => [section.id as string, section] as const));
  const outlineParts = QIMEN_OUTLINE as unknown as OutlinePartView[];
  const referenceBuckets = QIMEN_REFERENCE_BUCKETS as unknown as QimenReferenceBucket[];
  const visibleOutline = outlineParts
    .map((part) => {
      const chapters = buildOutlineChapters(part, visibleIds);
      if (!chapters.length) {
        return null;
      }

      const pageIds = part.pageIds.filter((id) => visibleIds.has(id));

      return {
        ...part,
        pageIds,
        chapters,
        pageCount: pageIds.length,
      };
    })
    .filter((part): part is OutlinePartView => part !== null);

  const activeBuckets = referenceBuckets
    .map((bucket) => ({
      bucket,
      firstSectionId: bucket.sectionIds.find((id) => visibleIds.has(id)),
    }))
    .filter((item) => Boolean(item.firstSectionId));

  return (
    <section className="panel qimen-reader-panel">
      <div className="panel-heading">
        <p className="eyebrow">奇門遁甲モード</p>
        <h2>奇門遁甲上級編 文字資料室</h2>
        <p>手直し済みOCRを章・節・画像ID単位で読むための参照ビューです。今は理論資料の土台だけを置き、後から盤面ロジックや索引を足しやすい形にしています。</p>
      </div>

      <div className="qimen-shell">
        <div className="qimen-stat-grid">
          <article className="qimen-stat-card">
            <span>ページ</span>
            <strong>{QIMEN_STATS.pageCount}</strong>
            <small>表示中 {filteredSections.length}</small>
          </article>
          <article className="qimen-stat-card">
            <span>部</span>
            <strong>{QIMEN_STATS.partCount}</strong>
            <small>章立ての大分類</small>
          </article>
          <article className="qimen-stat-card">
            <span>章</span>
            <strong>{QIMEN_STATS.chapterCount}</strong>
            <small>アウトラインの中核</small>
          </article>
          <article className="qimen-stat-card">
            <span>実例・注意</span>
            <strong>{(QIMEN_STATS.kindCounts.example ?? 0) + (QIMEN_STATS.kindCounts.note ?? 0)}</strong>
            <small>参照しやすい塊</small>
          </article>
        </div>

        <div className="qimen-toolbar">
          <label className="qimen-search">
            <span>章名・本文で絞り込む</span>
            <input
              aria-label="奇門遁甲本文の検索"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: 格局 / 実例 / 注意 / 象意"
              value={query}
            />
          </label>
          <div className="qimen-toolbar-meta">
            <span>索引件数 {activeBuckets.length}</span>
            <button className="utility-button" onClick={() => setQuery("")} type="button">
              絞り込み解除
            </button>
          </div>
        </div>

        <div className="qimen-bucket-grid">
          {referenceBuckets.map((bucket) => (
            <OutlineBucketCard key={bucket.id} bucket={bucket} firstSection={sectionById.get(bucket.sectionIds.find((id) => visibleIds.has(id)) ?? "")} />
          ))}
        </div>

        <div className="qimen-layout">
          <aside className="qimen-outline">
            <div className="section-label">章立て</div>
            <div className="qimen-outline-list">
              {visibleOutline.map((part) => (
                <details className="qimen-outline-part" key={part.id} open>
                  <summary>
                    <strong>{part.title}</strong>
                    <span>
                      {part.pageCount}頁 / {part.chapters.length}章
                    </span>
                  </summary>
                  <div className="qimen-outline-chapters">
                    {part.chapters.map((chapter) => {
                      const firstSection = sectionById.get(chapter.firstSectionId);
                      return (
                        <a className="qimen-outline-chapter" href={`#qimen-${chapter.firstSectionId}`} key={chapter.id}>
                          <strong>{chapter.title}</strong>
                          <span>{chapter.pageCount}頁</span>
                          <small>{firstSection?.excerpt ?? firstSection?.title ?? ""}</small>
                        </a>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </aside>

          <div className="qimen-section-list">
            {filteredSections.length ? (
              filteredSections.map((section, index) => (
                <details className="qimen-section-card" id={`qimen-${section.id}`} key={section.id} open={index < 2 || Boolean(normalizedQuery)}>
                  <summary>
                    <div className="qimen-section-summary">
                      <div className="qimen-section-summary-main">
                        <div className="qimen-section-kind-row">
                          <span className={`qimen-kind qimen-kind-${section.kind}`}>{KIND_LABELS[section.kind]}</span>
                          <span className="qimen-source-id">{section.sourceImage}</span>
                        </div>
                        <strong>{section.title}</strong>
                        <p>{section.excerpt}</p>
                      </div>
                      <div className="qimen-section-summary-meta">
                        <span>{section.breadcrumbs.length ? section.breadcrumbs.join(" / ") : "序文・目次"}</span>
                        <small>{section.id}</small>
                      </div>
                    </div>
                  </summary>
                  <div className="qimen-section-body">
                    <pre>{section.body}</pre>
                  </div>
                </details>
              ))
            ) : (
              <article className="qimen-empty-state">
                <strong>一致する章がありません</strong>
                <p>検索語を変えると、別の章や実例へすぐ移動できます。</p>
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
