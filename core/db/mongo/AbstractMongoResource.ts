import { Mongo } from './Mongo'
import { Db, InsertOneWriteOpResult, ObjectId } from 'mongodb'
import { ConditionMongoDbParser } from './condition/ConditionMongoDbParser'
import { AbstractResource } from '../AbstractResource'
import { logger } from '../../logger/logger'
import { AbstractEntity } from '../../entity/AbstractEntity'
import { EntityFactory } from '../../entity/EntityFactory'
import { AbstractObject } from '../../AbstractObject'

// TODO: change any to Condition after ConditionMongoDbParser refactoring
export abstract class AbstractMongoResource<T extends AbstractEntity<AbstractObject>> extends AbstractResource<T> {
  protected collectionName: string = ''
  protected db: Promise<Db | null>

  constructor(dbClient: Mongo, entityFactory: EntityFactory<T>) {
    super(entityFactory)
    this.db = dbClient.getDB()
  }

  public async findById(id: string) {
    let result = null

    const db = await this.db
    if (db) {
      const record = await db.collection(this.collectionName).findOne({ _id: new ObjectId(id) })
      if (record) {
        result = this.createEntity(record)
      }
    }

    return result
  }

  public async findOne(condition: any) {
    let result: T | null = null

    const db = await this.db
    if (db) {
      const conditionMongoDbParser = new ConditionMongoDbParser(condition)

      const filter = conditionMongoDbParser.filter()

      const record = await db.collection(this.collectionName).findOne(filter)
      if (record) {
        result = this.createEntity(record)
      }
    }
    logger.info(result)
    return result
  }

  public async findAll(condition: any) {
    const result: T[] = []

    const db = await this.db
    if (db) {
      const conditionMongoDbParser = new ConditionMongoDbParser(condition)
      const filter = conditionMongoDbParser.filter()
      const option = conditionMongoDbParser.options()
      const cursor = await db.collection(this.collectionName).find(filter, option)
      if (cursor) {
        cursor.forEach(c => {
          const item = this.createEntity(c.toArray())
          result.push(item)
        })
      }
    }

    return result
  }

  public async count(condition?: any) {
    const db = await this.db
    if (db) {
      const conditionMongoDbParser = new ConditionMongoDbParser(condition)
      const filter = conditionMongoDbParser.filter()
      const options = conditionMongoDbParser.options()
      return db.collection(this.collectionName).countDocuments(filter, {
        limit: options.limit,
        skip: options.offset,
      })
    }

    return null
  }

  public async save(item: T) {
    const db = await this.db
    if (db) {
      try {
        const data = item.getData()
        if (data) {
          // TODO: Is it necessary to clone data before delete id ?
          const dbData = { ...data }
          delete dbData.id
          if (item.id) {
            const id = new ObjectId(item.id)
            await db.collection(this.collectionName).updateOne({ _id: id }, { $set: dbData })
          } else {
            const result: InsertOneWriteOpResult<any> = await db.collection(this.collectionName).insertOne(dbData)
            item.id = result.insertedId.toHexString()
          }
        }
      } catch (e) {
        logger.error(e)
        return false
      }
      return true
    }

    return false
  }

  public async delete(id: string) {
    let result = null
    const db = await this.db
    if (db) {
      result = await db.collection(this.collectionName).deleteOne({ _id: new ObjectId(id) })
      logger.info(result)
    }

    return true
  }

  public async deleteAll(condition?: any) {
    let result = null
    const db = await this.db
    if (db) {
      const conditionMongoDbParser = new ConditionMongoDbParser(condition)
      const filter = conditionMongoDbParser.filter()
      result = await db.collection(this.collectionName).deleteMany(filter)
      logger.info(result)
    }

    return true
  }

  public createEntity(record: any) {
    return this.entityFactory.create(this.map(record))
  }
}
