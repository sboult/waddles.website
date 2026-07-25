const MAX_QUOTE_WORDS = 5;
const MINIMUM_HOLD_DURATION_MS = 1_600;
const HOLD_DURATION_PER_CHARACTER_MS = 45;

export interface Quote {
  text: string;
  holdDurationMs: number;
}

function defineQuote(
  text: string,
  holdDurationMs = MINIMUM_HOLD_DURATION_MS +
    text.length * HOLD_DURATION_PER_CHARACTER_MS,
): Quote {
  const wordCount = text.trim().split(/\s+/).length;

  if (wordCount > MAX_QUOTE_WORDS) {
    throw new Error(`Quotes cannot exceed ${MAX_QUOTE_WORDS} words: "${text}"`);
  }

  return { text, holdDurationMs };
}

export const WADDLES_INTRO_QUOTE = defineQuote("Hi I'm Waddles", 2_200);

export const PROGRAMMER_QUOTES = [
  defineQuote("hello world"),
  defineQuote("works on my machine"),
  defineQuote("one more commit"),
  defineQuote("ship it"),
  defineQuote("tests are green"),
  defineQuote("it compiles"),
  defineQuote("LGTM"),
  defineQuote("cache you later"),
  defineQuote("no bugs, only features"),
  defineQuote("deploy first, debug later"),
  defineQuote("commit happens"),
  defineQuote("merge happens"),
  defineQuote("trust the compiler"),
  defineQuote("read the logs"),
  defineQuote("check the stack trace"),
  defineQuote("blame the cache"),
  defineQuote("clear the cache"),
  defineQuote("restart fixes everything"),
  defineQuote("sudo make it work"),
  defineQuote("git push and pray"),
  defineQuote("force push responsibly"),
  defineQuote("rebase before breakfast"),
  defineQuote("squash it clean"),
  defineQuote("mind the merge conflict"),
  defineQuote("branches need pruning"),
  defineQuote("main is protected"),
  defineQuote("production is sacred"),
  defineQuote("staging is haunted"),
  defineQuote("localhost never lies"),
  defineQuote("DNS strikes again"),
  defineQuote("probably DNS"),
  defineQuote("always DNS"),
  defineQuote("blame the network"),
  defineQuote("check your ports"),
  defineQuote("inspect the payload"),
  defineQuote("validate your inputs"),
  defineQuote("sanitize everything"),
  defineQuote("parse, don't guess"),
  defineQuote("types save lives"),
  defineQuote("types are documentation"),
  defineQuote("null strikes again"),
  defineQuote("undefined behavior detected"),
  defineQuote("off by one"),
  defineQuote("zero indexed forever"),
  defineQuote("loops need exits"),
  defineQuote("recursion needs faith"),
  defineQuote("stack overflow incoming"),
  defineQuote("memory leak detected"),
  defineQuote("garbage collector knows"),
  defineQuote("allocate with purpose"),
  defineQuote("release the lock"),
  defineQuote("avoid shared state"),
  defineQuote("state is complicated"),
  defineQuote("immutable feels safer"),
  defineQuote("name things carefully"),
  defineQuote("naming is debugging"),
  defineQuote("comments can lie"),
  defineQuote("code tells stories"),
  defineQuote("delete dead code"),
  defineQuote("less code, fewer bugs"),
  defineQuote("keep functions tiny"),
  defineQuote("compose, don't inherit"),
  defineQuote("abstractions have rent"),
  defineQuote("premature abstraction hurts"),
  defineQuote("optimize after measuring"),
  defineQuote("benchmark before bragging"),
  defineQuote("profile the bottleneck"),
  defineQuote("latency is a feature"),
  defineQuote("fast enough ships"),
  defineQuote("async all the things"),
  defineQuote("await your promises"),
  defineQuote("promises were made"),
  defineQuote("race condition won"),
  defineQuote("deadlock says hello"),
  defineQuote("queues bring order"),
  defineQuote("events tell stories"),
  defineQuote("streams keep flowing"),
  defineQuote("backpressure is real"),
  defineQuote("retry with jitter"),
  defineQuote("exponential backoff activated"),
  defineQuote("idempotency saves weekends"),
  defineQuote("automate the boring parts"),
  defineQuote("scripts beat checklists"),
  defineQuote("CI is watching"),
  defineQuote("build failed successfully"),
  defineQuote("red build bad"),
  defineQuote("flaky tests detected"),
  defineQuote("test the happy path"),
  defineQuote("test the sad path"),
  defineQuote("mocks have opinions"),
  defineQuote("fixtures need love"),
  defineQuote("coverage isn't confidence"),
  defineQuote("reproduce before fixing"),
  defineQuote("debug with evidence"),
  defineQuote("logs or it didn't happen"),
  defineQuote("observability earns sleep"),
  defineQuote("alerts need context"),
  defineQuote("pager says hello"),
  defineQuote("rollback is a feature"),
  defineQuote("F*** it, I'm deploying today"),
] as const satisfies readonly Quote[];
