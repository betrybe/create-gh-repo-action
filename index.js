const core = require('@actions/core')
const github = require('@actions/github')
const { Octokit } = require('@octokit/rest')

// Inputs
const repo = core.getInput('repo_name')
const ghToken = core.getInput('admin_token')

// Fixed
const owner = github.context.payload.repository.owner.login
const techOpsUser = {
  name: 'trybe-tech-ops',
  email: 'trybe-tech-ops@users.noreply.github.com'
}

const createEnv = async (octokit, environment_name) => {
  await octokit.rest.repos.createOrUpdateEnvironment({
    owner,
    repo,
    environment_name,
    deployment_branch_policy: null
  })
}

const cloneFile = async (octokit, path, message) => {
  const fileContent = await octokit.rest.repos.getContent({
    owner,
    repo: 'template-reactjs',
    path,
    ref: 'main',
    mediaType: {
      format: "raw"
    }
  })

  const content = Buffer.from(fileContent.data.replace('APP_NAME', repo)).toString('base64')

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content,
    committer: techOpsUser,
    author: techOpsUser
  })
}

const requestCreation = async (octokit) => {
  await octokit.request(
    `POST /orgs/${owner}/repos`,
    {
      "name": repo,
      "private": true,
      "visibility": "private"
    }
  )

  console.log(`Repo ${owner}/${repo} created successfully!`)
  core.setOutput("repo_url", `https://github.com/${owner}/${repo}`)
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

const createRepo = async () => {
  const octokit = new Octokit({auth: ghToken})

  await requestCreation(octokit)
  await createEnvs(octokit)
  await createWorkflowFiles(octokit)
}

createRepo()