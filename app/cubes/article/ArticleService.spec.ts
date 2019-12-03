import { ArticleService } from './ArticleService'
import { ArticleResourceSql } from './resource/ArticleResourceSql'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { Article } from './Article'
import { Condition } from '../../../core/db/Condition'
import Knex from 'knex'

describe('ArticleService', () => {
  it('should sign up and sign in', async () => {
    const connection: Knex = jest.genMockFromModule('knex')
    const conditionDbParser = new ConditionDbParser()
    const articleResourceSql = new ArticleResourceSql(connection, conditionDbParser, new EntityFactory(Article, Article.cast))
    const spyInstance = jest.spyOn(articleResourceSql, 'findOne')

    spyInstance.mockImplementation(() => {
      const factory = new EntityFactory(Article, Article.cast)

      return Promise.resolve(
        factory.create({
          id: 1,
          firstName: 'Admin',
          lastName: 'Admin',
          password: '$2b$10$ls5zzX2YKv51FBsA/KU10OKgZVA3QxRvJMgWaBypummC11cxhgKYq',
          salt: 'e5392351798c8273',
          token:
            'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjozLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUudGxkIiwidHMiOjE1NzQzMzE2MDN9LCJpYXQiOjE1NzQzMzE2MDMsImV4cCI6MTU3NDM1MzIwM30.IDZmsPiDo8oz0Diow206o2Vu4_GLVVFoevwdYCaaxDu66LXHcYjxSYrVbOQf4x_D31nOXdBU_82UV_fEPcIVzwOlrW7n9jqHVX993u3wS3HSkTCy-eMYfMBwtSa1DoU-rUs731AaCz8ZVPKeikBLyEQ0yyObxQqpUu1_uZKxybpOccEwGxVRZ7mV1Toe-MMKMV6VQndK6GJFz2XMi2lx0nJgpxsngjUIHzjdhrbz7pwHKbL-stNo8-oGK05lTIoeCq3c37XkNosLg3OPD1Bts30Oov7gcwwru8bp8wG9KOEi4Zh_Ye_N89KRJ6Swfw4Ow5rG5mkxco3nRbFd_w7D0Q',
          email: 'admin@example.tld',
          roleId: 1,
          createdAt: 1574235838,
          updatedAt: 1574235838,
        })
      )
    })

    const service = new ArticleService({
      resource: articleResourceSql,
    })

    const result = await service.findOne(new Condition())
    console.log(result)
  })
})
