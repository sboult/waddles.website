/// <reference types="aws-cloudfront-function" />

/**
 * Routes a PR preview host to its isolated S3 prefix and rewrites SPA routes.
 *
 * The CloudFront distribution only accepts *.preview.waddles.website aliases,
 * so the function only needs to validate the pr-<number>.preview host shape.
 *
 * @param {AWSCloudFrontFunction.Event} event CloudFront viewer-request event.
 * @returns {AWSCloudFrontFunction.Request | AWSCloudFrontFunction.Response}
 * Request forwarded to the origin or a not-found response.
 */
function handler(event) {
  const request = event.request;
  const hostHeader = request.headers.host;
  const host = hostHeader && hostHeader.value;
  const hostParts = host ? host.split(".") : [];
  const previewLabel = hostParts[0];

  if (
    hostParts[1] !== "preview" ||
    !previewLabel ||
    !/^pr-\d+$/.test(previewLabel)
  ) {
    return { statusCode: 404, statusDescription: "Not Found" };
  }

  const finalSegment = request.uri.split("/").pop();

  if (request.uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (finalSegment && !finalSegment.includes(".")) {
    request.uri = "/index.html";
  }

  request.uri = `/${previewLabel}${request.uri}`;
  return request;
}
