/**
 * Requires the `@elastic/elasticsearch` peer for types only — the client is injected, so nothing
 * loads it at runtime.
 *
 * Capped at 7.x: `AbstractElasticIndex` imports `@elastic/elasticsearch/api/requestParams` and
 * `/lib/Transport`, neither of which exists in 8.x.
 */
export { AbstractElasticIndex, IndexData } from './AbstractElasticIndex'
