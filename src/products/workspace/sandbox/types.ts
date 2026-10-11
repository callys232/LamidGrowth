import type { WorkspaceState } from '../../../types';
import type { Job } from '../../commercial/types';
import type { MilestoneFunding, Project } from '../../commercial/hooks/useProjectsPage';
import type {
  Credential,
  ExpertResult,
  JobMatch,
  TalentProfile,
} from '../../talent/hooks/useTalentPage';
import type { ActivityItem } from '../hooks/useActivityFeed';
import type { Dispute } from '../../commercial/pages/DisputesPage';
import type {
  Bid,
  JobWatch,
  Reputation,
  ScreeningResult,
  WatchMatch,
} from '../../talent/talentTypes';

/** Bump when SandboxData changes shape: stored sandboxes with another version are reseeded. */
export const SANDBOX_SCHEMA_VERSION = 2;

/** Everything one demo persona's workspace holds, in the shapes the real endpoints return. */
export type SandboxData = {
  /** When each notification was marked read in this demo session, keyed by notification id. */
  readNotices?: Record<string, string>;
  /** KPI values recorded in this demo session, keyed by KPI id. */
  kpiObservations?: Record<
    string,
    { id: string; value: number; observed_at: string; source: string; hasEvidence: boolean }[]
  >;
  /** Opportunities once the user has added or moved one; until then derived from marketplace. */
  opportunities?: {
    id: string;
    title: string;
    description: string;
    source: string;
    status: string;
    value_estimate: number | null;
    type: string | null;
    created_at: string;
    updated_at: string;
  }[];
  personal?: {
    profile?: { name: string; role: string; bio: string; timezone: string };
    payoutAccounts?: {
      id: string;
      provider: string;
      account_name: string;
      lastFour: string;
      bank_code: string;
      created_at: string;
    }[];
  };
  version: number;
  state: WorkspaceState;
  projects: Project[];
  /** Keyed by milestone id. A milestone with no entry has no funding yet. */
  fundings: Record<string, MilestoneFunding>;
  internalProjects: { id: string; title: string }[];
  talentProfile: TalentProfile | null;
  jobMatches: JobMatch[];
  /** Jobs this persona has posted (client side). */
  jobs: Job[];
  /** Ranked consultant matches, keyed by job id. */
  candidates: Record<string, ExpertResult[]>;
  invitations: Record<string, { freelancer_user_id: string; status: string }[]>;
  disputes: Dispute[];
  activity: ActivityItem[];
  /** Open marketplace jobs (other clients' posts) the freelancer side can search. */
  marketplace: Job[];
  /** The persona's own bids, with job titles joined as GET /bids/mine returns them. */
  bids: Bid[];
  watches: JobWatch[];
  /** Saved-search matches, keyed by watch id. */
  watchMatches: Record<string, WatchMatch[]>;
  /** Reputation per talent user id. */
  reputation: Record<string, Reputation>;
  /** Bid screening per posted job id (client side). */
  screening: Record<string, ScreeningResult[]>;
  /** The persona's own credentials (GET /talent/credentials/mine). */
  credentials: Credential[];
};
