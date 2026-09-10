# Architecture decisions — foundation

These are the original foundation decisions. See [current implementation status](IMPLEMENTATION_STATUS.md) for the implemented membership model, durable local workflow runtime, optional AI adapter and remaining architecture requirements.

## 001: A modular application before distributed services

Use React and TypeScript for the interface, Vite for development/builds, and Express for a same-origin API. The interface, persistence, and domain enforcement have separate modules. A single deployment keeps the first operating cycle inspectable and avoids premature service boundaries.

The React application currently uses shared route components and a typed workspace context. As feature depth grows, split each domain into a feature module and load routes separately. Avoid promoting the current single-owner context into an enterprise authorization model.

## 002: Local SQLite as the first durable adapter

SQLite enables a real local persistence layer without requiring cloud credentials. Foreign keys, workspace indexes, WAL mode, immediate transactions, versioned records, and a schema-version marker are present. The first schema stores domain payloads as JSON with relational workspace ownership. This choice supports the local development increment; it is not the final enterprise data model.

Before team deployment, establish normalized domain migrations, a PostgreSQL adapter, explicit membership/role models, access-policy tests, tenant-isolation enforcement, backup/restore evidence, and a production-supported runtime. Preserve transaction semantics during migration.

## 003: The session is the authority boundary

The server looks up the workspace from the authenticated user. APIs do not accept a workspace scope from clients. Each account owns one workspace. A sample workspace has exactly the same isolation checks as an account workspace.

Client navigation is not an authorization boundary. Every mutation checks ownership on the server. Membership, delegation, multiple principals, policy inheritance, and enterprise roles require a separate model; they are not implied by selecting a Team or Enterprise starting context.

## 004: Domain transitions are enforced independently of UI controls

Actions start as Planned. Allowed transitions:

| Current state | Allowed next state                                                          |
| ------------- | --------------------------------------------------------------------------- |
| Planned       | In progress, Paused                                                         |
| In progress   | Needs review, Done (without review requirement), Paused                     |
| Needs review  | Done (explicit approval if required), In progress (explicit return), Paused |
| Paused        | Planned                                                                     |
| Done          | Terminal                                                                    |

Every update includes the version the caller reviewed. Stale updates fail with HTTP 409. Required approvals cannot be bypassed by calling the API directly. The decision, actor, prior version, and state change enter the audit log in the same transaction. This is a single-owner review mechanism, not multi-party separation of duties or commercial acceptance.

Objectives can be revised with the same optimistic concurrency check. An objective cannot become Complete while it has unfinished actions. Pausing an objective is an organizational state; individual action pauses remain explicit.

## 005: No simulated intelligence masquerading as AI

The Companion is a guided planning flow using the user's inputs. Saving creates an objective and optional action atomically. No generated analysis, confidence score, or external execution is fabricated. The UI identifies the current mode.

The next AI increment needs a provider adapter, source/evidence contracts, versioned prompt assets, evaluations, a model registry, budget limits, tool manifests, and server-side authorization. External work and consequential commitments require their own approval contracts; this build's action-completion control does not authorize payments or connectors.

## 006: Visual references guide identity, interaction work supplies behavior

Use the locked Midnight Blue `#0D1A2B`, Graphite Silver `#5A5F66`, Sandstone `#D8CFC4`, warm-white surfaces, and minimal signature red `#C12129`. Teal `#1CA8A8`, green `#2E8F4E`, and purple `#6A4FBF` are functional accents only. The source specifies font roles rather than named families: locally hosted DM Sans implements the humanist sans interface/body role; Instrument Serif is reserved for strategic headlines. Dense workspace headings use the sans family.

Motion for React supplies short tween-based context entrances, dialog entrances, button press feedback, and accordion disclosure. The global reduced-motion policy respects the user setting; explicit reduced-motion branches remove entrance and disclosure animation. There are no spring or perpetual decorative animations. The integration follows the [Motion accessibility guidance](https://motion.dev/docs/react-accessibility).

The ONE diagram uses a dynamically loaded Three.js scene with neutral sphere materials and concentric rings. Rendering is demand-driven: pointer response settles, hidden/offscreen scenes stop, reduced motion remains static, and the device pixel ratio is capped. CSS provides the loading/WebGL-loss fallback. Observers, listeners, GPU geometry, materials, and renderer resources are disposed when the scene unmounts, following the [Three.js resource cleanup guidance](https://threejs.org/manual/en/cleanup.html).

Native dialogs provide modal focus containment and Escape handling. Controls have labels, navigation states use router semantics, and reduced-motion preferences are respected. Responsive layouts are tested at desktop and mobile widths. Broader accessibility acceptance remains necessary.

## 007: Separate source coverage from implementation coverage

The 98 route specifications are retained as data. Editorial source extraction is reproducible and preserves paragraph references. A route's existence does not mean its feature is implemented. Content containing verification, publication, or implementation gates receives an availability view. Unimplemented workspace routes receive a roadmap view. No unsupported certification, financial offer, model capability, or integration is asserted as available.
