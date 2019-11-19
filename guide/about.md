# About

Core for development in [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design) (DDD) terms.
Contains the following functional:

### Cubes (plugins) - Entity + Service + Factory + Resource

[Entity](../core/entity/AbstractEntity.ts) - An object that is not defined by its attributes,
but rather by a thread of continuity and its [identity](https://en.wikipedia.org/wiki/Identity_(object-oriented_programming)).

[Service](../core/AbstractService.ts) - When an operation does not conceptually belong to any
object. Following the natural contours of the problem, you can implement these operations in
services. See also [Service (systems architecture)](https://en.wikipedia.org/wiki/Service_(systems_architecture)).

[Factory](../core/entity/EntityFactory.ts) - Methods for creating domain objects should delegate
to a specialized [Factory](https://en.wikipedia.org/wiki/Factory_method_pattern) object such that
alternative implementations may be easily interchanged.

[Resource(Repository)](../core/db/AbstractResource.ts) - Methods for retrieving domain objects
should delegate to a specialized Repository object such that alternative storage implementations
may be easily interchanged.

# Database
### SQL Condition
[Condition](../core/db/Condition.ts) SQL builder. Cover simple query cases:

- equals 
- not equals 
- less than 
- greater than 
- less or equals 
- greater or equals 
- between 
- like 
- in

order, limit, offset

[(example)](../core/db/Condition.spec.ts)  

## Handle with SQL
### Abstract SQL Resource
[AbstractDBResource](../core/db/sql/AbstractDBResource.ts) contains common methods for operation
with SQL databases (Postgres, MSSQL, MySQL, MariaDB, SQLite3, Oracle).

## Handle with No SQL
### Abstract Mongo Resource
[AbstractMongoResource](../core/db/mongo/AbstractMongoResource.ts) contains common methods for 
operation with Mongo.

# Built-in servers

For handles incoming connection there are [Web Socket Server](../core/ws/WSServer.ts) and [HTTP Server](../core/http/HttpServer.ts) 
