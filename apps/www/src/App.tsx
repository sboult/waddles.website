import type { CSSProperties } from "react";

import { WAVES } from "./utils/waves";

const WADDLES_BEFORE_QUOTE = String.raw`           _
       .__(.)< `;
const WADDLES_QUOTE = "(hello world)";
const WADDLES_AFTER_QUOTE = String.raw`
        \___)`;

export function App() {
  return (
    <main>
      <section className="waddles">
        <h1>World Wide Waddles</h1>
        <pre aria-label="Waddles the duck says hello world">
          <span style={{ color: "#FAFFD3" }}>{WADDLES_BEFORE_QUOTE}</span>
          <span style={{ color: "#fff" }}>{WADDLES_QUOTE}</span>
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
      </section>
    </main>
  );
}
