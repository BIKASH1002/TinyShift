import { userMessage } from './userMessage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import supabase from './supabaseClient';
import { RefreshSuggestion } from '../types';

export type SuggestionStatus = 'shown' | 'accepted' | 'rejected' | 'completed';

export interface AISuggestionRow {
  id: string;
  user_id: string;
  suggestion_text: string;
  reason: string | null;
  status: SuggestionStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface AISuggestionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  usedFallback?: boolean;
}

function getErrorMessage(error: unknown) {
  return userMessage(error, 'Something went wrong');
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapRowToRefreshSuggestion(row: AISuggestionRow): RefreshSuggestion {
  return {
    id: row.id,
    title: row.suggestion_text,
    reason: row.reason || 'A small routine refresh can help today feel lighter.',
    category: row.source === 'fallback' ? 'Gentle' : 'AI Refresh',
    icon: row.source === 'fallback' ? 'Leaf' : 'Sparkles',
  };
}

async function getAccessToken(): Promise<AISuggestionResult<string>> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { success: false, error: userMessage(error) };
  }

  const token = data.session?.access_token;

  if (!token) {
    return { success: false, error: 'Please log in before using AI suggestions.' };
  }

  return { success: true, data: token };
}

export async function generateRoutineSuggestions(): Promise<
  AISuggestionResult<RefreshSuggestion[]>
> {
  try {
    const tokenResult = await getAccessToken();

    if (!tokenResult.success || !tokenResult.data) {
      return { success: false, error: tokenResult.error };
    }

    const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // The Gemini key is not used here. Frontend only calls the Edge Function.
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-routine-suggestions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResult.data}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return {
        success: false,
        error: payload.error || 'Could not generate routine suggestions.',
      };
    }

    const rows = (payload.suggestions || []) as AISuggestionRow[];

    return {
      success: true,
      data: rows.map(mapRowToRefreshSuggestion),
      usedFallback: Boolean(payload.usedFallback),
    };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getTodaySuggestions(): Promise<AISuggestionResult<RefreshSuggestion[]>> {
  try {
    const today = getTodayDate();

    const { data, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return {
      success: true,
      data: ((data || []) as AISuggestionRow[]).map(mapRowToRefreshSuggestion),
    };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: SuggestionStatus,
): Promise<AISuggestionResult<AISuggestionRow>> {
  try {
    const { data, error } = await supabase
      .from('ai_suggestions')
      .update({ status })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    return { success: true, data: data as AISuggestionRow };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
