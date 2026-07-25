export default async function isPreviewPullRequestOpen({
  github,
  context,
}) {
  const pullRequestNumber =
    context.payload.workflow_run.pull_requests[0].number;
  const pullRequest = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
  });

  return pullRequest.data.state === "open" ? "true" : "false";
}
