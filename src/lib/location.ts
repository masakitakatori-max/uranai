import { LOCATION_OFFSETS } from "./data/core";

export function resolveLocationOffset(locationId: string) {
  const location = LOCATION_OFFSETS.find((candidate) => candidate.id === locationId);
  if (!location) {
    throw new Error(`Unknown locationId: ${locationId}`);
  }

  return location;
}
