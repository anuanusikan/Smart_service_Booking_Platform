import { useEffect, useState } from 'react';
import { readNotificationSettings, settingsKey, SETTINGS_EVENT } from '../utils/notificationSettings';
import { playNotificationSound } from '../utils/notificationSound';
import { authApi } from '../services/api';

const accounts = new Map();
const announce = () => window.dispatchEvent(new Event(SETTINGS_EVENT));
function account(userId) {
  const token = sessionStorage.getItem('token');
  if (!accounts.has(userId) || accounts.get(userId).token !== token) {
    accounts.set(userId, { token, version: 0, pending: 0, pulling: false, ready: false, error: '', queue: Promise.resolve() });
  }
  return accounts.get(userId);
}
function current(state) { return sessionStorage.getItem('token') === state.token; }
function cache(userId, settings) {
  localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
  announce();
}
async function pull(userId, state) {
  if (!userId || !state.token || !current(state) || state.pending || state.pulling) return;
  state.pulling = true;
  const version = state.version;
  try {
    let data = await authApi.getNotificationSettings();
    if (!current(state) || state.version !== version) return;
    if (!data || !Object.hasOwn(data, 'settings')) throw new Error('Could not sync preferences. Please check your connection.');
    if (data.settings === null) {
      const result = await authApi.saveNotificationSettings(readNotificationSettings(userId), true);
      if (!result.ok) throw new Error(result.data?.message || 'Could not save preferences.');
      data = result.data;
    }
    if (!current(state) || state.version !== version) return;
    state.ready = true;
    state.error = '';
    cache(userId, data.settings);
  } catch (err) {
    if (current(state) && state.version === version) { state.error = err.message; announce(); }
  } finally { state.pulling = false; }
}

export default function useNotificationSettings(userId) {
  const [settings, setSettings] = useState(() => readNotificationSettings(userId));
  const [syncStatus, setSyncStatus] = useState('Syncing preferences…');
  useEffect(() => {
    const state = account(userId);
    const sync = () => {
      setSettings(readNotificationSettings(userId));
      setSyncStatus(state.error || (state.pending ? 'Saving preferences…' : state.ready ? 'Preferences synced to your account' : 'Syncing preferences…'));
    };
    const refresh = () => { if (document.visibilityState !== 'hidden') pull(userId, state); };
    sync();
    refresh();
    const interval = setInterval(refresh, 15000);
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId]);

  const toggle = key => {
    const state = account(userId);
    const previous = readNotificationSettings(userId);
    if (!userId || !state.token || !Object.hasOwn(previous, key)) return;
    if (!state.ready) { pull(userId, state); return; }
    const value = !previous[key];
    const version = ++state.version;
    state.pending += 1;
    state.error = '';
    cache(userId, { ...previous, [key]: value });
    if ((key === 'sound' || key === 'messageSound') && value) playNotificationSound();
    state.queue = state.queue.then(async () => {
      try {
        if (!current(state)) return;
        const result = await authApi.saveNotificationSettings({ [key]: value });
        if (!current(state)) return;
        if (!result.ok) throw new Error(result.data?.message || 'Could not save preferences.');
        state.ready = true;
        if (state.version === version) cache(userId, result.data.settings);
      } catch (err) {
        if (current(state)) {
          state.error = err.message;
          if (state.version === version) cache(userId, previous);
        }
      } finally {
        state.pending -= 1;
        if (current(state)) announce();
      }
    });
  };
  return [settings, toggle, syncStatus];
}
