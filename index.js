const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const { Octokit } = require('@octokit/rest')
const { createTokenAuth } = require('@octokit/auth-token')

// Inputs
const repo = core.getInput('repo_name');
const ghToken = core.getInput('admin_token');

// Fixed
const owner = github.context.payload.repository.owner.login;
const techOpsUser = {
  name: 'trybe-tech-ops',
  email: 'trybe-tech-ops@users.noreply.github.com'
}

const createEnv = async (octokit, environment) => {
  await octokit.rest.repos.createOrUpdateEnvironment({
    owner,
    repo,
    environment,
    deployment_branch_policy: null
  })
}

const cloneFile = async (octokit, path, message) => {
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

const createRepoRequest = async () => {
  const res = await axios({
    method: 'post',
    url: `https://api.github.com/orgs/${repo}/repos`,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${ghToken}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(
      {
        "name": owner,
        "private": true,
        "visibility": "private"
      }
    )
  })

  console.log('Request reponse', res)

  console.log(`Repo ${repo}/${owner} created successfully!`);
  core.setOutput("repo_url", `https://github.com/${repo}/${owner}`);
}

const createEnvs = async (octokit) => {
  await createEnv(octokit, 'staging')
  await createEnv(octokit, 'homologation')
  await createEnv(octokit, 'production')
}

const createWorkflowFiles = async (octokit) => {
  await cloneFile(
    octokit,
    `.github/workflows/build-sync.yaml`,
    'Cria o workflow de build & sync'
  )
  await cloneFile(
    octokit,
    `.github/workflows/production.yaml`,
    'Cria o workflow do CD de production'
  )
  await cloneFile(
    octokit,
    `.github/workflows/staging.yaml`,
    'Cria o workflow do CD de staging'
  )
  await cloneFile(
    octokit,
    `.github/workflows/homologation.yaml`,
    'Cria o workflow do CD de homologation'
  )
  await cloneFile(
    octokit,
    `.github/workflows/preview-apps.yaml`,
    'Cria o workflow do CD de preview-apps'
  )
}

const run = async () => {
  const auth = createTokenAuth(ghToken)
  const octokit = new Octokit()
  octokit.auth = auth;

  createRepoRequest(octokit)
  createEnvs(octokit)
  createWorkflowFiles(octokit)
}

run()