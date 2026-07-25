import { ClipboardIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { WaddlesCanvas } from "./components/WaddlesCanvas";
import { Button, buttonVariants } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { PROGRAMMER_QUOTES, WADDLES_INTRO_QUOTE } from "./config/quotes";
import { useTypewriter } from "./hooks/useTypewriter";
import { cn } from "./lib/utils";
import { copySceneToClipboard } from "./utils/clipboard";
import { getRandomQuote } from "./utils/quotes";

const X_SHARE_TEXT = `Check out the waddles.website where you'll find a surfing duck
#Waddles`;
const X_SHARE_URL = `https://x.com/intent/tweet?text=${encodeURIComponent(
  X_SHARE_TEXT,
)}`;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isCopyingRef = useRef(false);
  const [quote, setQuote] = useState(WADDLES_INTRO_QUOTE);
  const quoteText = `(${quote.text})`;
  const typedQuote = useTypewriter(quoteText);

  useEffect(() => {
    if (typedQuote !== quoteText) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setQuote((currentQuote) =>
        getRandomQuote(PROGRAMMER_QUOTES, currentQuote),
      );
    }, quote.holdDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [quote, quoteText, typedQuote]);

  const copyScene = async () => {
    if (!canvasRef.current || isCopyingRef.current) {
      return;
    }

    isCopyingRef.current = true;

    try {
      await copySceneToClipboard(canvasRef.current);
      toast.success("Waddles image copied!", {
        description: "Go share it with the world.",
      });
    } catch (error) {
      toast.error("Couldn’t copy the scene", {
        description:
          error instanceof Error
            ? error.message
            : "Allow clipboard access and try again.",
      });
    } finally {
      isCopyingRef.current = false;
    }
  };

  return (
    <>
      <main>
        <section className="waddles">
          <header className="site-heading">
            <h1>World Wide Waddles</h1>
            <p>The little ASCII duck surfing the web</p>
          </header>
          <WaddlesCanvas
            canvasRef={canvasRef}
            quote={quoteText}
            typedQuote={typedQuote}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={copyScene}
            >
              <ClipboardIcon data-icon="inline-start" />
              Copy as Image
            </Button>
            <a
              href={X_SHARE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Share on X/Twitter"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-primary/50 bg-transparent text-primary hover:border-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              Share on X/Twitter
              <ExternalLinkIcon data-icon="inline-end" />
            </a>
          </div>
          <aside className="migration-log" aria-label="About this website">
            <dl className="migration-log__entries">
              <div>
                <dt>habitat</dt>
                <dd>Hosted on AWS</dd>
              </div>
              <div>
                <dt>built using</dt>
                <dd>
                  <a
                    href="https://aws.amazon.com/products/developer-tools/agent-toolkit-for-aws/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Agent Toolkit for AWS
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </dd>
              </div>
              <div>
                <dt>source</dt>
                <dd>
                  <a
                    href="https://github.com/sboult/waddles.website"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open source
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </main>
      <Toaster position="bottom-center" />
    </>
  );
}
