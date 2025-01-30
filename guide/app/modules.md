# Module structure (Base on Article)

The main idea is to build application on independent modules

Module could be simple as shown in 'Structure' section.

Module could be complex. For example aggregates several modules if business logic is required to process
with some intersection entities

In simple case module has the following structure:

- modules/article/[Article.ts](../../demo/modules/article/Article.ts) - Entity

- modules/article/[resource](../../demo/modules/article/resource)/* - Classes for working (CRUD) with resource (MSSQL, Mongo, FileSystem)

- modules/article/[ArticleController.ts](../../demo/controllers/ArticleController.ts) - Article controller for handling request/response. 
Uses for handle data, validation, transfer to appropriate Service and response back

- modules/article/[ArticleService.ts](../../demo/modules/article/ArticleService.ts) - Service responsible for operation does not conceptually belong to
any object

- modules/article/config.ts - Interface with any correspond settings

Read more
1. [Entity](module/entity.md)
2. [Controller](module/controller.md)
3. [Resource](module/resource.md)

[Example](../app/modules/article)
