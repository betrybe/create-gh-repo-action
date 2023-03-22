const core = require('@actions/core')
const github = require('@actions/github')
const { Octokit } = require('@octokit/rest')

// Inputs
const repo = core.getInput('repo_name')
const ghToken = core.getInput('admin_token')

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

const createRepoRequest = async (octokit) => {
  await octokit.request(
    `POST /https://api.github.com/orgs/${repo}/repos`,
    {
      "name": owner,
      "private": true,
      "visibility": "private"
    }
  )

  console.log(`Repo ${owner}/${repo} created successfully!`);
  core.setOutput("repo_url", `https://github.com/${owner}/${repo}`);
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
  const octokit = new Octokit({auth: ghToken})

  await createRepoRequest(octokit)
  await createEnvs(octokit)
  await createWorkflowFiles(octokit)
}

run()