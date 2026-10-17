// Edit the demo welcome email subject and message here.
// name and demoUrl are filled in when the email is sent.
export function demoWelcomeEmail({ name, demoUrl, signupUrl = demoUrl }) {
  return {
    subject: 'Welcome to LAMID ONE',
    text: `Hi ${name},

Thank you for trying the LAMID ONE demo. Your sample workspace is ready to explore. Choose a profile and discover how LAMID ONE can help you plan, make decisions, and move your work forward.

Confirm your email and open your demo: ${demoUrl}

The demo uses fictional sample data. No password or payment is required. Keep this personal link to return on another device and continue your saved demo. It expires in 30 days. Please do not share it.

Ready to create your own workspace? Use the same email address to get started: ${signupUrl}

If you did not request this demo, you can ignore this email.

We look forward to helping you accomplish more.

At your service,
The LAMID ONE Team`,
  };
}
