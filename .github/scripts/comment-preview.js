const marker = "<!-- waddles-preview -->";

export default async function commentPreview({
  github,
  context,
  pullRequestNumber,
}) {
  const previewUrl =
    `https://pr-${pullRequestNumber}.preview.waddles.website`;
  const body = `${marker}\nPreview ready: ${previewUrl}`;
  const comments = await github.paginate(
    github.rest.issues.listComments,
    {
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pullRequestNumber,
    },
  );
  const previous = comments.find(
    (comment) =>
      comment.user?.login === "github-actions[bot]" &&
      comment.body?.includes(marker),
  );

  if (previous) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: previous.id,
      body,
    });
    return;
  }

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequestNumber,
    body,
  });
}
