import { Condition, TConditionOperator } from '../../../../core/db/Condition'
import { Paginator } from '../../../../core/utils/Paginator'
import { TArticle } from '../../../../demo/modules/article/Article'
import { createArticleTable } from '../../../migrations/tables'
import { demoAppContainer } from '../../../setup/DemoAppContainer'

const TITLE_I = 'The Fundamentals of Mathematical Analysis I'
const TITLE_II = 'The Fundamentals of Mathematical Analysis II'
const TITLE_III = 'The Fundamentals of Mathematical Analysis III'
const AUTHOR_I = 'G. M. Fikhtengolts'

describe('Test AbstractDBResource and AbstractService', () => {
  const connection = demoAppContainer.connection
  const service = demoAppContainer.serviceContainer.articleService
  const resource = demoAppContainer.resourceContainer.articleResource

  const payload1: TArticle = {
    id: null,
    content: null,
    created: null,
    isPublished: false,
    title: TITLE_I,
    author: AUTHOR_I,
  }

  const payload2 = {
    title: TITLE_II,
    author: AUTHOR_I,
  }

  const payload3 = {
    title: TITLE_III,
    author: AUTHOR_I,
  }

  beforeAll(async () => {
    await createArticleTable(connection)
  })

  beforeEach(async () => {
    await connection.table('article').truncate()
  })

  afterAll(async () => {
    await demoAppContainer.destroy()()
  })

  test('should insert item', async () => {
    const item = await service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)
  })

  test('should findById', async () => {
    const item = await service.createEntity(payload1)
    await service.save(item)

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem).toEqual(item)
  })

  test('should findById 2', async () => {
    const item = await service.createEntity(payload1)

    item.author = ''
    await service.save(item)

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem).toEqual(item)
  })

  test('should findAll', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: TITLE_II }],
    })
    const dbItem = await service.findOne(condition)
    expect(item2).toEqual(dbItem)

    const dbItems = await service.findAll()
    expect(dbItems).toEqual([item1, item2, item3])
  })

  test('should findAll with pagination', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.findAll(undefined, paginator)
    expect(dbItems).toEqual([item1, item2])

    paginator.nextPage()

    dbItems = await service.findAll(undefined, paginator)
    expect(dbItems).toEqual([item3])
  })

  test('should delete', async () => {
    const item = await service.createEntity(payload1)
    await service.save(item)

    let dbItem
    if (item.id) {
      await service.delete(item.id)
      dbItem = await service.findById(item.id)
    }
    expect(dbItem).toBeNull()
  })

  test('should deleteAll', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: TITLE_II }],
    })

    await service.deleteAll(condition)
    const dbItems = await service.findAll()
    expect(dbItems).toEqual([item1, item3])
  })

  test('should truncate', async () => {
    const item = await service.createEntity(payload1)
    await service.save(item)
    await service.truncate()
    const dbItems = await service.findAll()
    expect(dbItems).toEqual([])
  })

  test('should update item', async () => {
    const item = await service.createEntity(payload1)

    await service.save(item)

    item.title = TITLE_II
    const result = await service.save(item)

    expect(result).toBeTruthy()

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem?.title).toEqual(TITLE_II)
  })

  test('should remove primary key on update item', async () => {
    const item = await service.createEntity(payload1)

    await service.save(item)

    item.title = TITLE_II

    if (item.id) {
      const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: item.id }] })
      await resource.update(condition, item.getData())
    }

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem?.title).toEqual(TITLE_II)
  })

  test('should return false if item cannot be updated', async () => {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: 9999 }] })
    const result = await resource.update(condition, { title: '111' })

    expect(result).toBeFalsy()
  })

  test('should batchInsert', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3])

    const dbItems = await service.findAll()
    expect(dbItems.length).toEqual(3)
  })

  test('should remove id on batchInsert', async () => {
    const item1 = await service.createEntity({ ...payload1, id: 1 })
    const item2 = await service.createEntity({ ...payload2, id: 2 })
    const item3 = await service.createEntity({ ...payload3, id: 3 })

    await resource.batchInsert([item1, item2, item3])

    const dbItems = await service.findAll()
    expect(dbItems.length).toEqual(3)
  })

  test('should batchInsert with chunk size', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3], 1)

    const dbItems = await service.findAll()
    expect(dbItems.length).toEqual(3)
  })

  test('should count', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3])

    const count = await service.count()
    expect(count).toEqual(3)
  })

  test('should count with condition', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3])

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: TITLE_II }],
    })

    const count = await service.count(condition)
    expect(count).toEqual(1)
  })

  test('should list', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.list(paginator)
    expect(dbItems).toEqual([item1, item2])
    expect(paginator.getTotal()).toEqual(3)

    paginator.nextPage()

    dbItems = await service.list(paginator)
    expect(dbItems).toEqual([item3])
  })

  test('should listRaw', async () => {
    const expectRaw = [
      {
        author: AUTHOR_I,
        content: null,
        id: 1,
        isPublished: 0,
        title: TITLE_I,
        from: null,
        to: null,
      },
      {
        author: AUTHOR_I,
        content: null,
        id: 2,
        isPublished: 0,
        title: TITLE_II,
        from: null,
        to: null,
      },
    ]

    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.listRaw(paginator)
    dbItems = dbItems.map((i) => {
      const { created, ...data } = i
      return data
    })

    expect(dbItems).toEqual(expectRaw)
    expect(paginator.getTotal()).toEqual(3)

    paginator.nextPage()

    dbItems = await service.listRaw(paginator)

    dbItems = dbItems.map((i) => {
      const { created, ...data } = i
      return data
    })

    expect(dbItems).toEqual([
      {
        author: AUTHOR_I,
        content: null,
        id: 3,
        isPublished: 0,
        title: TITLE_III,
        from: null,
        to: null,
      },
    ])
  })

  test('should listRaw with chosen select only', async () => {
    const item1 = await service.createEntity(payload1)
    const item2 = await service.createEntity(payload2)
    const item3 = await service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.listRaw<{ title: string }>(paginator, undefined, ['title'])

    expect(dbItems).toEqual([{ title: TITLE_I }, { title: TITLE_II }])
    expect(paginator.getTotal()).toEqual(3)

    paginator.nextPage()

    dbItems = await service.listRaw<{ title: string }>(paginator, undefined, ['title'])

    expect(dbItems).toEqual([{ title: TITLE_III }])
  })

  test('should upsert item', async () => {
    const item = await service.createEntity(payload1)

    await service.upsert(item)

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }

    if (!dbItem) {
      throw new Error()
    }

    expect(dbItem.id).toEqual(1)
    expect(dbItem.title).toEqual(payload1.title)
    expect(dbItem.author).toEqual(payload1.author)

    const item2 = await service.createEntity(payload2)

    item2.id = item.id
    await service.upsert(item2)

    if (item.id) {
      dbItem = await service.findById(item.id)
    }

    if (!dbItem) {
      throw new Error()
    }

    expect(dbItem.id).toEqual(1)
    expect(dbItem.title).toEqual(payload2.title)
    expect(dbItem.author).toEqual(payload2.author)
  })

  test('should upsert item by condition', async () => {
    const item = await service.createEntity(payload1)

    await service.upsert(item)

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }

    if (!dbItem) {
      throw new Error()
    }

    expect(dbItem.id).toEqual(1)
    expect(dbItem.title).toEqual(payload1.title)
    expect(dbItem.author).toEqual(payload1.author)

    const item2 = await service.createEntity({ ...payload2, id: null })

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: TITLE_I }],
    })

    await service.upsert(item2, condition)

    if (item.id) {
      dbItem = await service.findById(item.id)
    }

    if (!dbItem) {
      throw new Error()
    }

    expect(dbItem.id).toEqual(1)
    expect(dbItem.title).toEqual(payload2.title)
    expect(dbItem.author).toEqual(payload2.author)
  })

  it('s', async () => {
    try {
      const e = await service.createEntity({})
      expect(e).toBeTrue()
    } catch (e) {
      expect(e).toBeTrue()
    }
  })
})
