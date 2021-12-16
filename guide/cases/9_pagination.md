# Pagination

[back](../wizard.md)

When you work with lists you need a pagination. Core has a class [Paginator](../../core/utils/Paginator.ts)
which works with [AbstractDBResource](../../core/db/sql/AbstractDBResource.ts) and [AbstractService](../../core/AbstractService.ts).

1. Create fetchAuthorList with paginator in ArticleService.ts

```ts
    public async fetchAuthorList(paginator: Paginator): Promise<string[]> {
      const items = await this.findAll(undefined, paginator)
      return items.map((i) => i.author)
    }
```

2. Change actionAuthorList to use paginator in ArticleWSController.ts

```ts
    public actionAuthorList = async (request: WSRequest, connection: IConnection) => {
      const { page = 1, itemsPerPage = 25 } = request.payload
    
      const paginator = new Paginator()
      paginator.setItemsPerPage(itemsPerPage)
      paginator.setCurrentPage(page)
    
      const result = await this.deps.articleService.fetchAuthorList(paginator)
    
      return {
        success: true,
        data: {
          result,
        },
      }
    }
```

3. Add actionList to use paginator in ArticleWSController.ts

```ts
    public actionFetchList = async (request: WSRequest, connection: IConnection) => {
      const { page = 1, itemsPerPage = 25 } = request.payload
    
      const paginator = new Paginator()
      paginator.setItemsPerPage(itemsPerPage)
      paginator.setCurrentPage(page)
    
      const result = await this.deps.articleService.list(paginator)
    
      return {
        success: true,
        data: {
          result,
        },
      }
    }
```
[back](../wizard.md)
