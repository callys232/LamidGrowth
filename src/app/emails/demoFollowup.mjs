export function demoFollowupEmail({ name, demoUrl, signupUrl, unsubscribeUrl }) {
  return {
    subject: 'Continue exploring LAMID ONE',
    text: `Hi ${name},

Ready for your next step? Return to your saved demo and try setting a goal, reviewing a project, or running a decision tool.

Continue your demo: ${demoUrl}

When you are ready to work with your own data, create an account: ${signupUrl}

You received this reminder because you requested a demo follow-up.
Stop demo reminders: ${unsubscribeUrl}

At your service,
The LAMID ONE Team`,
  };
}
