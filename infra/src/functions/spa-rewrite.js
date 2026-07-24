/// <reference types="aws-cloudfront-function" />

/**
 * Rewrites directory and extensionless viewer requests to the SPA entrypoint.
 *
 * @param {AWSCloudFrontFunction.Event} event CloudFront viewer-request event.
 * @returns {AWSCloudFrontFunction.Request} Request forwarded to the origin.
 */
function handler(event) {
  const request = event.request;
  const finalSegment = request.uri.split("/").pop();

  if (request.uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (finalSegment && !finalSegment.includes(".")) {
    request.uri = "/index.html";
  }

  return request;
}
