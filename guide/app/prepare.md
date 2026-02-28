### Prepare

Add dependencies to package.json
```json
{
  "dependencies": {
    "@cleverjs/backend": "^2.0.0"
  }
}
```

Add a path to tsconfig.json

```json
{
    "paths": {
      "@cleverjs/backend/*": ["./node_modules/@cleverjs/backend/dist/*"]
    }
}
```

create PM2 ecosystem.config.js
```js
module.exports = {
  apps : [{
    name: 'backendJS',
    script: './app/index.ts',
    node_args: '-r tsconfig-paths/register -r dotenv/config',
    interpreter: './node_modules/.bin/ts-node',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
  }]
}
```
