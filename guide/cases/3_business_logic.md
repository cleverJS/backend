# Business logic (Service)

[back](../use_cases.md)

Create your <b>business logic</b> in Service classes. For example, we will create logic which should

- Get author list.
- Replace string ```{{author}}``` in a text.

1. Create module ```app/modules/Article```

2. Create service ```app/modules/Article/ArticleService.ts```

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

[back](../use_cases.md)
