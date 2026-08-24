/**
 * Unified relative-time formatting for every surface ("2 hours ago", "19 days
 * ago", "just now"). Always relative — never a raw absolute date — so the UI
 * reads consistently everywhere.
 */
export function relativeTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return 'just now';
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
