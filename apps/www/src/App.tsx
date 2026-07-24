import type { CSSProperties } from "react";

import { WAVES } from "./utils/waves";

const WADDLES = String.raw`           _
       .__(.)< (hello world)
        \___)`;

export function App() {
  return (
    <main>
      <section className="waddles">
        <h1>World Wide Waddles</h1>
        <pre aria-label="Waddles the duck says hello world">
          {WADDLES}
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
