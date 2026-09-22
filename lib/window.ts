/** Resolve the rental window from URL params, falling back to a sensible default. */
export function resolveWindow(params: {
  from?: string | string[];
  to?: string | string[];
}): { startsAt: string; endsAt: string } {
  const pick = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

  const fallbackStart = new Date();
  fallbackStart.setDate(fallbackStart.getDate() + 3);
  fallbackStart.setHours(9, 0, 0, 0);
  const fallbackEnd = new Date(fallbackStart);
  fallbackEnd.setDate(fallbackEnd.getDate() + 3);

  const rawFrom = pick(params.from);
  const rawTo = pick(params.to);

  const start = rawFrom ? new Date(rawFrom) : fallbackStart;
  const end = rawTo ? new Date(rawTo) : fallbackEnd;

  const validStart = Number.isNaN(start.getTime()) ? fallbackStart : start;
  const validEnd =
    Number.isNaN(end.getTime()) || end <= validStart
      ? new Date(validStart.getTime() + 3 * 86_400_000)
      : end;

  return { startsAt: validStart.toISOString(), endsAt: validEnd.toISOString() };
}

export function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
