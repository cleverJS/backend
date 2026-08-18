/**
 * Package root — peer-free. Anything needing an optional peer lives behind its own entry point;
 * see the entry point table in README.md.
 */

// Service
export { AbstractService } from './AbstractService'

// Entity
export { AbstractEntity, IEntity } from './entity/AbstractEntity'
export { EntityFactory, IEntityFactory } from './entity/EntityFactory'

// Database - Condition
export {
  Condition,
  TConditionOperator,
  IConditionItemList,
  IConditionItem,
  TConditionSimple,
  TConditionBetween,
  TConditionIN,
  TConditionLike,
  TConditionNull,
  TSortDirection,
  TConditionLogic,
} from './db/Condition'
export { ErrorCondition } from './db/errors/ErrorCondition'

// Cache
export { Cache } from './cache/Cache'
export { CacheAdapterInterface } from './cache/adapters/CacheAdapterInterface'
export { CacheAdapterNull } from './cache/adapters/CacheAdapterNull'
export { CacheAdapterRuntime } from './cache/adapters/CacheAdapterRuntime'

// HTTP
export { HttpServer, THttpRoute, THttpMethod } from './http/HttpServer'
export { IHttpServerConfig } from './http/config'
export { RequestCancel } from './http/client/RequestCancel'

// WebSocket - wire protocol
export { WSRequest, IWSRequest, IWSRequestHeader } from './ws/WSRequest'
export { WSResponse, EWSResponseType, IWSResponseHeader, IWSResponse } from './ws/WSResponse'
export { IWSConfig } from './ws/config'

// Decorators
export { route, routes } from './decorators/routes'

// Logger
export { Logger, logger, loggerNamespace, ILoggerWrapper } from './logger/logger'
export { LoggerContainer } from './logger/LoggerContainer'
export { ILoggerConfig } from './logger/config'
export { LogLevel, TransportInterface } from './logger/transport/TransportInterface'
export { TransportConsole } from './logger/transport/TransportConsole'
export { argsStringify, createArgsStringify, ARGS_STRINGIFY_LIMITS, IArgsStringifyLimits } from './logger/argsStringify'

// Errors
export { HttpError, TRequestErrorParams, TResponseErrorParams } from './errors/HttpError'

// Utils
export { Paginator } from './utils/Paginator'
export {
  CORE_DEBUG,
  isInstanceOf,
  isInstanceOfByCondition,
  sliceLast,
  getLastItem,
  chunkArray,
  arrayUnique,
  JSONStringifySafe,
  formatBytes,
  getCircularReplacer,
  chunkString,
  currentDir,
  onlyProduction,
  notDevelopment,
  timer,
  timerV2,
  argsCount,
  capitalize,
  convertToBoolean,
  convertNullishToEmpty,
  isStringifiedObject,
  prepareSQLIn,
  removeEmpty,
  currentDateFunction,
  ValueOf,
  removeSpaces,
  isISODate,
  parseDate,
  waitFor,
  isEmptyObject,
  splitWords,
  getKeyByValue,
} from './utils/common'
export { destroy } from './utils/destroy'
export { FSWrapper } from './utils/fsWrapper'
export { resolveMapWithPromise, resolveMapWithPromises } from './utils/promise'
export { Ready } from './utils/ready'
export { getOwnMethodNames, hasOwnMethods, isNonPrimitive, isInstanceOfICloneable } from './utils/reflect'
export { outerSquareBrackets, stringifiedObject, dateStringWithOffset, isoDateRegex } from './utils/regexp'
export { sleep } from './utils/sleep'
export { TEntityFrom, TClass } from './utils/types'
export { uuidV4 } from './utils/uuid'

// Clone
export { Cloner } from './utils/clone/Cloner'
export { ICloneable } from './utils/clone/ICloneable'
export { ICloner } from './utils/clone/strategy/ICloner'
export { JSONCloner } from './utils/clone/strategy/JSONCloner'
export { V8Cloner } from './utils/clone/strategy/V8Cloner'

// Helpers
export { JSONXPathTransformerHelper, JSONXpathTransformConfig } from './utils/helpers/JSONXPathTransformerHelper'
