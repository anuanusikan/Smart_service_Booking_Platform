export const DEFAULT_NOTIFICATION_SETTINGS = { bookingAlerts: true, messageAlerts: true, quoteAlerts: true, sound: false };
DEFAULT_NOTIFICATION_SETTINGS.messageSound = false;
export const SETTINGS_EVENT = 'notificationSettingsUpdated';
export const settingsKey = userId => `serviceSync_notif_settings:${userId || 'guest'}`;

export function readNotificationSettings(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey(userId)) || '{}');
    return Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_SETTINGS).map(([key, value]) => [key, typeof saved?.[key] === 'boolean' ? saved[key] : value]));
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export function notificationEnabled(notification, settings) {
  if (['booking_request', 'booking_status'].includes(notification.type)) return settings.bookingAlerts;
  if (['quote_received', 'quote_status'].includes(notification.type)) return settings.quoteAlerts;
  if (notification.type === 'new_message') return false;
  return true;
}

export function hasNewAlert(notifications, seen, settings) {
  if (!seen) return false;
  return notifications.some(item => !item.read && !seen.has(item._id) && notificationEnabled(item, settings));
}
