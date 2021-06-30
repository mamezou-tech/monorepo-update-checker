const core = require('@actions/core');
const github = require('@actions/github');
const checker = require('./update-checker.js');

const input = {
  projectPaths: core.getMultilineInput('projectPaths'),
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  eventName: github.context.eventName,
  commit_sha: github.context.sha,
};

(async function (input) {
  const result = await checker.check(input);
  core.setOutput('results', result);
})(input);
