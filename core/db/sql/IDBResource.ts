import { PassThrough } from 'stream'

import { Paginator } from '../../utils/Paginator'
import { Condition } from '../Condition'

export interface IDBResource {
  findOne<R = Record<string, any>>(condition: Readonly<Condition>, connection?: unknown): Promise<R | null>
  findAll<R = Record<string, any>>(
    condition?: Readonly<Condition>,
    paginator?: Readonly<Paginator>,
    select?: string[],
    connection?: unknown
  ): Promise<R[]>
  count(condition?: Readonly<Condition>, connection?: unknown): Promise<number>
  query<R = Record<string, any>>(sql: string, connection?: unknown): Promise<R[]>
  insert(data: Record<string, any>, connection?: unknown): Promise<boolean>
  update(condition: Readonly<Condition>, data: Record<string, any>, connection?: unknown): Promise<boolean>
  delete(id: string | number, requestor?: string, connection?: unknown): Promise<boolean>
  deleteAll(condition: Readonly<Condition>, requestor?: string, connection?: unknown): Promise<boolean>
  query<R = Record<string, any>>(sql: string, binding?: any[]): Promise<R | null>
  batchInsert(item: Record<string, any>[], chunkSize?: number, connection?: unknown): Promise<string[] | number[] | boolean>
  truncate(requestor?: string, connection?: unknown): Promise<any>
  stream<R = Record<string, any>>(condition?: Readonly<Condition>, select?: string[], connection?: unknown): PassThrough & AsyncIterable<R>
  getPrimaryKey(): string
  getTable(): string
  getConnection(): unknown
}
