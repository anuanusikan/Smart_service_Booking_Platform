import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NOTIFICATION_SETTINGS as defaults, readNotificationSettings, settingsKey, notificationEnabled, hasNewAlert } from '../src/utils/notificationSettings.js';
import { prepareNotificationSound, playNotificationSound } from '../src/utils/notificationSound.js';

test('preferences are isolated by account and invalid values get safe defaults', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null };
  store.set(settingsKey('p1'), JSON.stringify({ sound: true, quoteAlerts: false, bookingAlerts: 'false' }));
  assert.equal(readNotificationSettings('p1').sound, true);
  assert.equal(readNotificationSettings('p1').quoteAlerts, false);
  assert.equal(readNotificationSettings('p1').bookingAlerts, true);
  assert.deepEqual(readNotificationSettings('p2'), defaults);
  store.set(settingsKey('p1'), 'broken JSON');
  assert.deepEqual(readNotificationSettings('p1'), defaults);
});
test('all booking, quote and chat notification types follow the matching toggle', () => {
  const disabled = { bookingAlerts: false, messageAlerts: false, quoteAlerts: false, sound: true };
  for (const type of ['booking_request', 'booking_status', 'quote_received', 'quote_status', 'new_message']) {
    assert.equal(notificationEnabled({ type }, disabled), false);
    assert.equal(notificationEnabled({ type }, defaults), true);
  }
  assert.equal(notificationEnabled({ type: 'system' }, disabled), true);
});
test('old, read and disabled notifications do not trigger a new-alert chime', () => {
  const alerts = [{ _id: 'q1', type: 'quote_status', read: false }];
  assert.equal(hasNewAlert(alerts, null, defaults), false);
  assert.equal(hasNewAlert(alerts, new Set(['q1']), defaults), false);
  assert.equal(hasNewAlert(alerts, new Set(), { ...defaults, quoteAlerts: false }), false);
  assert.equal(hasNewAlert([{ ...alerts[0], read: true }], new Set(), defaults), false);
  assert.equal(hasNewAlert(alerts, new Set(), defaults), true);
});
test('enabling a category after seeing its alert does not replay it', () => {
  const alert = { _id: 'm1', type: 'new_message', read: false };
  const seen = new Set();
  assert.equal(hasNewAlert([alert], seen, { ...defaults, messageAlerts: false }), false);
  seen.add(alert._id);
  assert.equal(hasNewAlert([alert], seen, defaults), false);
});
test('audio is optional and the chime creates a short, quiet tone', () => {
  globalThis.window = {};
  assert.doesNotThrow(prepareNotificationSound);
  assert.doesNotThrow(playNotificationSound);
  let starts = 0;
  let stops = 0;
  const noop = () => {};
  window.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {};
    createOscillator() { return { frequency: { setValueAtTime: noop }, connect: noop, disconnect: noop, start: () => starts++, stop: time => { assert.ok(time < 1); stops++; } }; }
    createGain() { return { gain: { setValueAtTime: noop, linearRampToValueAtTime: level => assert.ok(level <= 0.1), exponentialRampToValueAtTime: noop }, connect: noop, disconnect: noop }; }
  };
  playNotificationSound();
  assert.equal(starts, 1);
  assert.equal(stops, 1);
});
