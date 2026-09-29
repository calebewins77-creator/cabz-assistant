const UNIT_MS: Record<string, number> = {
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
};

export interface ParsedDuration {
  permanent: boolean;
  ms: number | null;
  label: string;
}

/**
 * Accepts "24h", "7d", "30m", "2w", or "perm"/"permanent". Returns null if unparseable.
 */
export function parseDuration(input: string): ParsedDuration | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "perm" || trimmed === "permanent") {
    return { permanent: true, ms: null, label: "Permanent" };
  }

  const match = trimmed.match(/^(\d+)\s*([a-z]+)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = UNIT_MS[unit];
  if (!unitMs || amount <= 0) return null;

  const ms = amount * unitMs;
  const label = formatDurationLabel(ms);
  return { permanent: false, ms, label };
}

export function formatDurationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(ms / 86_400_000);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(ms / 604_800_000);
  return `${weeks}w`;
}
