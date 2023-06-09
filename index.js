const core = require('@actions/core')
const github = require('@actions/github')
const { Octokit } = require('@octokit/rest')

const owner = github.context.payload.repository.owner.login
const author = github.context.payload.sender.login

const repo = core.getInput('repo_name')
const ghToken = core.getInput('admin_token')
const containerImageTemplate = core.getInput('container_image_template') == "Default" ? "Dockerfile" : core.getInput('container_image_template')

if (!repo.match(/^([a-z0-9]([-a-z0-9]*[a-z0-9])?){1,32}$/)) {
  core.setFailed(`O nome do repositório é inválido: ${repo}`)
}

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
  console.log(`Criando o ambiente ${environment_name} para ${owner}/${repo}`)
  await octokit.rest.repos.createOrUpdateEnvironment({
    owner,
    repo,
    environment_name,
    deployment_branch_policy: null
  })
}

const cloneFile = async (octokit, path, newPath, message) => {
  console.log(`Clonando ${path} de ${owner}/infrastructure-templates para ${newPath} em ${owner}/${repo}`)

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

  await octokit.request(`PUT /repos/${owner}/${repo}/contents/${newPath}`, {
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

const addCollaborator = async (octokit, username, permission) => {
  console.log(`Adicionando ${username} com permissão ${permission} em ${owner}/${repo}`)
  await octokit.request(`PUT /repos/${owner}/${repo}/collaborators/${username}`, {
    permission,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

const createEnvs = async (octokit) => {
  await createEnv(octokit, 'staging')
  await createEnv(octokit, 'homologation')
  await createEnv(octokit, 'production')
  await createEnv(octokit, 'preview-app')
}

const createWorkflowFiles = async (octokit) => {
  await cloneFile(
    octokit,
    `github-cd-workflows-template/build-sync.yaml`,
    `.github/workflows/build-sync.yaml`,
    'Cria o workflow de build & sync'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/production.yaml`,
    `.github/workflows/production.yaml`,
    'Cria o workflow do CD de production'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/staging.yaml`,
    `.github/workflows/staging.yaml`,
    'Cria o workflow do CD de staging'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/homologation.yaml`,
    `.github/workflows/homologation.yaml`,
    'Cria o workflow do CD de homologation'
  )
  await cloneFile(
    octokit,
    `github-cd-workflows-template/preview-apps.yaml`,
    `.github/workflows/preview-apps.yaml`,
    'Cria o workflow do CD de preview-apps'
  )
  await cloneFile(
    octokit,
    `dockerfiles-templates/${containerImageTemplate}`,
    'Dockerfile',
    'Cria dockerfile'
  )
}

const createRepo = async () => {
  try {
    const octokit = new Octokit({ auth: ghToken })

    await requestCreation(octokit)
    await createEnvs(octokit)
    await createWorkflowFiles(octokit)
    await addCollaborator(octokit, author, 'admin')
  }
  catch (error) {
    console.log(error)
    core.setFailed(error.message)
  }
}

createRepo()
