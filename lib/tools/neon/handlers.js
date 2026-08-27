import { branches, resolveBranch, runSql } from '../../neon/client.js';

function cleanBranch(item) {
  return { id: item.id, name: item.name, parent_id: item.parent_id, created_at: item.created_at, updated_at: item.updated_at };
}

function assertReadOnly(sql) {
  const text = sql.trim().replace(/;+\s*$/, '');
  if (text.includes(';')) throw new Error('neon_query_single_statement_only');
  if (!/^(select|with|show|explain)\b/i.test(text)) throw new Error('neon_query_read_only');
  if (/\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/i.test(text)) {
    throw new Error('neon_query_read_only');
  }
}

export async function handleNeonTool(name, args) {
  if (name === 'neon.branches.list') return { branches: (await branches()).map(cleanBranch) };
  if (name === 'neon.branch.get') return { branch: cleanBranch(await resolveBranch(args.branch)) };

  if (name === 'neon.tables.list') {
    const sql = `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`;
    return runSql(sql, args.branch);
  }

  if (name === 'neon.table.describe') {
    const schema = args.schema || 'public';
    const safe = (value) => String(value).replaceAll("'", "''");
    const sql = `SELECT ordinal_position, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='${safe(schema)}' AND table_name='${safe(args.table)}' ORDER BY ordinal_position`;
    return runSql(sql, args.branch);
  }

  if (name === 'neon.sql.query') {
    assertReadOnly(args.sql);
    return runSql(args.sql, args.branch);
  }

  if (name === 'neon.sql.execute') return runSql(args.sql, args.branch);
  return null;
}
