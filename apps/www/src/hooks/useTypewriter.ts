import { useEffect, useState } from "react";

const DEFAULT_CHARACTER_DELAY_MS = 65;

export function useTypewriter(
  text: string,
  characterDelayMs = DEFAULT_CHARACTER_DELAY_MS,
) {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setTypedText(text);
      return;
    }

    let characterIndex = 0;
    setTypedText("");

    const intervalId = window.setInterval(() => {
      characterIndex += 1;
      setTypedText(text.slice(0, characterIndex));

      if (characterIndex === text.length) {
        window.clearInterval(intervalId);
      }
    }, characterDelayMs);

    return () => window.clearInterval(intervalId);
  }, [characterDelayMs, text]);

  return typedText;
}
