let context;

export function prepareNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context || context.state === 'closed') context = new AudioContext();
    if (context.state === 'suspended') context.resume().catch(() => {});
  } catch { /* Sound support must not interrupt the app. */ }
}

export function playNotificationSound() {
  prepareNotificationSound();
  if (!context) return;
  const play = () => {
    if (context.state !== 'running') return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.setValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.36);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* A sound failure must not interrupt notifications. */ }
  };
  if (context.state === 'suspended') context.resume().then(play).catch(() => {});
  else play();
}
