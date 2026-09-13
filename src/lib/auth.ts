import { userMessage } from './userMessage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import supabase from './supabaseClient';
import { Session, User } from '@supabase/supabase-js';

export interface AuthResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CreateUserProfileInput {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

function getErrorMessage(error: unknown) {
  return userMessage(error, 'Something went wrong');
}

export async function createUserProfile({
  id,
  fullName,
  email,
  avatarUrl = null,
}: CreateUserProfileInput): Promise<AuthResult> {
  try {
    const { error } = await supabase.from('profiles').upsert({
      id,
      full_name: fullName,
      email,
      avatar_url: avatarUrl,
    });

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function signUpUser(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    if (data.user && data.session) {
      const profileResult = await createUserProfile({
        id: data.user.id,
        fullName,
        email,
      });

      if (!profileResult.success) {
        return profileResult;
      }
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResult<{ user: User; session: Session }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function logoutUser(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getCurrentUser(): Promise<AuthResult<{ user: User | null }>> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getCurrentSession(): Promise<AuthResult<{ session: Session | null }>> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
