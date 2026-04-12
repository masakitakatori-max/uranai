#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path(r"C:\Users\masaki\OneDrive\★画像★\Screenshots 1\六壬神課")
OUTPUT_PATH = ROOT / "src" / "lib" / "data" / "sanChuanLookup.generated.json"

TABLE_FILES = [
    "スクリーンショット 2026-04-08 215927.png",
    "スクリーンショット 2026-04-08 215932.png",
    "スクリーンショット 2026-04-08 215940.png",
    "スクリーンショット 2026-04-08 215948.png",
    "スクリーンショット 2026-04-08 215956.png",
    "スクリーンショット 2026-04-08 220003.png",
    "スクリーンショット 2026-04-08 220009.png",
    "スクリーンショット 2026-04-08 220014.png",
    "スクリーンショット 2026-04-08 220020.png",
    "スクリーンショット 2026-04-08 220026.png",
    "スクリーンショット 2026-04-08 220032.png",
    "スクリーンショット 2026-04-08 220038.png",
    "スクリーンショット 2026-04-08 220044.png",
    "スクリーンショット 2026-04-08 220049.png",
    "スクリーンショット 2026-04-08 220054.png",
    "スクリーンショット 2026-04-08 220059.png",
    "スクリーンショット 2026-04-08 220106.png",
    "スクリーンショット 2026-04-08 220112.png",
    "スクリーンショット 2026-04-08 220117.png",
    "スクリーンショット 2026-04-08 220127.png",
    "スクリーンショット 2026-04-08 220134.png",
    "スクリーンショット 2026-04-08 220141.png",
    "スクリーンショット 2026-04-08 220147.png",
    "スクリーンショット 2026-04-08 220152.png",
    "スクリーンショット 2026-04-08 220158.png",
    "スクリーンショット 2026-04-08 220204.png",
    "スクリーンショット 2026-04-08 220209.png",
    "スクリーンショット 2026-04-08 220215.png",
    "スクリーンショット 2026-04-08 220220.png",
]

MISSING_PAGE_INSERT_AFTER = "スクリーンショット 2026-04-08 220117.png"

MANUAL_ROWS: dict[str, dict[str, dict[str, str]]] = {
    # The screenshot between 220117 and 220127 is missing from the shared folder.
    # The worked example in the text confirms at least this 癸卯 / 辰 row.
    "壬寅": {},
    "癸卯": {
        "辰": {
            "initial": "酉",
            "middle": "子",
            "final": "卯",
            "lessonType": "重審",
        }
    },
}

TABLE_RECTS = {
    "left": (47, 315, 396, 1194),
    "right": (482, 315, 831, 1194),
}

ROW_KEYS = list("子丑寅卯辰巳午未申酉戌亥")
HEADER_HEIGHT = 89
ROW_HEIGHT = 62
KEY_COLUMN_WIDTH = 65
DATA_COLUMN_WIDTH = 71

LESSON_LABELS = ("元首", "重審", "比用", "知一", "伏吟", "返吟", "渉害", "遥剋", "昴星", "別責", "八専")

STEMS = "甲乙丙丁戊己庚辛壬癸"
BRANCHES = "子丑寅卯辰巳午未申酉戌亥"


@dataclass(frozen=True)
class RowRecord:
    upper: str
    initial: str
    middle: str
    final: str
    lesson_type: str


TRAINING_ROWS: dict[tuple[str, str], list[RowRecord]] = {
    ("215927", "right"): [
        RowRecord("子", "戊", "申", "午", "元首"),
        RowRecord("丑", "子", "亥", "戌", "比用"),
        RowRecord("寅", "寅", "巳", "申", "伏吟"),
        RowRecord("卯", "辰", "巳", "午", "重審"),
        RowRecord("辰", "辰", "午", "申", "重審"),
        RowRecord("巳", "申", "亥", "寅", "重審"),
        RowRecord("午", "辰", "申", "子", "元首"),
        RowRecord("未", "子", "巳", "戌", "比用"),
        RowRecord("申", "寅", "申", "寅", "返吟"),
        RowRecord("酉", "寅", "酉", "辰", "知一"),
        RowRecord("戌", "戌", "午", "寅", "重審"),
        RowRecord("亥", "午", "卯", "子", "元首"),
    ],
    ("215927", "left"): [
        RowRecord("子", "巳", "丑", "酉", "元首"),
        RowRecord("丑", "丑", "戌", "未", "重審"),
        RowRecord("寅", "亥", "酉", "未", "重審"),
        RowRecord("卯", "子", "亥", "戌", "重審"),
        RowRecord("辰", "辰", "丑", "戌", "伏吟"),
        RowRecord("巳", "寅", "卯", "辰", "元首"),
        RowRecord("午", "申", "戌", "子", "重審"),
        RowRecord("未", "未", "戌", "丑", "重審"),
        RowRecord("申", "酉", "丑", "巳", "重審"),
        RowRecord("酉", "寅", "未", "子", "重審"),
        RowRecord("戌", "戌", "辰", "戌", "返吟"),
        RowRecord("亥", "卯", "戌", "巳", "比用"),
    ],
    ("215932", "right"): [
        RowRecord("子", "子", "未", "寅", "知一"),
        RowRecord("丑", "戌", "午", "寅", "重審"),
        RowRecord("寅", "亥", "申", "巳", "遥剋"),
        RowRecord("卯", "丑", "亥", "酉", "重審"),
        RowRecord("辰", "子", "亥", "戌", "比用"),
        RowRecord("巳", "巳", "申", "寅", "伏吟"),
        RowRecord("午", "辰", "巳", "午", "重審"),
        RowRecord("未", "辰", "午", "申", "重審"),
        RowRecord("申", "申", "亥", "寅", "重審"),
        RowRecord("酉", "酉", "丑", "巳", "重審"),
        RowRecord("戌", "子", "巳", "戌", "比用"),
        RowRecord("亥", "寅", "申", "寅", "返吟"),
    ],
    ("215932", "left"): [
        RowRecord("子", "巳", "戌", "卯", "重審"),
        RowRecord("丑", "卯", "酉", "卯", "返吟"),
        RowRecord("寅", "戌", "巳", "子", "重審"),
        RowRecord("卯", "未", "卯", "亥", "元首"),
        RowRecord("辰", "子", "酉", "午", "遥剋"),
        RowRecord("巳", "亥", "酉", "未", "渉害"),
        RowRecord("午", "丑", "子", "亥", "重審"),
        RowRecord("未", "卯", "子", "午", "伏吟"),
        RowRecord("申", "辰", "巳", "午", "渉害"),
        RowRecord("酉", "酉", "亥", "丑", "重審"),
        RowRecord("戌", "酉", "子", "卯", "重審"),
        RowRecord("亥", "未", "亥", "卯", "渉害"),
    ],
    ("220158", "right"): [
        RowRecord("子", "戊", "申", "午", "元首"),
        RowRecord("丑", "子", "亥", "戌", "比用"),
        RowRecord("寅", "寅", "巳", "申", "伏吟"),
        RowRecord("卯", "辰", "巳", "午", "重審"),
        RowRecord("辰", "辰", "午", "申", "重審"),
        RowRecord("巳", "申", "亥", "寅", "重審"),
        RowRecord("午", "申", "午", "午", "八専"),
        RowRecord("未", "子", "巳", "戌", "比用"),
        RowRecord("申", "寅", "申", "寅", "返吟"),
        RowRecord("酉", "酉", "辰", "亥", "元首"),
        RowRecord("戌", "戌", "午", "寅", "重審"),
        RowRecord("亥", "丑", "亥", "亥", "八専"),
    ],
    ("220215", "right"): [
        RowRecord("子", "辰", "申", "子", "元首"),
        RowRecord("丑", "卯", "丑", "丑", "八専"),
        RowRecord("寅", "寅", "申", "寅", "返吟"),
        RowRecord("卯", "戌", "巳", "子", "比用"),
        RowRecord("辰", "子", "申", "辰", "重審"),
        RowRecord("巳", "巳", "寅", "亥", "元首"),
        RowRecord("午", "午", "辰", "寅", "元首"),
        RowRecord("未", "酉", "未", "未", "八専"),
        RowRecord("申", "申", "寅", "巳", "伏吟"),
        RowRecord("酉", "亥", "酉", "酉", "八専"),
        RowRecord("戌", "子", "寅", "辰", "重審"),
        RowRecord("亥", "丑", "亥", "亥", "八専"),
    ],
    ("220215", "left"): [
        RowRecord("子", "丑", "卯", "巳", "元首"),
        RowRecord("丑", "卯", "午", "酉", "遥剋"),
        RowRecord("寅", "寅", "午", "戌", "重審"),
        RowRecord("卯", "未", "子", "巳", "渉害"),
        RowRecord("辰", "卯", "酉", "卯", "返吟"),
        RowRecord("巳", "亥", "午", "丑", "重審"),
        RowRecord("午", "巳", "丑", "酉", "知一"),
        RowRecord("未", "午", "卯", "子", "元首"),
        RowRecord("申", "午", "辰", "寅", "元首"),
        RowRecord("酉", "丑", "酉", "酉", "別責"),
        RowRecord("戌", "酉", "戌", "未", "伏吟"),
        RowRecord("亥", "亥", "子", "丑", "重審"),
    ],
    ("220106", "left"): [
        RowRecord("子", "未", "子", "巳", "渉害"),
        RowRecord("丑", "卯", "酉", "卯", "返吟"),
        RowRecord("寅", "亥", "午", "丑", "重審"),
        RowRecord("卯", "巳", "丑", "酉", "元首"),
        RowRecord("辰", "午", "卯", "子", "元首"),
        RowRecord("巳", "丑", "巳", "巳", "別責"),
        RowRecord("午", "申", "未", "午", "遥剋"),
        RowRecord("未", "酉", "未", "丑", "伏吟"),
        RowRecord("申", "丑", "子", "丑", "比用"),
        RowRecord("酉", "酉", "亥", "丑", "重審"),
        RowRecord("戌", "子", "卯", "午", "遥剋"),
        RowRecord("亥", "亥", "卯", "未", "元首"),
    ],
}


def sexagenary_cycle() -> list[str]:
    cycle = []
    for index in range(60):
        cycle.append(STEMS[index % 10] + BRANCHES[index % 12])
    return cycle


def normalize_lesson_name(raw: str) -> str:
    raw = raw.replace("渉", "渉").replace("涉", "渉")
    raw = raw.replace("遥", "遥").replace("遙", "遥")
    raw = raw.replace("専", "専").replace("專", "専")
    if raw not in LESSON_LABELS:
        raise ValueError(f"Unknown lesson label: {raw}")
    return raw


def load_page(page_name: str) -> Image.Image:
    return Image.open(SOURCE_DIR / page_name).convert("L")


def crop_table(page_image: Image.Image, side: str) -> Image.Image:
    return page_image.crop(TABLE_RECTS[side])


def crop_cell(table: Image.Image, row_index: int, column_index: int) -> np.ndarray:
    y0 = HEADER_HEIGHT + row_index * ROW_HEIGHT
    x0 = KEY_COLUMN_WIDTH + column_index * DATA_COLUMN_WIDTH
    cell = table.crop((x0, y0, x0 + DATA_COLUMN_WIDTH, y0 + ROW_HEIGHT))
    cell = cell.crop((5, 4, DATA_COLUMN_WIDTH - 5, ROW_HEIGHT - 4))
    cell = ImageOps.autocontrast(cell)
    cell = cell.resize((64, 64))
    return np.array(cell, dtype=np.float32)


def collect_templates():
    branch_templates: list[tuple[str, np.ndarray]] = []
    lesson_templates: list[tuple[str, np.ndarray]] = []

    for (page_key, side), rows in TRAINING_ROWS.items():
        page_image = load_page(f"スクリーンショット 2026-04-08 {page_key}.png")
        table = crop_table(page_image, side)
        for row_index, row in enumerate(rows):
            branch_templates.append((row.initial, crop_cell(table, row_index, 0)))
            branch_templates.append((row.middle, crop_cell(table, row_index, 1)))
            branch_templates.append((row.final, crop_cell(table, row_index, 2)))
            lesson_templates.append((normalize_lesson_name(row.lesson_type), crop_cell(table, row_index, 3)))
    return branch_templates, lesson_templates


def predict_label(cell_array: np.ndarray, templates: list[tuple[str, np.ndarray]]) -> str:
    best_score = None
    best_label = None
    for label, template in templates:
        score = float(np.mean(np.abs(cell_array - template)))
        if best_score is None or score < best_score:
            best_score = score
            best_label = label
    assert best_label is not None
    return best_label


def generate_lookup() -> dict[str, dict[str, dict[str, str]]]:
    branch_templates, lesson_templates = collect_templates()
    cycle = sexagenary_cycle()
    lookup: dict[str, dict[str, dict[str, str]]] = {}
    cycle_index = 0
    for page_name in TABLE_FILES:
        page_image = load_page(page_name)
        page_days = {"right": cycle[cycle_index], "left": cycle[cycle_index + 1]}
        for side in ("right", "left"):
            table = crop_table(page_image, side)
            day_key = page_days[side]
            lookup[day_key] = {}
            for row_index, upper in enumerate(ROW_KEYS):
                initial = predict_label(crop_cell(table, row_index, 0), branch_templates)
                middle = predict_label(crop_cell(table, row_index, 1), branch_templates)
                final = predict_label(crop_cell(table, row_index, 2), branch_templates)
                lesson_type = predict_label(crop_cell(table, row_index, 3), lesson_templates)
                lookup[day_key][upper] = {
                    "initial": initial,
                    "middle": middle,
                    "final": final,
                    "lessonType": lesson_type,
                }
        cycle_index += 2
        if page_name == MISSING_PAGE_INSERT_AFTER:
            cycle_index += 2

    for day_key, rows in MANUAL_ROWS.items():
        lookup.setdefault(day_key, {}).update(rows)

    return lookup


def main() -> None:
    lookup = generate_lookup()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(lookup, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"generated {OUTPUT_PATH}")
    print(f"days={len(lookup)} rows={sum(len(rows) for rows in lookup.values())}")


if __name__ == "__main__":
    main()
