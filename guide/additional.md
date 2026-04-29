# Generate RSA-SHA256 for token

In src/configs/keys/default

`openssl genrsa -out rs256 2048`

`openssl rsa -pubout -in rs256 -out rs256.pub`

# Generate Self-signed certificate
In src/configs/keys/https

`openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365`

# Rest API response format

[JSend](https://github.com/omniti-labs/jsend)

# Debug

## WebStorm
Node parameters: `--require ts-node/register --require tsconfig-paths/register`

Working directory: `<PATH TO PROJECT DIRECTORY>`
JavaScript file: `app/index.ts`

# Running tests

Tests run on [Vitest](https://vitest.dev). Some suites need Redis and Elasticsearch — start them with the bundled `docker-compose.yml`:

```sh
docker compose up -d redis elasticsearch
pnpm tests
```

Suites that depend on those services (`tests/cache/CacheRedis.spec.ts`, `tests/db/elasticsearch/AbstractElasticIndex.spec.ts`) are marked `describe.skip` by default — un-skip them locally to exercise the integrations.
