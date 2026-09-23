# Accounts

Product-owned pages and components. [Editing guide](../../../docs/PAGE_COMPONENT_GUIDE.md) · [All products](../README.md)

## Interactive pages

- [AuthPage.tsx](./pages/AuthPage.tsx)
- [PasswordRecovery.tsx](./pages/PasswordRecovery.tsx)
- [ResetPassword.tsx](./pages/ResetPassword.tsx)
- [VerifyAccount.tsx](./pages/VerifyAccount.tsx)

## Slides

- [AccountVisualSlide.tsx](./slides/AccountVisualSlide.tsx)
- [AuthIntroductionSlide.tsx](./slides/AuthIntroductionSlide.tsx)
- [AuthMainSlide.tsx](./slides/AuthMainSlide.tsx)
- [PasswordRecoveryFormSlide.tsx](./slides/PasswordRecoveryFormSlide.tsx)
- [ResetPasswordFormSlide.tsx](./slides/ResetPasswordFormSlide.tsx)
- [VerifyAccountVerificationSlide.tsx](./slides/VerifyAccountVerificationSlide.tsx)

## Components

- [AccountContextChoices.tsx](./components/AccountContextChoices.tsx)
- [AccountCredentialsForm.tsx](./components/AccountCredentialsForm.tsx)
- [ArrowUpRightText.tsx](./components/ArrowUpRightText.tsx)
- [contextIcons.ts](./components/contextIcons.ts)

## Hooks

- [useAuthPage.ts](./hooks/useAuthPage.ts)
- [usePasswordRecoveryPage.ts](./hooks/usePasswordRecoveryPage.ts)
- [useResetPasswordPage.ts](./hooks/useResetPasswordPage.ts)
- [useVerifyAccountPage.ts](./hooks/useVerifyAccountPage.ts)

## Document pages

Each page folder contains its composition, named slides, and editable `content.json`.

| Route            | Page composition                                                                     | Copy                                                 |
| ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| /start           | [StartDocumentPage](./pages/start/StartDocumentPage.tsx)                             | [content.json](./pages/start/content.json)           |
| /login           | [LoginDocumentPage](./pages/login/LoginDocumentPage.tsx)                             | [content.json](./pages/login/content.json)           |
| /signup          | [SignupDocumentPage](./pages/signup/SignupDocumentPage.tsx)                          | [content.json](./pages/signup/content.json)          |
| /forgot-password | [ForgotPasswordDocumentPage](./pages/forgot-password/ForgotPasswordDocumentPage.tsx) | [content.json](./pages/forgot-password/content.json) |
| /reset-password  | [ResetPasswordDocumentPage](./pages/reset-password/ResetPasswordDocumentPage.tsx)    | [content.json](./pages/reset-password/content.json)  |
| /verify          | [VerifyDocumentPage](./pages/verify/VerifyDocumentPage.tsx)                          | [content.json](./pages/verify/content.json)          |
| /onboarding      | [OnboardingDocumentPage](./pages/onboarding/OnboardingDocumentPage.tsx)              | [content.json](./pages/onboarding/content.json)      |
| /os/profile      | [OsProfileDocumentPage](./pages/os-profile/OsProfileDocumentPage.tsx)                | [content.json](./pages/os-profile/content.json)      |
