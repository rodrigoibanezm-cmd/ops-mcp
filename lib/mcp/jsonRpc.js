export function jsonRpc(id, result) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

export function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}
