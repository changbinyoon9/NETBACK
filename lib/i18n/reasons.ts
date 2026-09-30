// Fixed English reason strings produced by lib/operations/model.ts (matchFleet)
// and lib/planner.ts (buildPlan) map to dictionary keys here. Any reason not
// in this table (e.g. free-text validation errors) falls back to the raw
// string untranslated rather than being hidden.
const REASON_KEY: Record<string, string> = {
  "Review needed": "reason.reviewNeeded",
  "Unavailable": "reason.unavailable",
  "Already assigned": "reason.alreadyAssigned",
  "Equipment mismatch": "reason.equipmentMismatch",
  "Depth limit": "reason.depthLimit",
  "Weather limit": "reason.weatherLimit",
  "Outside search radius": "reason.outsideRadius",
  "Over budget": "reason.overBudget",
  "Qualification not assumed": "reason.qualificationNotAssumed",
  "Weather hold": "reason.weatherHold",
  "Insufficient evidence": "reason.insufficientEvidence",
  "Depth unavailable": "reason.depthUnavailable",
  "Beyond depth limit": "reason.beyondDepthLimit",
  "No eligible vessel": "reason.noEligibleVessel",
  "Beyond time window": "reason.beyondTimeWindow",
  "Within scenario limits": "reason.withinScenarioLimits",
  "Mission limit reached": "reason.missionLimitReached",
  "Vessel already allocated": "reason.vesselAlreadyAllocated",
  "Remaining budget too low": "reason.budgetTooLow",
};

export function translateReason(t: (key: string) => string, reason: string): string {
  const key = REASON_KEY[reason];
  return key ? t(key) : reason;
}
