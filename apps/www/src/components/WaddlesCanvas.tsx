import { useEffect, useRef, type RefObject } from "react";

const WADDLES_TOP = String.raw`    _`;
const WADDLES_FACE = String.raw`.__(.)<`;
const WADDLES_BODY = String.raw` \___)`;
const WAVE_PATTERN = "~~~~";
const WAVE_CHARACTERS_PER_SECOND = 6;
const WATER_COLOR = "#868686";
const TERMINAL_TITLE = "https://waddles.website";
const TERMINAL_TITLEBAR_COLOR = "#111";
const TERMINAL_BORDER_COLOR = "#2a2a2a";
const TERMINAL_TITLE_COLOR = "#868686";
const TERMINAL_LIGHT_COLORS = ["#ff5f57", "#febc2e", "#28c840"] as const;

interface WaddlesCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  quote: string;
  typedQuote: string;
}

interface SceneState {
  quote: string;
  typedQuote: string;
}

interface QuoteLayout {
  firstLine: string;
  secondLine?: string;
  breakIndex?: number;
  left: number;
}

function drawTerminalChrome(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  headerHeight: number,
  fontFamily: string,
  backgroundColor: string,
  mobile: boolean,
) {
  const lightRadius = mobile ? 4 : 5;
  const lightStart = mobile ? 12 : 16;
  const lightStep = mobile ? 13.5 : 17;

  context.save();
  context.beginPath();
  context.roundRect(0, 0, width, height, 12);
  context.clip();
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);
  context.fillStyle = TERMINAL_TITLEBAR_COLOR;
  context.fillRect(0, 0, width, headerHeight);
  context.restore();

  context.strokeStyle = TERMINAL_BORDER_COLOR;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(0.5, 0.5, width - 1, height - 1, 12);
  context.stroke();
  context.beginPath();
  context.moveTo(0, headerHeight + 0.5);
  context.lineTo(width, headerHeight + 0.5);
  context.stroke();

  TERMINAL_LIGHT_COLORS.forEach((color, index) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(
      lightStart + lightRadius + index * lightStep,
      headerHeight / 2,
      lightRadius,
      0,
      Math.PI * 2,
    );
    context.fill();
  });

  context.fillStyle = TERMINAL_TITLE_COLOR;
  context.font = `11px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(TERMINAL_TITLE, width / 2, headerHeight / 2);
}

function getQuoteLayout(
  context: CanvasRenderingContext2D,
  quote: string,
  canvasWidth: number,
  characterWidth: number,
): QuoteLayout {
  const centeredLeft = (canvasWidth - context.measureText(quote).width) / 2;
  const duckRight = characterWidth * 9;
  const wrappedQuoteLeft = duckRight + characterWidth;

  if (centeredLeft >= wrappedQuoteLeft) {
    return { firstLine: quote, left: centeredLeft };
  }

  const availableWidth = canvasWidth - wrappedQuoteLeft;
  const candidates = [...quote.matchAll(/ /g)]
    .map((match) => {
      const breakIndex = match.index;
      const firstLine = quote.slice(0, breakIndex);
      const secondLine = quote.slice(breakIndex + 1);
      const firstLineWidth = context.measureText(firstLine).width;
      const secondLineWidth = context.measureText(secondLine).width;

      return {
        firstLine,
        secondLine,
        breakIndex,
        widestLine: Math.max(firstLineWidth, secondLineWidth),
        imbalance: Math.abs(firstLineWidth - secondLineWidth),
      };
    })
    .sort(
      (left, right) =>
        left.widestLine +
        left.imbalance * 0.25 -
        (right.widestLine + right.imbalance * 0.25),
    );
  const bestFit =
    candidates.find((candidate) => candidate.widestLine <= availableWidth) ??
    candidates[0];

  if (!bestFit) {
    return { firstLine: quote, left: wrappedQuoteLeft };
  }

  return {
    firstLine: bestFit.firstLine,
    secondLine: bestFit.secondLine,
    breakIndex: bestFit.breakIndex,
    left: wrappedQuoteLeft,
  };
}

export function WaddlesCanvas({
  canvasRef,
  quote,
  typedQuote,
}: WaddlesCanvasProps) {
  const sceneRef = useRef<SceneState>({ quote, typedQuote });

  sceneRef.current = { quote, typedQuote };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resizeCanvas = () => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 3);

      if (
        nextWidth === width &&
        nextHeight === height &&
        nextPixelRatio === pixelRatio
      ) {
        return;
      }

      width = nextWidth;
      height = nextHeight;
      pixelRatio = nextPixelRatio;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
    };

    const draw = (timestamp: number) => {
      resizeCanvas();

      const styles = window.getComputedStyle(canvas);
      const fontSize = Number.parseFloat(styles.fontSize);
      const lineHeight = fontSize * 1.4;
      const font = `${fontSize}px ${styles.fontFamily}`;
      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize,
      );
      const mobile = window.matchMedia("(max-width: 30rem)").matches;
      const headerHeight = rootFontSize * (mobile ? 2.25 : 2.5);
      const scenePadding = Math.max(
        0,
        (height - headerHeight - fontSize * 7) / 2,
      );
      const sceneLeft = scenePadding;
      const sceneTop = headerHeight + scenePadding;
      const sceneWidth = Math.max(0, width - scenePadding * 2);
      const { quote: fullQuote, typedQuote: visibleQuote } = sceneRef.current;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawTerminalChrome(
        context,
        width,
        height,
        headerHeight,
        styles.fontFamily,
        styles.backgroundColor,
        mobile,
      );
      context.font = font;
      context.textAlign = "left";
      context.textBaseline = "alphabetic";

      const characterWidth = context.measureText("0").width;
      const promptBaseline = sceneTop + fontSize;
      const firstBaseline = promptBaseline + lineHeight;

      context.fillStyle = TERMINAL_LIGHT_COLORS[2];
      context.fillText("$", sceneLeft, promptBaseline);
      context.fillStyle = "#fff";
      context.fillText(
        " waddles",
        sceneLeft + characterWidth,
        promptBaseline,
      );

      context.fillStyle = "#faffd3";
      context.fillText(
        WADDLES_TOP,
        sceneLeft + characterWidth * 2,
        firstBaseline,
      );
      context.fillText(
        WADDLES_FACE,
        sceneLeft + characterWidth * 2,
        firstBaseline + lineHeight,
      );
      context.fillText(
        WADDLES_BODY,
        sceneLeft + characterWidth * 2,
        firstBaseline + lineHeight * 2,
      );

      const quoteLayout = getQuoteLayout(
        context,
        fullQuote,
        sceneWidth,
        characterWidth,
      );
      const quoteLeft = sceneLeft + quoteLayout.left;
      const leaderLeft = sceneLeft + characterWidth * 9;
      const leaderWidth = quoteLayout.secondLine
        ? 0
        : Math.max(0, quoteLeft - leaderLeft);

      context.save();
      context.beginPath();
      context.rect(
        leaderLeft,
        sceneTop + lineHeight * 2,
        leaderWidth,
        lineHeight,
      );
      context.clip();
      context.fillStyle = "#677680";
      context.fillText(
        ".".repeat(Math.ceil(leaderWidth / characterWidth) + 1),
        leaderLeft,
        firstBaseline + lineHeight,
      );
      context.restore();

      const visibleFirstLine =
        quoteLayout.breakIndex === undefined
          ? visibleQuote
          : visibleQuote.slice(0, quoteLayout.breakIndex);
      const visibleSecondLine =
        quoteLayout.breakIndex !== undefined &&
        visibleQuote.length > quoteLayout.breakIndex
          ? visibleQuote.slice(quoteLayout.breakIndex + 1)
          : "";

      context.fillStyle = "#fff";
      context.fillText(
        visibleFirstLine,
        quoteLeft,
        firstBaseline + lineHeight,
      );
      if (quoteLayout.secondLine) {
        context.fillText(
          visibleSecondLine,
          quoteLeft,
          firstBaseline + lineHeight * 2,
        );
      }

      const waterTop = sceneTop + lineHeight * 4;
      const waterWidth = sceneWidth;
      const waveOffset = reducedMotionQuery.matches
        ? 0
        : ((timestamp / 1_000) *
            WAVE_CHARACTERS_PER_SECOND *
            characterWidth) %
          (WAVE_PATTERN.length * characterWidth);

      context.save();
      context.beginPath();
      context.rect(sceneLeft, waterTop, waterWidth, lineHeight);
      context.clip();
      context.fillStyle = WATER_COLOR;
      context.fillText(
        WAVE_PATTERN.repeat(
          Math.ceil(
            (waterWidth + waveOffset) /
              (WAVE_PATTERN.length * characterWidth),
          ) + 1,
        ),
        sceneLeft - waveOffset,
        firstBaseline + lineHeight * 3,
      );
      context.restore();

      animationFrameId = window.requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    void document.fonts.ready.then(resizeCanvas);
    animationFrameId = window.requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="waddles-canvas"
      role="img"
      aria-label={`Waddles the duck says ${quote.slice(1, -1)}`}
    >
      Waddles the duck says {quote.slice(1, -1)}
    </canvas>
  );
}
