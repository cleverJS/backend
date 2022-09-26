module.exports = {
  apps: [
    {
      name: 'ts-node-config',
      interpreter: './node_modules/.bin/ts-node',
      interpreter_args: ['--require=tsconfig-paths/register', '--require=dotenv/config', '-T'],
      script: './app/index.ts',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      source_map_support: false,
      env: {
        NODE_ENV: 'development',
        TS_NODE_PROJECT: './tsconfig.prod.json',
      },
      env_production: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: './tsconfig.prod.json',
      },
      env_stage: {
        NODE_ENV: 'stage',
        TS_NODE_PROJECT: './tsconfig.prod.json',
      },
    },
  ],
}
