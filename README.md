# ops-mcp

MCP operacional remoto para Vercel y, luego, Upstash/Google.

## Decisión cerrada

Este MCP se construye como servicio remoto por HTTP.

```txt
ChatGPT
↓
MCP remoto por HTTP
↓
ops-mcp hosteado en Vercel
↓
Vercel API
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

Primer foco:

```txt
Vercel:
- deploys
- logs
- env vars
- estado runtime
```

Después:

```txt
- Upstash
- Google Drive/Sheets
```

## Principio de diseño

El MCP debe ser multi-proyecto.

Toda tool recibe:

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
  Registry + dispatch de tools

lib/config/projects.js
  Resolución de project_key desde OPS_PROJECTS_JSON

lib/vercel/client.js
  Cliente Vercel API

lib/tools/vercel/
  index.js
  projects.js
  deployments.js
  env.js
```

Reglas:

```txt
- api/mcp.js no debe crecer con lógica operacional
- evitar archivos sobre ~120 líneas
- si un archivo crece, dividir por dominio antes de agregar más features
- no mantener dos fuentes de verdad para la misma tool
```

Nota actual:

```txt
lib/tools/vercel.js fue eliminado.
La fuente de verdad Vercel ahora vive en lib/tools/vercel/.
```

Riesgo futuro:

```txt
lib/mcp/tools.js puede crecer demasiado cuando entren Upstash/Google.
```

Cuando eso pase, separar por dominio:

```txt
lib/tools/vercel.registry.js
lib/tools/vercel.handlers.js
lib/tools/upstash.registry.js
lib/tools/upstash.handlers.js
```

## Configuración runtime

El proyecto usa variables de entorno en Vercel:

```txt
VERCEL_TOKEN
OPS_PROJECTS_JSON
OPS_WRITE_TOKEN
```

`VERCEL_TOKEN` y `OPS_WRITE_TOKEN` no deben escribirse en GitHub.

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

## Bloque SAFE implementado

Estas tools ya están implementadas y validadas.

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

No modifica nada.

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
  "project_key": "helice"
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
```

## Seguridad inicial

Separar tools por riesgo.

```txt
SAFE:
- leer deploys
- inspeccionar deploys
- listar proyectos
- listar env vars sin valores

WRITE:
- crear env vars con write_token
- actualizar env vars por env_id con write_token
- trigger deploy futuro, cuando esté correctamente resuelto

DANGER:
- borrar proyectos
- borrar dominios
- borrar datos
- borrar env vars
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
```
