/**
 * Utility functions for formatting dates, amounts, distances, etc.
 * Supports locale-aware formatting (Chinese and Japanese).
 */

// ─── Date Formatting ─────────────────────────────────────────────────────────

/**
 * Format a date string or Date object to a localized date string.
 * Example: "2024-01-15" → "2024年1月15日"
 */
export function formatDate(date: string | Date, locale: string = 'zh-CN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date string or Date object to a localized date-time string.
 * Example: "2024-01-15T14:30:00Z" → "2024年1月15日 14:30"
 */
export function formatDateTime(date: string | Date, locale: string = 'zh-CN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date to a relative time string (e.g., "3分钟前", "2小时前", "昨天").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;

  return formatDate(d);
}

/**
 * Format a deadline date, showing relative urgency.
 * Example: deadline in 2 hours → "2小时后截止"
 */
export function formatDeadline(deadline: string | Date): string {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (isNaN(d.getTime())) return '';

  const now = Date.now();
  const diffMs = d.getTime() - now;

  if (diffMs <= 0) return '已过期';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) return `${diffMinutes}分钟后截止`;
  if (diffHours < 24) return `${diffHours}小时后截止`;
  if (diffDays === 1) return '明天截止';
  if (diffDays < 7) return `${diffDays}天后截止`;

  return formatDateTime(d);
}

// ─── Amount / Currency Formatting ────────────────────────────────────────────

/**
 * Format a number as currency (CNY by default).
 * Example: 1234.5 → "¥1,234.50"
 */
export function formatAmount(
  amount: number,
  currency: string = 'CNY',
  locale: string = 'zh-CN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a reward amount with a compact display.
 * Example: 50 → "¥50.00", 1234.5 → "¥1,234.50"
 */
export function formatReward(amount: number): string {
  return formatAmount(amount);
}

// ─── Distance Formatting ─────────────────────────────────────────────────────

/**
 * Format a distance in kilometers.
 * - < 1 km: show in meters (e.g., "800m")
 * - >= 1 km: show in km with 1 decimal (e.g., "2.5km")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0) return '';

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  }

  return `${Math.round(distanceKm)}km`;
}

// ─── Text Formatting ─────────────────────────────────────────────────────────

/**
 * Truncate text to a maximum length, appending ellipsis if truncated.
 * Example: truncateText("这是一段很长的描述文字...", 50) → "这是一段很长的描述文字..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ─── Rating Formatting ───────────────────────────────────────────────────────

/**
 * Format a rating to 1 decimal place.
 * Returns '--' when rating is 0 (no reviews yet).
 * Example: 4.567 → "4.6", 0 → "--"
 */
export function formatRating(rating: number | undefined | null): string {
  if (!rating || rating === 0) return '--';
  return rating.toFixed(1);
}

// ─── Phone Number Formatting ─────────────────────────────────────────────────

/**
 * Mask a phone number for display (show first 4 and last 4 digits).
 * Example: "+8613800138000" → "+861****8000"
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 8) return phone;
  const start = phone.slice(0, 4);
  const end = phone.slice(-4);
  return `${start}****${end}`;
}

// ─── File Size Formatting ────────────────────────────────────────────────────

/**
 * Format file size in bytes to a human-readable string.
 * Example: 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
