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

lib/tools/vercel.js
  Lógica operacional Vercel SAFE
```

Regla:

```txt
Si una tool nueva hace crecer api/mcp.js, está mal ubicada.
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
```

`VERCEL_TOKEN` no debe escribirse en GitHub.

`OPS_PROJECTS_JSON` contiene el mapa lógico de proyectos:

```json
{
  "helice": {
    "vercel_project_id": "prj_xxx",
    "vercel_team_id": "team_xxx"
  }
}
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

## Tools visibles actuales

```txt
health.check
vercel.projects.list
vercel.deploy.latest
vercel.env.list
vercel.deploy.errors
vercel.deploy.inspect
```

## Seguridad inicial

Partir con tools SAFE.

```txt
SAFE:
- leer deploys
- inspeccionar deploys
- listar proyectos
- listar env vars sin valores

WRITE:
- set env vars
- trigger deploy

DANGER:
- borrar proyectos
- borrar dominios
- borrar datos
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
