# Notes

- We are using zod to make frontend and backend validation easy
- We infer a type from it to use in the frontend for ease
- If any such case arrives where we aren't able to use zod then only we will use the type script types

---

## Checklist (point-wise)

- One zod schema per API input, kept in `src\utils\zod\<area>\…` and imported by **both** the route and the client — never validate the same thing twice by hand.
- Export a response type next to the schema (`type XResponse = {...}`) and use it as the axios generic in the client.
- Row interfaces must `extend RowDataPacket`, otherwise `conn.query<T>()` fails the `QueryResult` constraint — this includes small `{ id: string }` lookups, and they must be declared at module level, not inside the handler.
- `COUNT` / `SUM` / `DECIMAL` arrive as strings: type them `number | string` and narrow with `Number()`.
- Values that must match across layers (e.g. the slug shape) are exported from their util and imported by the schema — do not redeclare the regex.
- If zod cannot express it, fall back to a plain TypeScript type only then.
