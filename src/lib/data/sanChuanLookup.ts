import sanChuanLookupRaw from "./sanChuanLookup.generated.json";
import type { Branch, Ganzhi, SanChuanRow } from "../types";

export type SanChuanLookup = Partial<Record<Ganzhi, Partial<Record<Branch, SanChuanRow>>>>;

export const SAN_CHUAN_LOOKUP = sanChuanLookupRaw as SanChuanLookup;
