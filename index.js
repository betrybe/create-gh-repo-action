const core = require('@actions/core')
const github = require('@actions/github')
const { Octokit } = require('@octokit/rest')

const repo = core.getInput('repo_name')
const ghToken = core.getInput('admin_token')
const containerImageTemplate = core.getInput('container_image_template') == "Default" ? "Dockerfile" : core.getInput('container_image_template')

const owner = github.context.payload.repository.owner.login

const requestCreation = async (octokit) => {
  await octokit.request(
    `POST /orgs/${owner}/repos`,
    {
      name: repo,
      'private': true,
      auto_init: true,
      delete_branch_on_merge: true,
      visibility: 'private'
    }
  )

  console.log(`Repo ${owner}/${repo} created successfully!`)
  core.setOutput("repo_url", `https://github.com/${owner}/${repo}`)
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
    repo: 'infrastructure-templates',
    path,
    ref: 'main',
    mediaType: {
      format: "raw"
    }
  })

  const content = Buffer.from(fileContent.data.replace('APP_NAME', repo)).toString('base64')

  await octokit.request(`PUT /repos/${owner}/${repo}/contents/${path}`, {
    owner,
    repo,
    path,
    message,
    content,
    committer: {
      name: 'trybe-tech-ops',
      email: 'trybe-tech-ops@users.noreply.github.com'
    },
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

const createEnvs = async (octokit) => {
  await createEnv(octokit, 'staging')
  await createEnv(octokit, 'homologation')
  await createEnv(octokit, 'production')
}

const createWorkflowFiles = async (octokit) => {
  await cloneFile(
    octokit,
    `github-cd-workflows-template/build-sync.yaml`,
    'Cria o workflow de build & sync'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/production.yaml`,
    'Cria o workflow do CD de production'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/staging.yaml`,
    'Cria o workflow do CD de staging'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/homologation.yaml`,
    'Cria o workflow do CD de homologation'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/preview-apps.yaml`,
    'Cria o workflow do CD de preview-apps'
  )
  await cloneFile(
    octokit,
    `dockerfiles-templates/${containerImageTemplate}`,
    'Cria dockerfile'
  )
}

const createRepo = async () => {
  const octokit = new Octokit({auth: ghToken})

  await requestCreation(octokit)
  await createEnvs(octokit)
  await createWorkflowFiles(octokit)
}

createRepo()
