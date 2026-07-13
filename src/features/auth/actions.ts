'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn, signOut } from '@/auth';
import { credentialsSchema } from '@/features/auth/credentials';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const UNEXPECTED_SIGN_IN_MESSAGE =
  'Unable to sign in right now. Please try again.';

export type LoginActionState = {
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  formError?: string;
};

/**
 * Reads the supported login fields from untrusted browser form data.
 *
 * Non-string entries are converted to empty values so the shared Zod schema
 * can return the same operational field messages for every submission path.
 *
 * @param formData - Browser form data submitted by the login form.
 * @returns Raw email and password strings ready for schema validation.
 */
function readSubmittedCredentials(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  return {
    email: typeof email === 'string' ? email : '',
    password: typeof password === 'string' ? password : '',
  };
}

/**
 * Validates credentials on the server and establishes an Auth.js JWT session.
 *
 * Credential failures intentionally share one message so the action never
 * reveals whether an account exists, is inactive, or lacks a password hash.
 *
 * @param _previousState - Previous React action state supplied by useActionState.
 * @param formData - Untrusted login form data from the browser.
 * @returns Field or form errors when sign-in cannot be completed.
 */
export async function loginWithCredentials(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsedCredentials = credentialsSchema.safeParse(
    readSubmittedCredentials(formData),
  );

  if (!parsedCredentials.success) {
    const fieldErrors = parsedCredentials.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  try {
    await signIn('credentials', {
      ...parsedCredentials.data,
      redirect: false,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === 'CredentialsSignin') {
      return { formError: INVALID_CREDENTIALS_MESSAGE };
    }

    return { formError: UNEXPECTED_SIGN_IN_MESSAGE };
  }

  redirect('/dashboard');
}

/**
 * Clears the current Auth.js session and returns the user to the login page.
 */
export async function logout() {
  await signOut({ redirectTo: '/login' });
}
