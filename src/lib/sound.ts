export const playNotificationSound = () => {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    
    // Create oscillator and gain node
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Create a pleasant "pop/ding" sound
    oscillator.type = "sine";
    
    // Pitch envelope
    oscillator.frequency.setValueAtTime(880, context.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(1760, context.currentTime + 0.08); // A6

    // Volume envelope
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Play
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  } catch (error) {
    console.warn("Không thể phát âm thanh thông báo:", error);
  }
};
