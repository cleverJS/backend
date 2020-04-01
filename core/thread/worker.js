/**
 * Node.js TypeScript #12. Introduction to Worker Threads with TypeScript
 *
 * https://wanago.io/2019/05/06/node-js-typescript-12-worker-threads/
 */

const path = require('path')
const { workerData } = require('worker_threads')

require('ts-node').register()
require(path.resolve(__dirname, workerData.path))
