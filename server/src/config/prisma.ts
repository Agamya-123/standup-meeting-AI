import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export interface SqlitePragmaStatus {
  journal_mode: string;
  busy_timeout: number;
  synchronous: number;
  foreign_keys: number;
}

/**
 * Configures and validates production SQLite PRAGMAs on the given PrismaClient instance.
 * Ensures Write-Ahead Logging (WAL) is enabled along with proper busy timeouts and foreign keys.
 */
export async function initSqlitePragmas(client: PrismaClient = prisma): Promise<SqlitePragmaStatus> {
  try {
    // 1. Enable Write-Ahead Logging (WAL) for non-blocking concurrent reads
    await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');

    // 2. Set Busy Timeout to 5000ms to allow concurrent write queueing without immediate lock failure
    await client.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');

    // 3. Set Synchronous to NORMAL (recommended and ACID-safe with WAL mode)
    await client.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');

    // 4. Ensure Foreign Key constraints are actively enforced
    await client.$queryRawUnsafe('PRAGMA foreign_keys = ON;');

    // Query and verify runtime PRAGMAs
    const jmResult = (await client.$queryRawUnsafe('PRAGMA journal_mode;')) as [{ journal_mode: string }];
    const btResult = (await client.$queryRawUnsafe('PRAGMA busy_timeout;')) as [{ timeout: bigint | number }];
    const synResult = (await client.$queryRawUnsafe('PRAGMA synchronous;')) as [{ synchronous: bigint | number }];
    const fkResult = (await client.$queryRawUnsafe('PRAGMA foreign_keys;')) as [{ foreign_keys: bigint | number }];

    const status: SqlitePragmaStatus = {
      journal_mode: jmResult[0]?.journal_mode || 'unknown',
      busy_timeout: Number(btResult[0]?.timeout ?? 0),
      synchronous: Number(synResult[0]?.synchronous ?? 0),
      foreign_keys: Number(fkResult[0]?.foreign_keys ?? 0),
    };

    return status;
  } catch (error) {
    console.error('⚠️ Failed to initialize SQLite PRAGMAs:', error);
    throw error;
  }
}
