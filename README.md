# ops-mcp

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
```

Después:

```txt
- Upstash WRITE
- Google Drive/Sheets
```

## Principio de diseño

El MCP debe ser multi-proyecto.

Toda tool Vercel recibe:

```txt
project_key
```

Y resuelve IDs desde configuración.

Nunca hardcodear proyectos dentro de las tools.

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
  Cliente Upstash REST usando token read-only

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
  redis.js
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

Notas actuales:

```txt
lib/tools/vercel.js fue eliminado.
La fuente de verdad Vercel vive en lib/tools/vercel/.
Upstash ya tiene registry y handlers propios.
```

## Configuración runtime

El proyecto usa variables de entorno en Vercel:

```txt
VERCEL_TOKEN
OPS_PROJECTS_JSON
OPS_WRITE_TOKEN
KV_REST_API_URL
KV_REST_API_READ_ONLY_TOKEN
```

No deben escribirse en GitHub:

```txt
VERCEL_TOKEN
OPS_WRITE_TOKEN
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

`OPS_PROJECTS_JSON` contiene el mapa lógico de proyectos:

```json
{
  "helice": {
    "vercel_project_id": "prj_xxx",
    "vercel_team_id": "team_xxx"
  }
}
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

No usa el token full para lectura.

## Bloque SAFE implementado

### health.check

Verifica que el MCP esté vivo.

```txt
Entrada: ninguna
Riesgo: SAFE
```

### vercel.projects.list

Lista proyectos accesibles por el token de Vercel.

Sirve para descubrir:

```txt
- project id
- nombre del proyecto
- framework
- últimos deploys
```

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

Devuelve:

```txt
- uid
- name
- url
- state
- target
- created_at
```

```txt
Riesgo: SAFE
```

### vercel.env.list

Lista variables de entorno de un proyecto.

No devuelve valores secretos.

Devuelve solo metadata:

```txt
- id
- key
- target
- type
- created_at
- updated_at
```

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

Lista deploys recientes en estado:

```txt
ERROR
CANCELED
```

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

Nota: `vercel.logs.errors` queda solo como alias interno legacy. No se publica en tools/list.

### vercel.deploy.inspect

Inspecciona un deployment específico por UID.

Entrada:

```json
{
  "deployment_uid": "dpl_xxx",
  "project_key": "helice"
}
```

`project_key` es obligatorio para evitar ambigüedad multi-proyecto.

Devuelve:

```txt
- state
- target
- created_at
- building_at
- ready_at
- error_code
- error_message
- meta de GitHub
- creator
```

```txt
Riesgo: SAFE
```

Caso validado:

```txt
error_code: conflicting_file_path
error_message: api/dev/test-google.js conflicta con api/dev/test-google.py
```

### upstash.redis.get

Lee una key de Upstash Redis usando token read-only.

Entrada:

```json
{
  "key": "nombre:de:key"
}
```

Salida esperada:

```json
{
  "ok": true,
  "key": "nombre:de:key",
  "found": true,
  "value": "..."
}
```

Si no existe:

```json
{
  "ok": true,
  "key": "nombre:de:key",
  "found": false,
  "value": null
}
```

```txt
Riesgo: SAFE
```

Regla:

```txt
No usar para leer keys que contengan secretos o credenciales.
```

Caso validado:

```txt
key inexistente → found: false / value: null
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

Salida esperada:

```json
{
  "ok": true,
  "cursor": "3880051667400143572",
  "keys": ["places:reviews:..."],
  "count": 20
}
```

```txt
Riesgo: SAFE
```

Caso validado:

```txt
scan OK
count: 20
cursor devuelto
keys reales detectadas
no devuelve values
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

Validación confirmada:

```txt
WRITE sin write_token → invalid_write_token
WRITE con write_token → OK
SAFE sin write_token → OK
```

### vercel.env.set

Crea una variable de entorno nueva en Vercel.

No actualiza variables existentes.
No borra variables.
No dispara redeploy automático.
No devuelve el valor secreto.

Entrada:

```json
{
  "project_key": "ops",
  "key": "TEST_MCP",
  "value": "hello-world",
  "target": ["preview"],
  "type": "encrypted",
  "write_token": "..."
}
```

Validaciones:

```txt
- project_key obligatorio
- key obligatorio
- value obligatorio, pero acepta "", 0 y false
- target obligatorio
- target permitido: production, preview, development
- type permitido actualmente: encrypted
- write_token obligatorio
```

Salida segura:

```json
{
  "ok": true,
  "project_key": "ops",
  "key": "TEST_MCP",
  "target": ["preview"],
  "type": "encrypted",
  "created": true,
  "requires_redeploy": true
}
```

```txt
Riesgo: WRITE
```

Casos validados:

```txt
TEST_MCP creado en ops-mcp para target preview.
TEST_EMPTY_MCP creado en ops-mcp con value vacío para target preview.
```

### vercel.env.update

Actualiza una variable de entorno existente usando `env_id`.

No actualiza por `key` para evitar tocar la variable equivocada.
No borra variables.
No dispara redeploy automático.
No devuelve el valor secreto.

Entrada:

```json
{
  "project_key": "ops",
  "env_id": "P9waWChWwHzuM75I",
  "value": "updated-from-mcp",
  "target": ["preview"],
  "type": "encrypted",
  "write_token": "..."
}
```

Validaciones:

```txt
- project_key obligatorio
- env_id obligatorio
- value obligatorio, pero acepta "", 0 y false
- target opcional
- target permitido si viene: production, preview, development
- type permitido actualmente: encrypted
- write_token obligatorio
```

Salida segura:

```json
{
  "ok": true,
  "project_key": "ops",
  "env_id": "P9waWChWwHzuM75I",
  "target": ["preview"],
  "type": "encrypted",
  "updated": true,
  "requires_redeploy": true
}
```

```txt
Riesgo: WRITE
```

Caso validado:

```txt
TEST_EMPTY_MCP actualizado por env_id sin exponer value.
```

## Intento descartado

### vercel.deploy.trigger

Se intentó implementar redeploy usando:

```txt
POST /v13/deployments
```

Resultado:

```txt
vercel_api_error:400:Invalid request: "files" field should be an array
```

Diagnóstico:

```txt
Ese endpoint crea deployments desde archivos.
No sirve así para redeploy de proyecto conectado a GitHub.
```

Decisión:

```txt
vercel.deploy.trigger fue removido de tools/list y del código.
Queda pendiente hasta encontrar el endpoint correcto.
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
- Upstash set futuro con write_token
- trigger deploy futuro, cuando esté correctamente resuelto

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

`GET /api/mcp` expone solo health básico.

La lista de tools solo se obtiene por JSON-RPC usando:

```txt
tools/list
```

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
```
