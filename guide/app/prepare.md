### Prepare

Add dependencies to package.json
```json
{
  "dependencies": {
    "cleverJS": "github:cleverJS/backend#1.4.3"
  }
}
```

Add a path and include to tsconfig.json

```json
{
    "paths": {
      "cleverJS/*": ["./node_modules/cleverJS/build/*"]
    },
    
    "include": ["node_modules/cleverJS/**/*"]
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
