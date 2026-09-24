export function latestSentQuotePerFamily<T extends {
  id: string;
  rootQuoteId: string | null;
  revisionNumber: number;
  deliveryAttempts: Array<{ sentAt: Date }>;
}>(rows: T[], limit: number): T[] {
  const latestByFamily = new Map<string, T>();
  for (const row of rows) {
    const familyId = row.rootQuoteId ?? row.id;
    const previous = latestByFamily.get(familyId);
    if (!previous || row.revisionNumber > previous.revisionNumber) {
      latestByFamily.set(familyId, row);
    }
  }
  return [...latestByFamily.values()]
    .sort((a, b) => (b.deliveryAttempts[0]?.sentAt.getTime() ?? 0) - (a.deliveryAttempts[0]?.sentAt.getTime() ?? 0))
    .slice(0, limit);
}
