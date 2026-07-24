function createWaveMarquee(pattern: string, repetitions: number) {
  const segment = pattern.repeat(repetitions);

  return {
    duration: `${repetitions}s`,
    segments: [segment, segment],
  } as const;
}

export const WAVES = createWaveMarquee("~~~~  ", 16);
