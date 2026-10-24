import type { Application } from 'express';

export declare function mountWorkspaceState(
  app: Application,
  options: {
    db: {
      prepare(sql: string): {
        all(...values: unknown[]): Promise<Record<string, unknown>[]>;
      };
    };
    records(workspaceId: string, kind: string): Promise<unknown[]>;
    ecosystemAdminEmails: string[];
  },
): void;
