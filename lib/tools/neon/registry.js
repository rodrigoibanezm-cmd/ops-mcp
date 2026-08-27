const branch = { type: 'string', minLength: 1, description: 'Neon branch name or id. Defaults to main.' };
const writeToken = { type: 'string', minLength: 1 };

export const neonTools = [
  {
    name: 'neon.branches.list',
    description: 'Lista branches del proyecto Neon configurado.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'neon.branch.get',
    description: 'Obtiene un branch Neon por nombre o id.',
    inputSchema: { type: 'object', required: ['branch'], properties: { branch }, additionalProperties: false }
  },
  {
    name: 'neon.tables.list',
    description: 'Lista tablas PostgreSQL del branch. Usa main por defecto.',
    inputSchema: { type: 'object', properties: { branch }, additionalProperties: false }
  },
  {
    name: 'neon.table.describe',
    description: 'Describe columnas de una tabla PostgreSQL.',
    inputSchema: {
      type: 'object', required: ['table'], additionalProperties: false,
      properties: { branch, table: { type: 'string', minLength: 1 }, schema: { type: 'string', minLength: 1, default: 'public' } }
    }
  },
  {
    name: 'neon.sql.query',
    description: 'Ejecuta una única sentencia SQL de solo lectura en Neon.',
    inputSchema: {
      type: 'object', required: ['sql'], additionalProperties: false,
      properties: { branch, sql: { type: 'string', minLength: 1 } }
    }
  },
  {
    name: 'neon.sql.execute',
    description: 'Ejecuta SQL con escritura o DDL. Requiere write_token.',
    inputSchema: {
      type: 'object', required: ['sql', 'write_token'], additionalProperties: false,
      properties: { branch, sql: { type: 'string', minLength: 1 }, write_token: writeToken }
    }
  }
];
