import {
  BriefcaseBusiness,
  Building2,
  HeartHandshake,
  Lightbulb,
  Palette,
  Store,
  UserRound,
  UsersRound,
} from 'lucide-react';
import './audience-context-illustration.css';

const audienceIcons = {
  individuals: UserRound,
  professionals: BriefcaseBusiness,
  creators: Palette,
  founders: Lightbulb,
  teams: UsersRound,
  smes: Store,
  organisations: Building2,
  social: HeartHandshake,
} as const;

/** A quiet, illustrative context marker; it avoids implying a real customer or case study. */
export function AudienceContextIllustration({
  audienceId,
  audienceName,
  ratio = '4 / 3',
}: {
  audienceId: string;
  audienceName: string;
  ratio?: string;
}) {
  const Icon = audienceIcons[audienceId as keyof typeof audienceIcons] ?? UsersRound;

  return (
    <div
      className="aud-context-visual"
      data-audience={audienceId}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={`Illustration representing ${audienceName.toLowerCase()} and a connected path from clarity to action`}
    >
      <div className="aud-context-orbit aud-context-orbit--outer" />
      <div className="aud-context-orbit aud-context-orbit--inner" />
      <div className="aud-context-node aud-context-node--one" />
      <div className="aud-context-node aud-context-node--two" />
      <div className="aud-context-node aud-context-node--three" />
      <div className="aud-context-panel">
        <span className="aud-context-icon">
          <Icon size={36} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <svg viewBox="0 0 224 54" aria-hidden="true">
          <path className="aud-context-path" d="M14 27h196" />
          <circle cx="24" cy="27" r="7" className="aud-context-dot aud-context-dot--one" />
          <circle cx="112" cy="27" r="7" className="aud-context-dot aud-context-dot--two" />
          <circle cx="200" cy="27" r="7" className="aud-context-dot aud-context-dot--three" />
        </svg>
      </div>
    </div>
  );
}
