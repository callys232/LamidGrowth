# Backend routes

Server-only Express modules live here. Do not import these modules into React components or the browser entry point. This is an Express backend directory, not a Next.js App Router.

| Module                           | Responsibility                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [app.mjs](./app.mjs)             | Application factory, middleware, authentication, workspaces, commercial records, administration, objectives, actions, reviews and exports |
| [workflows.mjs](./workflows.mjs) | Workflow runtime and routes, tool catalog, reminders and progress                                                                         |
| [knowledge.mjs](./knowledge.mjs) | Knowledge routes                                                                                                                          |
| [ai.mjs](./ai.mjs)               | AI review/settings routes and provider adapter                                                                                            |
| [policy.mjs](./policy.mjs)       | Shared permission checks                                                                                                                  |
| [frontend.mjs](./frontend.mjs)   | Production static-file/SPA routes and development Vite middleware                                                                         |

`server/index.mjs` starts the server and workflow timer. SQLite persistence remains in `server/store.mjs`. The development server and isolated browser test server both register their frontend delivery through `mountFrontend`, after the API handlers. Vite excludes `src/app` and `server` from browser source-file delivery.

Run commands and API URLs are unchanged: `npm run dev`, `npm run check`, and `npm run test:e2e`.

Move verification: production build and all 36 automated tests passed, along with seven targeted browser tests for account recovery, route/source isolation, workspace journeys and workflow execution. An isolated production smoke check also verified SPA routes, built assets, health and unauthenticated API rejection.
