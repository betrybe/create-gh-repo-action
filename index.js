const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

const owner = github.context.payload.repository.owner.login;
const repo = core.getInput('repo_name');
const ghToken = core.getInput('admin_token');
const techOpsUser = {
  name: 'trybe-tech-ops',
  email: 'trybe-tech-ops@users.noreply.github.com'
}
const client = new GitHubClient(new ProductHeaderValue("create-gh-repo-actions"))
const tokenAuth = new Credentials(ghToken)
client.Credentials = tokenAuth

createEnv = async (environment) => {
  await octokit.rest.repos.createOrUpdateEnvironment({
    owner,
    repo,
    environment,
    deployment_branch_policy: null
  })
}

cloneFile = async (path, message) => {
  const fileContent = await octokit.rest.repos.getContent({
    owner,
    repo: 'infrastructure-templates',
    path,
    ref: 'main'
  });

  octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(fileContent).toString('base64'),
    committer: techOpsUser,
    author: techOpsUser
  })
}

axios({
  method: 'post',
  url: `https://api.github.com/orgs/${repo}/repos`,
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `token ${ghToken}`,
    'Content-Type': 'application/json'
  },
  data : JSON.stringify(
    {
      "name": owner,
      "private": true,
      "visibility": "private"
    }
  )
})
.then(async (response) => {
  console.log(response)
  console.log(`Repo ${repo}/${owner} created successfully!`);
  core.setOutput("repo_url", `https://github.com/${repo}/${owner}`);

  await createEnv('staging')
  await createEnv('homologation')
  await createEnv('production')

  await cloneFile(
    `.github/workflows/build-sync.yaml`,
    'Cria o workflow de build & sync'
  )
  await cloneFile(
    `.github/workflows/production.yaml`,
    'Cria o workflow do CD de production'
  )
  await cloneFile(
    `.github/workflows/staging.yaml`,
    'Cria o workflow do CD de staging'
  )
  await cloneFile(
    `.github/workflows/homologation.yaml`,
    'Cria o workflow do CD de homologation'
  )
  await cloneFile(
    `.github/workflows/preview-apps.yaml`,
    'Cria o workflow do CD de preview-apps'
  )
})
.catch(function (error) {
  core.setOutput("repo_url", "");
  core.setFailed(error.message);
});
