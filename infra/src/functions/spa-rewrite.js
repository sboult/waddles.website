/// <reference types="aws-cloudfront-function" />

/**
 * Redirects www requests to the apex host and rewrites SPA viewer requests.
 *
 * @param {AWSCloudFrontFunction.Event} event CloudFront viewer-request event.
 * @returns {AWSCloudFrontFunction.Request | AWSCloudFrontFunction.Response}
 * Request forwarded to the origin or a permanent redirect response.
 */
function handler(event) {
  const request = event.request;
  const hostHeader = request.headers.host;
  const host = hostHeader && hostHeader.value;

  if (host && host.indexOf("www.") === 0) {
    const queryString = request.rawQueryString();
    const query = queryString === undefined ? "" : `?${queryString}`;

    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: {
          value: `https://${host.slice(4)}${request.uri}${query}`,
        },
      },
    };
  }

  const finalSegment = request.uri.split("/").pop();

  if (request.uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (finalSegment && !finalSegment.includes(".")) {
    request.uri = "/index.html";
  }

  return request;
}
