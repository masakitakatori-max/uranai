import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from pypdf import PdfReader

OUTPUT_ROOT = Path('knowledge') / 'taiitsu'
PDF_SOURCE = Path(r'C:/Users/masaki/Downloads/太乙神数入門  測局篇.pdf')
TEXT_FILE = OUTPUT_ROOT / 'taiitsu_taikyo_text_high_precision.txt'
JSON_FILE = OUTPUT_ROOT / 'taiitsuKnowledgeIndex.generated.json'
DATA_FILE = Path('src/lib/data/taiitsuKnowledge.generated.json')

HEADING_RE = re.compile(r'^\u7b2c(?P<num>[0-9\uff10-\uff19\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5341\u5343]+)(?P<kind>\u7ae0|\u7bc0|\u76ee|\u90e8|\u7de8)(?P<title>.*)$')
CONDITION_RE = re.compile(r'(\u6761\u4ef6|\u5224|\u6c42|\u9078|\u53d6|\u5c40|\u5409|\u898b\u65b9|\u5b9a\u7fa9|\u7528)', re.UNICODE)
CHAPTER_ANCHORS = [
    (0, '表紙'),
    (1, 'はじめに'),
    (2, '目録'),
    (4, '現在の日本の社会情勢 なぜいま太乙が必要なのか？'),
    (9, '太乙のテキスト考察'),
    (15, '太乙総論'),
    (25, '演紀 上古の歴元'),
    (30, '三式とは何か？'),
    (47, '太乙の主客の見方'),
    (51, '起例 太乙金鑰匙'),
    (52, '一 太乙の求め方'),
    (64, '二 計神の求め方'),
    (65, '三 文昌の求め方'),
    (66, '四 主大の求め方'),
    (68, '五 主小の求め方'),
    (69, '六 始撃と客大の求め方'),
    (72, '七 客小の求め方'),
    (73, '五福の求め方'),
    (76, '三基の求め方'),
    (82, '定計の求め方'),
    (92, '太乙八門の振り方と見方'),
    (94, '太乙の星曜の見方'),
    (107, '太乙の格局の見方 十凶'),
    (121, '太乙陰陽数の見方'),
    (133, '太乙の測局の方法'),
    (147, '太乙の択時の方法'),
    (148, '太乙の測局占法の実際'),
    (149, '年計七十二局の追跡'),
    (157, 'コロナウィルスの蔓延を太乙で占う'),
    (163, '非常事態宣言の発令日を太乙で占う'),
    (165, 'アウンサンスーチー氏の軍事クーデターを占う'),
    (167, '太乙年計月計の作図例'),
    (171, 'あとがき・参考資料・編集後記'),
    (175, '付録一 太乙原古上下巻目録他重要文面'),
    (202, '付録二 太乙八門開運暦'),
]


def compact_text(value: str) -> str:
    return re.sub(r'\s+', '', value)


def normalize_line(value: str) -> str:
    if not value:
        return ''
    value = value.replace('\u3000', '')
    value = value.replace('\r', '\n')
    value = '\n'.join(part.strip().replace(' ', '') for part in value.split('\n'))
    return value


def normalize_text(value: str) -> str:
    if not value:
        return ''
    value = value.replace('\r', '\n')
    raw_lines = []
    for raw_line in value.split('\n'):
        line = normalize_line(raw_line)
        if line:
            raw_lines.append(line)

    if not raw_lines:
        return ''

    short_line_count = sum(1 for line in raw_lines if len(line) <= 2)
    if short_line_count / max(1, len(raw_lines)) < 0.72:
        return '\n'.join(raw_lines)

    compact = ''.join(raw_lines)
    compact = re.sub(r'([。！？])', r'\1\n', compact)
    compact = re.sub(r'(\d{1,3})(?=(?:現在|太乙|三式|起例|一太乙|二計|三文|四主|五主|六始|七客|五福|三基|定計|年計|コロナ|非常|アウン|あとがき|付録|はじめに|目録))', r'\1\n', compact)

    segments = []
    for part in compact.split('\n'):
        part = part.strip()
        while len(part) > 120:
            segments.append(part[:120])
            part = part[120:]
        if part:
            segments.append(part)
    return '\n'.join(segments)


def estimate_confidence(text: str) -> float:
    if not text:
        return 0
    length = len(text)
    noise = sum(1 for ch in text if ch in '\ufffd' or ord(ch) < 32)
    unicode_like = sum(1 for ch in text if ord(ch) >= 0x4e00 or '\u3040' <= ch <= '\u30ff' or ch.isdigit())
    ratio = max(0.0, min(1.0, (unicode_like + 1) / (length + 1)))
    noise_penalty = min(0.4, noise / max(1, length) * 10)
    return round(max(0.1, ratio - noise_penalty), 3)


def read_pdf(source: Path) -> List[str]:
    reader = PdfReader(str(source))
    return [(page.extract_text() or '') for page in reader.pages]


def parse_printed_page(normalized_page_text: str, fallback: int) -> int:
    match = re.match(r'^(\d{1,3})', compact_text(normalized_page_text))
    if not match:
        return fallback
    return int(match.group(1))


def resolve_chapter(printed_page: int) -> Dict:
    selected_index = 0
    selected_title = CHAPTER_ANCHORS[0][1]
    for index, (page, title) in enumerate(CHAPTER_ANCHORS, start=1):
        if printed_page >= page:
            selected_index = index
            selected_title = title
        else:
            break
    return {
        'id': f'chapter-{selected_index:03d}',
        'title': selected_title,
    }


def infer_section_title(normalized_page_text: str, printed_page: int) -> str:
    body = re.sub(r'^\d{1,3}', '', compact_text(normalized_page_text)).strip()
    if not body:
        return f'p.{printed_page}'
    sentence = re.split(r'[。！？]', body, maxsplit=1)[0]
    return sentence[:42] or f'p.{printed_page}'


def build_entries(page_texts: List[str]):
    entries = []
    for page_index, raw in enumerate(page_texts, start=1):
        body_text = normalize_text(raw).strip()
        printed_page = parse_printed_page(body_text, page_index)
        chapter = resolve_chapter(printed_page)
        section_title = infer_section_title(body_text, printed_page)
        section_id = f"{chapter['id']}-page-{page_index:03d}"
        conditions = sorted({match.group(0) for match in CONDITION_RE.finditer(body_text)}) if body_text else []
        entries.append(
            {
                'entryId': f"{chapter['id']}::{section_id}",
                'chapterId': chapter['id'],
                'chapterTitle': chapter['title'],
                'sectionId': section_id,
                'sectionTitle': section_title,
                'headingKind': '部',
                'pageStart': page_index,
                'pageEnd': page_index,
                'body': body_text,
                'paragraphs': [text for text in body_text.split('\n') if text],
                'conditions': conditions,
                'confidence': estimate_confidence(body_text),
                'textSha1': hashlib.sha1(body_text.encode('utf-8')).hexdigest(),
            }
        )
    return entries


def compute_audit(entries: List[Dict], page_texts: List[str], full_text: str) -> Dict:
    total_pages = len(page_texts)
    empty = sum(1 for entry in entries if not (entry['body'] or '').strip())
    duplicate_ids = []
    seen = set()
    for entry in entries:
        if entry['entryId'] in seen:
            duplicate_ids.append(entry['entryId'])
        seen.add(entry['entryId'])

    with_issue_count = 0
    for entry in entries:
        if entry['confidence'] < 0.2 or len(entry['body']) < 3:
            with_issue_count += 1

    used_pages = {p for entry in entries for p in range(entry['pageStart'], entry['pageEnd'] + 1)}
    missing_pages = [p for p in range(1, len(page_texts) + 1) if p not in used_pages]
    raw_compact = compact_text(full_text)
    structured_text = '\n'.join(entry['body'] for entry in entries if entry.get('body'))
    structured_compact = compact_text(structured_text)
    text_char_count = len(raw_compact)
    structured_char_count = len(structured_compact)

    return {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'pagesScanned': total_pages,
        'entriesCount': len(entries),
        'emptyBodyCount': empty,
        'duplicateEntryIdCount': len(duplicate_ids),
        'lowConfidenceOrShortCount': with_issue_count,
        'missingPageCount': len(missing_pages),
        'missingPages': missing_pages[:120],
        'missingPagesTotal': len(missing_pages),
        'textCharCount': text_char_count,
        'structuredCharCount': structured_char_count,
        'textCoverageRatio': round(structured_char_count / max(1, text_char_count), 4),
        'rawTextSha1': hashlib.sha1(raw_compact.encode('utf-8')).hexdigest(),
        'structuredTextSha1': hashlib.sha1(structured_compact.encode('utf-8')).hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description='Build taiitsu knowledge index from PDF')
    parser.add_argument('--source', default=str(PDF_SOURCE))
    parser.add_argument('--output', default=str(JSON_FILE))
    parser.add_argument('--text-output', default=str(TEXT_FILE))
    parser.add_argument('--copy-to-src', action='store_true')
    args = parser.parse_args()

    source = Path(args.source)
    if not source.exists():
        raise SystemExit(f'Source PDF not found: {source}')

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    json_output = Path(args.output)
    text_output = Path(args.text_output)

    pages = read_pdf(source)
    cleaned_full = []
    for idx, page_text in enumerate(pages, start=1):
        cleaned_full.append(f'\n--- page {idx} ---\n{normalize_text(page_text)}')

    full_text = '\n'.join(cleaned_full).strip()
    text_output.write_text(full_text + '\n', encoding='utf-8')

    entries = build_entries(pages)
    audit = compute_audit(entries, pages, full_text)

    payload = {
        'version': '1.0.0',
        'sourceFile': source.name,
        'sourcePageCount': len(pages),
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'textFile': str(text_output.as_posix()),
        'entries': entries,
        'audit': audit,
    }

    json_output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    if args.copy_to_src:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    print(json.dumps({'pages': len(pages), 'entries': len(entries), 'textFile': str(text_output), 'jsonFile': str(json_output)}))


if __name__ == '__main__':
    main()
