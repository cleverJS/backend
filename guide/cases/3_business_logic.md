# Business logic (Service)

[back](../wizard.md)

Create your <b>business logic</b> in Service classes. For example, we will create logic which should

- Get author list.
- Replace string ```{{author}}``` in a text.

1. Create module ```app/modules/article```

2. Create service ```app/modules/article/ArticleService.ts```

```ts
export class ArticleService {
  public getAuthorList(limit: number): string[] {
    return ['G. M. Fikhtengolts', 'L. Euler', 'J. L. Lagrange'].slice(0, limit)
  }

  public replaceAuthor(text: string, author: string): string {
    return text.replace('{{author}}', author)
  }
}
```

The next step is to call this logic from frontend application. For this we need to create server endpoints
which could handle this calls. We have two options [HTTP](./4_http_endpoint.md) or [Websocket](./5_ws_endpoint.md).

[back](../wizard.md)
