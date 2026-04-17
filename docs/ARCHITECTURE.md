# Backend Architecture

## Layering

- routes: endpoint registration and middleware chain
- controllers: HTTP-level handling and response shape
- services: business logic and data orchestration
- prisma: database client bootstrap
- utils: shared helpers and validators

## Request Flow

1. Request enters route.
2. authMiddleware validates JWT.
3. permission middleware checks RBAC permission.
4. validation middleware normalizes and validates payload/query.
5. controller calls service.
6. service accesses Prisma client.
7. controller returns normalized response.

## RBAC Pattern

- read_* permission for query/list/detail endpoints.
- manage_* permission for mutating endpoints.
- checkAnyPermission is used when a route accepts more than one permission.

## Design Rules

- Keep controller thin.
- Keep service pure and testable.
- Keep validation close to route contract.
- Keep permission checks explicit on each endpoint.
