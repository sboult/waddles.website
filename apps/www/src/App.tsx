import { useEffect, useState, type CSSProperties } from "react";

import { PROGRAMMER_QUOTES, WADDLES_INTRO_QUOTE } from "./config/quotes";
import { useTypewriter } from "./hooks/useTypewriter";
import { getRandomQuote } from "./utils/quotes";
import { WAVES } from "./utils/waves";

const WADDLES_BEFORE_QUOTE = String.raw`           _
       .__(.)< `;
const WADDLES_AFTER_QUOTE = String.raw`
        \___)`;

export function App() {
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

  return (
    <main>
      <section className="waddles">
        <h1>World Wide Waddles (test)</h1>
        <pre aria-label={`Waddles the duck says ${quote.text}`}>
          <span style={{ color: "#FAFFD3" }}>{WADDLES_BEFORE_QUOTE}</span>
          <span style={{ color: "#fff" }} aria-hidden="true">
            {typedQuote}
          </span>
          <span style={{ color: "#FAFFD3" }}>{WADDLES_AFTER_QUOTE}</span>
          {"\n"}
          <span className="water" aria-hidden="true">
            <span
              className="water-track"
              style={{ "--wave-duration": WAVES.duration } as CSSProperties}
            >
              {WAVES.segments.map((wave, index) => (
                <span className="water-segment" key={index}>
                  {wave}
                </span>
              ))}
            </span>
          </span>
        </pre>
        <aside className="migration-log" aria-label="About this website">
          <p className="migration-log__title">waddles://surf</p>
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
  );
}
