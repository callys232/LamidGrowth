import { Cable, Radio, ClipboardList, Cpu, Mail, CreditCard, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ToolReadMore } from '../../../../shared/content/ToolReadMore';
import content from './content.json';
import './integrations.css';

const connections = [
  {
    name: 'Slack',
    label: 'Account connection',
    Icon: Cable,
    description:
      'Connect your Slack workspace and import a snapshot of public-channel names and membership counts.',
    details: [
      'Choose Connect Slack in your workspace integrations.',
      'Authorize public-channel access with Slack.',
      'Import and review up to 100 public channels. Disconnect to revoke access.',
    ],
    scope:
      'Requires administrator OAuth setup. This connection reads channel details; it does not read messages or send notifications.',
    to: '/os/integrations',
    cta: 'Connect Slack',
  },
  {
    name: 'Salesforce',
    label: 'Account connection',
    Icon: Radio,
    description:
      'Connect your Salesforce organization and import contacts and opportunities for review.',
    details: [
      'Choose Connect Salesforce in your workspace integrations.',
      'Authorize access with Salesforce using your organization account.',
      'Import a read-only snapshot of up to 100 contacts and 100 opportunities.',
    ],
    scope:
      'Requires administrator OAuth setup and Salesforce API access. Imports are started by you; this connection does not change records in Salesforce.',
    to: '/os/integrations',
    cta: 'Connect Salesforce',
  },
  {
    name: 'Custom webhooks',
    label: 'Inbound connection',
    Icon: Cable,
    description:
      'Bring events from an external system into your workspace through a signed webhook.',
    details: [
      'Register a webhook connector in your workspace and save its signing secret.',
      'Your system sends a signed JSON payload to the connector endpoint.',
      'Accepted events are recorded in the workspace event feed, with the latest receipt time and connector status.',
    ],
    scope:
      'Requires custom setup in the sending system. Receiving an event does not automatically update CRM, finance, or people records.',
    to: '/os/integrations',
    cta: 'Set up a connector',
  },
  {
    name: 'Workspace event feed',
    label: 'API connection',
    Icon: Radio,
    description: 'Let your own application read workspace events and keep track of changes.',
    details: [
      'Read events using the authenticated API and a sequence cursor.',
      'Events include objective stage changes, milestone decisions, recommendation status changes, and received connector payloads.',
      'Build your own consumer to process events in your external system.',
    ],
    scope:
      'A polled event feed. Automatic delivery to external services needs your own integration code.',
    to: '/developers/api',
    cta: 'Explore the API',
  },
  {
    name: 'Manual connections',
    label: 'Connection tracking',
    Icon: ClipboardList,
    description: 'Keep a record of a connection that your team operates outside LAMID ONE.',
    details: [
      'Register a manual connector with a name.',
      'Track connected, disconnected, or error status.',
      'Record and revoke scope grants, and remove the connector when it is no longer needed.',
    ],
    scope:
      'Tracks the connection and its recorded permissions. It does not exchange data with an external service.',
    to: '/os/integrations',
    cta: 'Manage connections',
  },
];
const services = [
  {
    name: 'AI services',
    Icon: Cpu,
    providers: ['Google Gemini', 'OpenAI', 'Anthropic'],
    description: 'Provider adapters support AI requests used by the platform.',
    detail:
      'An administrator configures provider credentials and models. Requests can fall back between configured providers. These are platform services, not personal accounts connected from your workspace.',
  },
  {
    name: 'Email services',
    Icon: Mail,
    providers: ['Resend', 'SendGrid'],
    description: 'Email delivery adapters support messages sent by the platform.',
    detail:
      'An administrator configures the sending service and sender address. This sends platform email; it does not connect or read your personal inbox.',
  },
  {
    name: 'Payment services',
    Icon: CreditCard,
    providers: ['Paystack', 'USDT payment flow'],
    description: 'Payment adapters support platform payment and funding flows.',
    detail:
      'Paystack support includes payment initialization and transfer operations. A separate USDT payment flow requires server configuration. Available payment options depend on deployment setup; these do not import your accounting records.',
  },
];

export function IntegrationDirectory() {
  return (
    <div className="integration-directory" id="integration-directory">
      <header className="integration-directory-heading">
        <span className="integration-kicker">CONNECT YOUR WORK</span>
        <h2>Ways to connect with LAMID ONE</h2>
        <p>
          Choose a custom connection, read workspace events, or track a connection your team
          manages.
        </p>
      </header>
      <div className="integration-grid">
        {connections.map(({ Icon, ...item }) => (
          <article className="integration-card" key={item.name} tabIndex={0}>
            <div className="integration-card-top">
              <Icon size={27} aria-hidden="true" />
              <span>{item.label}</span>
            </div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <ToolReadMore label={item.name}>
              <ol>
                {item.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ol>
              <p className="integration-scope">{item.scope}</p>
              <Link to={item.to} className="integration-link">
                {item.cta}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </ToolReadMore>
          </article>
        ))}
      </div>
      <section className="integration-context">
        <div>
          <h2 data-source-paragraph={967}>{content.sections[0].title}</h2>
          <ul>
            {content.sections[0].paragraphs.slice(1).map((p) => (
              <li key={p.sourceParagraph} data-source-paragraph={p.sourceParagraph}>
                {p.text.replace(/^\u2022\s*/, '')}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p>
            Salesforce provides a direct CRM connection. Other finance and people systems can
            contribute context through a custom connection. Slack adds public-channel context
            through account authorization.
          </p>
          <Link className="integration-link" to="/enterprise/contact">
            Discuss your integration needs
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="integration-services">
        <header className="integration-directory-heading">
          <span className="integration-kicker">PLATFORM SERVICES</span>
          <h2>Services behind the experience</h2>
          <p>
            These adapters are configured by the platform administrator. Availability depends on the
            deployment configuration.
          </p>
        </header>
        <div className="integration-grid">
          {services.map(({ Icon, ...service }) => (
            <article
              className="integration-card integration-service-card"
              key={service.name}
              tabIndex={0}
            >
              <div className="integration-card-top">
                <Icon size={25} aria-hidden="true" />
                <span>Administrator configured</span>
              </div>
              <h3>{service.name}</h3>
              <div className="integration-provider-tags">
                {service.providers.map((provider) => (
                  <span key={provider}>{provider}</span>
                ))}
              </div>
              <p>{service.description}</p>
              <ToolReadMore label={service.name}>
                <p>{service.detail}</p>
              </ToolReadMore>
            </article>
          ))}
        </div>
      </section>
      <section className="integration-control">
        <div>
          <span className="integration-kicker">YOUR CONNECTIONS, IN VIEW</span>
          <h2 data-source-paragraph={971}>{content.sections[1].title}</h2>
          <p data-source-paragraph={972}>{content.sections[1].paragraphs[1].text}</p>
          <Link className="button button-primary" to="/os/integrations">
            Manage your connections
          </Link>
        </div>
        <div className="integration-control-points">
          <div>
            <strong>Status &amp; freshness</strong>
            <p>View connection status and the last recorded update or received webhook.</p>
          </div>
          <div>
            <strong>Recorded scopes</strong>
            <p>Add and revoke scope grants in your connection register.</p>
          </div>
          <div>
            <strong>Remove a connection</strong>
            <p>
              Delete a connector to remove it and its grant records. Its webhook endpoint then stops
              accepting events.
            </p>
          </div>
        </div>
      </section>
      <footer className="integration-closing">
        <h2 data-source-paragraph={973}>{content.sections[2].title}</h2>
        <p data-source-paragraph={974}>{content.sections[2].paragraphs[1].text}</p>
        <Link className="integration-link" to="/developers/webhooks">
          Explore webhook guidance
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
