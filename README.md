# ops-mcp

MCP operacional remoto para Vercel, Upstash, Neon y operaciones runtime.

## Arquitectura

```text
ChatGPT
  ↓ MCP remoto HTTP
ops-mcp en Vercel
  ↓
APIs operacionales
  ↓
proyectos operados
```

El proyecto es cloud-first. GitHub se opera mediante el conector oficial de ChatGPT; `ops-mcp` se concentra en infraestructura y runtime.

## Estructura

```text
api/mcp.js
  Router HTTP + JSON-RPC

lib/mcp/auth.js
  Autorización WRITE a nivel de transporte

lib/mcp/tools.js
  Registry agregado + dispatch

lib/config/projects.js
  Resolución de project_key

lib/tools/vercel/
lib/tools/upstash/
lib/tools/neon/
```

Reglas:

```text
- api/mcp.js debe permanecer thin
- registry separado por dominio
- handlers separados por dominio
- evitar archivos de lógica sobre ~120 líneas
- no mantener dos fuentes de verdad para una misma tool
```

## Configuración runtime

Variables de entorno en Vercel:

```text
VERCEL_TOKEN
OPS_PROJECTS_JSON
OPS_WRITE_TOKEN
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

Los secretos no se escriben en GitHub.

## Autorización

Las tools se separan por riesgo:

```text
SAFE
WRITE
DANGER
```

Las tools SAFE no requieren autorización WRITE.

Las tools WRITE ya no exponen `write_token` en su input schema. El modelo no debe conocer ni reenviar `OPS_WRITE_TOKEN`.

La conexión MCP debe enviar uno de estos headers:

```http
Authorization: Bearer <OPS_WRITE_TOKEN>
```

preferido, o durante transición:

```http
x-ops-write-token: <OPS_WRITE_TOKEN>
```

`api/mcp.js` convierte el header en contexto interno y `lib/mcp/auth.js` autoriza las tools WRITE comparándolo con `OPS_WRITE_TOKEN` del runtime.

Por compatibilidad temporal, `callTool()` todavía acepta un `args.write_token` legado para invocaciones internas anteriores. Ese campo ya no forma parte de los schemas MCP y debe eliminarse cuando todas las conexiones hayan migrado.

Esto evita el patrón incorrecto anterior:

```text
ChatGPT conoce secreto
→ lo incluye en arguments
→ MCP lo compara consigo mismo
```

El patrón actual es:

```text
conexión MCP autenticada
→ secreto viaja en transporte
→ modelo nunca lo ve
→ MCP autoriza WRITE
```

## SAFE implementado

```text
health.check
vercel.projects.list
vercel.deploy.latest
vercel.env.list
vercel.deploy.errors
vercel.deploy.inspect
upstash.redis.get
upstash.redis.scan
neon.branches.list
neon.branch.get
neon.tables.list
neon.table.describe
neon.sql.query
```

`neon.sql.query` acepta una única sentencia de solo lectura.

## WRITE implementado

```text
vercel.env.set
vercel.env.update
upstash.redis.set
neon.sql.execute
```

Todas requieren conexión MCP autorizada para WRITE.

### Vercel

`vercel.env.set` crea una variable nueva. No sobrescribe una existente y no dispara redeploy automático.

`vercel.env.update` actualiza una variable existente por `env_id`.

### Upstash

`upstash.redis.set` escribe una key usando el token WRITE del runtime. No implementa delete, TTL ni operaciones masivas.

### Neon

`neon.sql.execute` ejecuta SQL con escritura o DDL sobre el branch indicado; `main` es el default.

## DANGER

No habilitado en el MVP:

```text
- borrar proyectos
- borrar dominios
- borrar env vars
- borrar keys Upstash
- borrar datos Neon mediante tools dedicadas
```

## Seguridad

`OPS_WRITE_TOKEN` protege únicamente la capacidad WRITE y debe vivir fuera del modelo, en el runtime del MCP y en la configuración segura de la conexión.

Las respuestas no deben devolver ni loguear secretos.
