const GOOGLE_ANALYTICS_ID = "G-6VJ2G0S7NW";

declare global {
  interface Window {
    dataLayer: IArguments[];
    gtag: (...args: unknown[]) => void;
  }
}

export function initializeAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`;
  document.head.append(script);
}
