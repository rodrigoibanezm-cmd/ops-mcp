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
  Validación de write_token para tools WRITE

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

Las tools WRITE exponen un argumento obligatorio:

```text
write_token
```

Ese valor se compara contra `OPS_WRITE_TOKEN` del runtime. Si falta o no coincide, la operación se rechaza.

Este diseño evita depender de OAuth o autenticación de transporte en ChatGPT y mantiene la autorización explícita por invocación.

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

Todas requieren `write_token`.

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

`OPS_WRITE_TOKEN` protege únicamente la capacidad WRITE. Vive como variable de entorno en Vercel y nunca debe escribirse en GitHub ni devolverse en respuestas o logs.
