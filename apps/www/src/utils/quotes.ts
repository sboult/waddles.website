export function getRandomQuote<Quote>(
  quotes: readonly Quote[],
  previousQuote?: Quote,
): Quote {
  if (quotes.length === 0) {
    throw new Error("At least one quote is required");
  }

  const candidates = quotes.filter((quote) => quote !== previousQuote);
  const availableQuotes = candidates.length > 0 ? candidates : quotes;

  const randomIndex = Math.floor(Math.random() * availableQuotes.length);

  return availableQuotes[randomIndex] ?? quotes[0]!;
}
