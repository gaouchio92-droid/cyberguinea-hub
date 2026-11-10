export function canExportIocs(count: number, loading: boolean, error: string | null): boolean {
  return count > 0 && !loading && error === null;
}