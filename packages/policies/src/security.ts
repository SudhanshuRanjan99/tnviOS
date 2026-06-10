export function filterFields<RecordType extends Record<string, unknown>>(
  record: RecordType,
  allowedFields: readonly string[],
): Partial<RecordType> {
  const allowed = new Set(allowedFields);
  return Object.fromEntries(
    Object.entries(record).filter(([field]) => allowed.has(field)),
  ) as Partial<RecordType>;
}

export function filterRecords<RecordType>(
  records: readonly RecordType[],
  canRead: (record: RecordType) => boolean,
): RecordType[] {
  return records.filter(canRead);
}
