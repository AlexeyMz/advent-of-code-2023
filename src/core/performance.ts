export function formatElapsedTime(timeSpanMs: number): string {
  return `${(timeSpanMs / 1000).toFixed(6)}s`;
}
