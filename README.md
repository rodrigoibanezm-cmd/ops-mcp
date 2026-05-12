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

## Primera tool

```txt
vercel.deploy.latest
```

Entrada:

```json
{
  "project_key": "helice"
}
```

Salida esperada:

```json
{
  "ok": true,
  "project_key": "helice",
  "deployment": {
    "id": "...",
    "url": "...",
    "state": "READY",
    "created_at": "..."
  }
}
```

## Seguridad inicial

Partir con tools SAFE.

```txt
SAFE:
- leer deploys
- leer logs
- listar env vars

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

El MCP debe quedar hosteado y conectable desde ChatGPT por URL.
