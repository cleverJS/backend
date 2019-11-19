# Cube structure (Base on Article)

The main idea is to build application on independent modules (cubes)

Cube could be simple as shown in 'Structure' section or even more easiest (contains only Entity.ts)

Cube could be complex. For example aggregates several cubes if business logic is required to process
with some intersection entities

In simple case cube has the following structure:

- cubes/article/[Article.ts](../../app/cubes/article/Article.ts) - Entity

- cubes/article/[resource](../../app/cubes/article/resource)/* - Classes for working (CRUD) with resource (MSSQL, Mongo, FileSystem)

- cubes/article/[ArticleController.ts](../../app/cubes/article/ArticleController.ts) - Article controller for handling request/response. 
Uses for handle data, validation, transfer to appropriate Service and response back

- cubes/article/[ArticleService.ts](../../app/cubes/article/ArticleService.ts) - Service responsible for operation does not conceptually belong to
any object

- cubes/article/config.ts - Interface with any correspond settings

Read more
1. [Entity](cube/entity.md)
2. [Controller](cube/controller.md)
3. [Resource](cube/resource.md)

[Example](../app/cubes/article)
