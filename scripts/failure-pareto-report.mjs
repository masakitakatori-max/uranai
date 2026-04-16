#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const severityWeight = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1,
};

function usage() {
  console.log("Usage: npm run pareto:failures -- <events.json>");
  console.log("Events must be an array of { category, severity, surface, message } objects.");
}

function normalizeSeverity(value) {
  return value in severityWeight ? value : "low";
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  const raw = await readFile(absolutePath, "utf8");
  const events = JSON.parse(raw);

  if (!Array.isArray(events)) {
    throw new Error("The input file must contain a JSON array.");
  }

  const rows = new Map();
  for (const event of events) {
    if (!event?.category) {
      continue;
    }

    const severity = normalizeSeverity(event.severity);
    const weight = severityWeight[severity];
    const existing = rows.get(event.category) ?? {
      category: event.category,
      count: 0,
      weightedScore: 0,
      surfaces: new Set(),
    };

    existing.count += 1;
    existing.weightedScore += weight;
    if (event.surface) {
      existing.surfaces.add(event.surface);
    }
    rows.set(event.category, existing);
  }

  const ranked = Array.from(rows.values()).sort((left, right) => {
    if (right.weightedScore !== left.weightedScore) {
      return right.weightedScore - left.weightedScore;
    }
    return right.count - left.count;
  });

  const total = ranked.reduce((sum, row) => sum + row.weightedScore, 0);
  let cumulative = 0;

  console.log("| category | count | weightedScore | share | cumulative | surfaces |");
  console.log("| --- | ---: | ---: | ---: | ---: | --- |");
  for (const row of ranked) {
    const share = total > 0 ? row.weightedScore / total : 0;
    cumulative += share;
    console.log(
      `| ${row.category} | ${row.count} | ${row.weightedScore} | ${(share * 100).toFixed(1)}% | ${(cumulative * 100).toFixed(1)}% | ${Array.from(row.surfaces).join(", ")} |`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
