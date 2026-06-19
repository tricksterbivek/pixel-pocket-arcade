import { describe, expect, it } from 'vitest';
import { audio } from './audio';

// jsdom does not implement Web Audio, so the service must degrade gracefully
// and never throw. (Real sound output is verified manually in a browser.)
describe('audio service', () => {
  it('reports unsupported under jsdom and never throws on play', () => {
    expect(audio.isSupported()).toBe(false);
    expect(() => audio.play('select')).not.toThrow();
    expect(() => audio.play('error')).not.toThrow();
    expect(() => audio.unlock()).not.toThrow();
  });

  it('respects the enabled flag', () => {
    audio.setEnabled(false);
    expect(audio.isEnabled()).toBe(false);
    expect(() => audio.play('score')).not.toThrow();
    audio.setEnabled(true);
    expect(audio.isEnabled()).toBe(true);
  });
});
