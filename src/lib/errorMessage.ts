export function developmentErrorMessage(summary: string, error: unknown) {
  if (!import.meta.env.DEV || !error) return summary;
  if (error instanceof Error) return `${summary} ${error.message}`;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const details = 'details' in error && typeof error.details === 'string' ? ` (${error.details})` : '';
    return `${summary} ${error.message}${details}`;
  }
  return `${summary} ${String(error)}`;
}
