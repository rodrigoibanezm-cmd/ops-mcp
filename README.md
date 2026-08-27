# ops-mcp...

MCP operacional remoto para Vercel, Upstash y operaciones runtime.

## Decisión cerrada

Este MCP se construye como servicio remoto por HTTP.

```txt
ChatGPT
↓
MCP remoto por HTTP
↓
ops-mcp hosteado en Vercel
↓
APIs operacionales
↓
proyectos operados
```

## No usar

```txt
- stdio local
- repo local obligatorio
- IDE como flujo principal
- MCP propio para GitHub
```

GitHub ya se opera con el conector oficial de ChatGPT.

## Objetivo

Permitir que ChatGPT opere servicios externos desde herramientas controladas, sin entrar manualmente a cada consola.

Focos actuales:

```txt
Vercel:
- deploys
- env vars
- estado runtime

Upstash:
- lectura segura de keys Redis
- escaneo seguro de keys Redis
- escritura controlada de keys Redis
```

Después:

```txt
- Google Drive/Sheets
```

## Arquitectura modular

`api/mcp.js` debe mantenerse como router thin.

Responsabilidad:

```txt
- recibir HTTP
- responder GET health
- manejar initialize
- manejar tools/list
- manejar tools/call
- devolver JSON-RPC
```

No debe contener lógica operacional de Vercel, Upstash ni Google.

Estructura actual:

```txt
api/mcp.js
  Router HTTP + JSON-RPC

lib/mcp/jsonRpc.js
  Helpers JSON-RPC

lib/mcp/tools.js
  Agregador de registry + dispatch por dominio

lib/mcp/auth.js
  Validación de write_token para tools WRITE

lib/mcp/response.js
  Formato estándar MCP content[]

lib/config/projects.js
  Resolución de project_key desde OPS_PROJECTS_JSON

lib/vercel/client.js
  Cliente Vercel API

lib/upstash/client.js
  Cliente Upstash REST read/write

lib/tools/vercel/
  index.js
  registry.js
  handlers.js
  projects.js
  deployments.js
  env.js

lib/tools/upstash/
  registry.js
  handlers.js
  read.js
  write.js
```

Reglas:

```txt
- api/mcp.js no debe crecer con lógica operacional
- lib/mcp/tools.js no debe acumular lógica de dominio
- registry separado por dominio
- handlers separados por dominio
- evitar archivos sobre ~120 líneas
- si un archivo crece, dividir por dominio antes de agregar más features
- no mantener dos fuentes de verdad para la misma tool
```

## Configuración runtime

El proyecto usa variables de entorno en Vercel:

```txt
VERCEL_TOKEN
OPS_PROJECTS_JSON
OPS_WRITE_TOKEN
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

No deben escribirse en GitHub:

```txt
VERCEL_TOKEN
OPS_WRITE_TOKEN
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

`OPS_WRITE_TOKEN` protege tools WRITE.

```txt
SAFE no requiere write_token.
WRITE requiere write_token.
```

Upstash SAFE usa:

```txt
KV_REST_API_URL
KV_REST_API_READ_ONLY_TOKEN
```

Upstash WRITE usa:

```txt
KV_REST_API_URL
KV_REST_API_TOKEN
```

## Bloque SAFE implementado

### health.check

Verifica que el MCP esté vivo.

```txt
Entrada: ninguna
Riesgo: SAFE
```

### vercel.projects.list

Lista proyectos accesibles por el token de Vercel.

```txt
Entrada: ninguna
Riesgo: SAFE
```

### vercel.deploy.latest

Devuelve el último deploy de un proyecto.

Entrada:

```json
{
  "project_key": "helice"
}
```

```txt
Riesgo: SAFE
```

### vercel.env.list

Lista variables de entorno de un proyecto.

No devuelve valores secretos.

Entrada:

```json
{
  "project_key": "ops"
}
```

```txt
Riesgo: SAFE
```

### vercel.deploy.errors

Lista deploys recientes en estado ERROR o CANCELED.

Entrada:

```json
{
  "project_key": "helice",
  "limit": 10
}
```

```txt
Riesgo: SAFE
```

### vercel.deploy.inspect

Inspecciona un deployment específico por UID.

Entrada:

```json
{
  "deployment_uid": "dpl_xxx",
  "project_key": "helice"
}
```

```txt
Riesgo: SAFE
```

### upstash.redis.get

Lee una key de Upstash Redis usando token read-only.

Entrada:

```json
{
  "key": "nombre:de:key"
}
```

```txt
Riesgo: SAFE
```

Regla:

```txt
No usar para leer keys que contengan secretos o credenciales.
```

### upstash.redis.scan

Lista keys de Upstash Redis por patrón sin devolver valores.

Entrada:

```json
{
  "cursor": "0",
  "match": "places:*",
  "count": 20
}
```

Reglas:

```txt
- usa token read-only
- no devuelve values
- count máximo: 100
- devuelve cursor para paginación
```

```txt
Riesgo: SAFE
```

## Bloque WRITE implementado

Las tools WRITE exigen:

```txt
write_token
```

El valor se compara contra:

```txt
OPS_WRITE_TOKEN
```

No se devuelve ni se loguea.

### vercel.env.set

Crea una variable de entorno nueva en Vercel.

No actualiza variables existentes.
No borra variables.
No dispara redeploy automático.
No devuelve el valor secreto.

```txt
Riesgo: WRITE
```

### vercel.env.update

Actualiza una variable de entorno existente usando `env_id`.

No actualiza por `key`.
No borra variables.
No dispara redeploy automático.
No devuelve el valor secreto.

```txt
Riesgo: WRITE
```

### upstash.redis.set

Escribe una key en Upstash Redis usando token WRITE.

Entrada:

```json
{
  "key": "test:mcp",
  "value": "hello",
  "write_token": "..."
}
```

Validaciones:

```txt
- key obligatorio
- value obligatorio, pero acepta "", 0 y false
- write_token obligatorio
```

Salida segura:

```json
{
  "ok": true,
  "key": "test:mcp",
  "updated": true
}
```

```txt
Riesgo: WRITE
```

No implementa:

```txt
- delete
- ttl
- mset
- json helper
- namespaces
```

## Tools visibles actuales

```txt
health.check
vercel.projects.list
vercel.deploy.latest
vercel.env.list
vercel.env.set
vercel.env.update
vercel.deploy.errors
vercel.deploy.inspect
upstash.redis.get
upstash.redis.scan
upstash.redis.set
```

## Seguridad inicial

Separar tools por riesgo.

```txt
SAFE:
- leer deploys
- inspeccionar deploys
- listar proyectos
- listar env vars sin valores
- leer keys Upstash con token read-only
- escanear keys Upstash con token read-only

WRITE:
- crear env vars con write_token
- actualizar env vars por env_id con write_token
- escribir keys Upstash con write_token

DANGER:
- borrar proyectos
- borrar dominios
- borrar datos
- borrar env vars
- borrar keys Upstash
```

No habilitar DANGER en MVP.

## Estado actual

Repo cloud-first.

Los archivos se editan desde ChatGPT usando el conector oficial de GitHub.

El MCP está hosteado en Vercel y expone endpoint HTTP.

Últimas validaciones:

```txt
tools/list OK
vercel.deploy.latest OK
vercel.env.list OK
vercel.env.update OK
WRITE sin token bloqueado
WRITE con token OK
SAFE sin token OK
upstash.redis.get OK
upstash.redis.scan OK
upstash.redis.set OK
```
