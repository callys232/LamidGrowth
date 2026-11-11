/** Approved public language for the LAMID ONE platform and how it is used. */
export const platformMessaging = {
  description:
    'LAMID ONE brings relevant guidance, decision engines, and executive advisory support into one connected platform. Contextual intelligence suggests, explains, and prepares. You direct what happens next.',
  humanControl:
    'You set the objective, review recommendations, and approve consequential work. Advisers can join when you want their perspective.',
  visitorPaths: [
    {
      title: 'Explore it yourself',
      description: 'Try the live engine experience with your own questions.',
      label: 'Explore the live demo',
      href: '/demo',
    },
    {
      title: 'Talk with an adviser',
      description: 'Discuss your goals and the support that would help.',
      label: 'Talk with an adviser',
      href: '/contact',
    },
  ],
} as const;
