# ファイル単位の分割計画

このファイルは、書籍準拠アーキテクチャを現行コードからどう分割するかを示す。

## 1. 断易

### 現状
- `src/lib/danneki.ts`
- `src/lib/data/dannekiRules.ts`
- `src/lib/dannekiTrigram.ts`

### 目標分割
- `src/lib/resolvers/danneki/buildDannekiChart.ts`
  - 入力から盤を組み立てる
  - `location`, `manual input`, `date`, `manual overrides` を反映する
- `src/lib/rules/danneki/useGod.ts`
  - 用神候補、世応、原神、忌神、仇神の優先順位
- `src/lib/rules/danneki/najia.ts`
  - 納甲と爻の役割
- `src/lib/rules/danneki/relations.ts`
  - 月破、空亡、日辰冲合、関係線
- `src/lib/explainers/danneki.ts`
  - 盤を説明文に変換する
- `src/lib/traces/danneki.ts`
  - 用神選定や例外の trace を返す

### 残すべき原則
- `findTrigramByLines` は未知パターンで黙って倒さない
- `locationId` の黙殺 fallback を作らない
- 近似は `approximation` として明示する

## 2. 六壬神課

### 現状
- `src/lib/engine.ts`
- `src/lib/sanChuanResolver.ts`
- `src/lib/data/sanChuanLookup.ts`
- `src/lib/data/sanChuanCoverage.ts`

### 目標分割
- `src/lib/resolvers/liuren/buildLiurenChart.ts`
  - 入力、時刻補正、四課、三伝、盤を組み立てる
- `src/lib/rules/liuren/fourLessons.ts`
  - 四課の算出
- `src/lib/rules/liuren/sanChuan.ts`
  - lookup / derived / unresolved の判定
- `src/lib/explainers/liuren.ts`
  - 断定せず、盤の意味を説明する
- `src/lib/traces/liuren.ts`
  - lookup 採用、derived 補完、保留の理由を記録する

### 残すべき原則
- 三伝がないときは代用断定をしない
- `lookup` と `derived` を同格に見せない
- `unresolved` は明示的に止める

## 3. 金口訣

### 現状
- `src/lib/kingoketsu.ts`
- `src/lib/data/kingoketsu.ts`
- `src/lib/data/rules.ts`

### 目標分割
- `src/lib/resolvers/kingoketsu/buildKingoketsuChart.ts`
  - 入力から盤を組み立てる
- `src/lib/rules/kingoketsu/pillars.ts`
  - 年月日時の補正
- `src/lib/rules/kingoketsu/positions.ts`
  - 地分、貴神、将神、人元、用爻
- `src/lib/rules/kingoketsu/states.ts`
  - 旺相休囚死と強弱判定
- `src/lib/rules/kingoketsu/relations.ts`
  - 関係バッジ、冲合刑害破
- `src/lib/explainers/kingoketsu.ts`
  - 盤を説明文に変換する
- `src/lib/traces/kingoketsu.ts`
  - どの画像/表を参照したかを残す

### 残すべき原則
- 近似変換は fallback ではなく近似として記録する
- `未確定` を `旺` に倒さない
- 画像由来の fixture は増やして固定する

## 4. 共通基盤

### 現状
- `src/lib/consultation.ts`
- `src/lib/location.ts`
- `src/lib/seasonalState.ts`
- `src/lib/aiFeedback.ts`
- `src/lib/aiContract.*`

### 目標分割
- `src/lib/core/consultation.ts`
  - 相談文から topic を推定する
- `src/lib/core/location.ts`
  - locationId を厳密に解決する
- `src/lib/core/trace.ts`
  - source / confidence / approximation の型をまとめる
- `src/lib/core/narrative.ts`
  - explanation / interpretation の共通整形

## 5. 実装順

1. `resolver` を先に切る
2. その後に `rules`
3. 最後に `explainer`
4. 旧ファイルは薄い facade にする
5. fixture を増やして回帰を固定する

