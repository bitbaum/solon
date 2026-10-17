"use client";

import {
  AccountPanel,
  SignInForm,
  SignUpForm,
  type AuthClasses,
  type AuthLabels,
} from "@bitbaum/accountkit/auth/react";
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { authClient } from "@/lib/auth/client";

/**
 * The fleet's account screens (@bitbaum/accountkit/auth/react) in Solon's
 * look. The logic and the words are the package's, the same in every product.
 * A plain <a>, never a prefetching <Link>, for the links between them.
 */
const CLASSES: Partial<AuthClasses> = {
  stack: "flex flex-col gap-5",
  field: "flex flex-col gap-2",
  label: "text-sm font-semibold text-fg-primary",
  hint: "text-sm leading-relaxed text-fg-secondary",
  input: "field",
  button: "btn-primary min-h-12",
  buttonQuiet: "btn-secondary min-h-12",
  notice:
    "rounded-control border border-default bg-surface-base px-4 py-3 text-sm leading-relaxed text-fg-secondary",
  error: "text-sm text-status-negative",
  divider:
    "flex items-center gap-3 text-xs font-semibold uppercase tracking-caps text-fg-tertiary before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle",
  section: "flex flex-col gap-4 border-t border-default pt-8",
  sectionTitle: "text-sm font-semibold uppercase tracking-caps text-fg-secondary",
  link: "break-all text-fg-primary underline underline-offset-4",
  check: "flex min-h-11 items-center gap-3 text-sm text-fg-secondary",
};

const textLink = "text-fg-primary underline underline-offset-4";

export function SolonSignIn(props: {
  labels: AuthLabels;
  methods: SignInMethods;
  next: string;
  signInPath: string;
  signUpHref: string;
  initialError: boolean;
}) {
  return (
    <SignInForm
      client={authClient}
      classes={CLASSES}
      labels={props.labels}
      methods={props.methods}
      next={props.next}
      signInPath={props.signInPath}
      initialError={props.initialError}
      signUpLink={
        <a href={props.signUpHref} className={textLink}>
          {props.labels.createAccount}
        </a>
      }
    />
  );
}

export function SolonSignUp(props: {
  labels: AuthLabels;
  methods: SignInMethods;
  next: string;
  signUpPath: string;
  signInHref: string;
}) {
  return (
    <SignUpForm
      client={authClient}
      classes={CLASSES}
      labels={props.labels}
      methods={props.methods}
      next={props.next}
      signUpPath={props.signUpPath}
      signInLink={
        <a href={props.signInHref} className={textLink}>
          {props.labels.signIn}
        </a>
      }
    />
  );
}

export function SolonAccount(props: {
  labels: AuthLabels;
  methods: SignInMethods;
  user: {
    name: string;
    email: string | null;
    emailVerified: boolean;
    role: string;
    twoFactorEnabled: boolean;
  };
  linked: string[];
  accountPath: string;
  homePath: string;
}) {
  return <AccountPanel client={authClient} classes={CLASSES} {...props} />;
}
