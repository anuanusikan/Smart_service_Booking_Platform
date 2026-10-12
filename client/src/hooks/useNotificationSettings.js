import { useEffect, useState } from 'react';
import { readNotificationSettings, settingsKey, SETTINGS_EVENT } from '../utils/notificationSettings';
import { playNotificationSound } from '../utils/notificationSound';

export default function useNotificationSettings(userId) {
  const [settings, setSettings] = useState(() => readNotificationSettings(userId));
  useEffect(() => {
    const sync = () => setSettings(readNotificationSettings(userId));
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  const toggle = key => {
    const current = readNotificationSettings(userId);
    if (!(key in current)) return;
    const updated = { ...current, [key]: !current[key] };
    localStorage.setItem(settingsKey(userId), JSON.stringify(updated));
    setSettings(updated);
    window.dispatchEvent(new Event(SETTINGS_EVENT));
    if (key === 'sound' && updated.sound) playNotificationSound();
  };
  return [settings, toggle];
}
