// Account verification and recovery copy is maintained separately from account logic.
export function accountAccessEmail({ purpose, code, link }) {
  return {
    subject:
      purpose === 'verification'
        ? 'Verify your LAMID ONE account'
        : 'Reset your LAMID ONE password',
    text:
      purpose === 'verification'
        ? `Your verification code is ${code}. It expires in 10 minutes.\n\nYou can also verify here: ${link}\n\nIf you did not request this, ignore this email.`
        : `Reset your password using this single-use link, valid for 10 minutes:\n${link}\n\nIf you did not request this, ignore this email.`,
  };
}
