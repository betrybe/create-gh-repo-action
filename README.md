# Create Github Repository

Action que cria um novo repositório no github com 4 ambientes e com worfklows de CD.

Usada quando uma nova aplicação é criada no https://github.com/betrybe/infrastructure-projects

- Cria um repositório de mesmo nome do projeto
- Cria 4 ambientes para secrets e variáveis (leia mais [aqui](https://docs.github.com/pt/actions/deployment/targeting-different-environments/using-environments-for-deployment))
  - `staging`
  - `homologation`
  - `production`
  - `preview-app`
- Cria os workflows de CD (delivery & deployment)
  - `build-sync.yaml`
  - `staging.yaml`
  - `homologation.yaml`
  - `preview-apps.yaml`
  - `production.yaml`


## Development

⚠️ Github actions will run `dist/index.js` to execute this action, so this repo has a git hook `pre-commit` that automatically *runs* `npm run pack` and add to commit the changes made at `dist/index.js` to apply any changes. ⚠️

Install the dependencies
```bash
$ npm install
```
