import type { SeasonalState, Wuxing } from "./types";

export function requireSeasonalState(stateMap: ReadonlyMap<Wuxing, SeasonalState>, element: Wuxing, label: string) {
  const state = stateMap.get(element);
  if (!state) {
    throw new Error(`Missing seasonal state for ${label}: ${element}`);
  }

  return state;
}
