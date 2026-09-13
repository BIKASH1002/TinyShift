// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type HabitRow = {
  id: string;
  name: string;
  category: string | null;
  frequency: string | null;
  anchor: string | null;
  normal_version: string | null;
  minimum_version: string | null;
};

type HabitLogRow = {
  habit_id: string;
  log_date: string;
  status: string;
  completion_method: string;
};

type GeminiSuggestion = {
  suggestion_text: string;
  reason: string | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const fallbackSuggestions: GeminiSuggestion[] = [
  {
    suggestion_text: 'Move one habit five minutes earlier today.',
    reason: 'A tiny timing change can make the routine feel fresh.',
  },
  {
    suggestion_text: 'Pair one habit with a favorite drink.',
    reason: 'A pleasant cue can make starting feel easier.',
  },
  {
    suggestion_text: 'Try one habit in a calmer spot.',
    reason: 'A small environment change can reduce routine fatigue.',
  },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function buildPrompt(habits: HabitRow[], logs: HabitLogRow[]) {
  const habitSummary = habits
    .map((habit) => {
      const anchor = habit.anchor || 'an existing routine';
      return `- ${habit.name} (${habit.category || 'General'}, ${habit.frequency || 'Daily'}, anchor: ${anchor}, normal: ${habit.normal_version || habit.name}, minimum: ${habit.minimum_version || 'one tiny step'})`;
    })
    .join('\n');

  const logSummary = logs
    .slice(0, 30)
    .map(
      (log) =>
        `- ${log.log_date}: habit ${log.habit_id} was ${log.status} by ${log.completion_method}`,
    )
    .join('\n');

  return `
You are helping a habit app called TinyShift suggest gentle routine refresh ideas.

User's active habits:
${habitSummary || '- No active habits yet'}

Recent habit logs:
${logSummary || '- No recent logs yet'}

Return JSON only in this exact shape:
{
  "suggestions": [
    {
      "suggestion_text": "short suggestion",
      "reason": "short reason"
    }
  ]
}

Rules:
- Give 3 to 5 specific, small routine adjustments using anchors and minimum versions.
- Keep suggestions simple, realistic, and low-pressure.
- No medical advice.
- No extreme productivity advice.
- Each suggestion must be under 20 words.
- Include a short reason for each suggestion.
`;
}

function cleanSuggestion(item: Partial<GeminiSuggestion>): GeminiSuggestion | null {
  const suggestionText = String(item.suggestion_text || '').trim();
  const reason = item.reason ? String(item.reason).trim() : null;

  if (!suggestionText) {
    return null;
  }

  const shortenedText = suggestionText.split(/\s+/).slice(0, 20).join(' ');

  return {
    suggestion_text: shortenedText,
    reason,
  };
}

function parseGeminiText(text: string): GeminiSuggestion[] {
  try {
    const trimmed = text.trim();
    const withoutFence = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(withoutFence);
    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    return rawSuggestions
      .map(cleanSuggestion)
      .filter((item): item is GeminiSuggestion => Boolean(item))
      .slice(0, 5);
  } catch (_error) {
    return [];
  }
}

async function callGemini(prompt: string): Promise<GeminiSuggestion[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const suggestions = parseGeminiText(text);

  if (suggestions.length === 0) {
    throw new Error('Gemini returned no usable suggestions');
  }

  return suggestions;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Use POST for this function.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Supabase environment variables are missing.' }, 500);
    }

    if (!authHeader) {
      return jsonResponse({ error: 'Please log in before generating suggestions.' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Please log in before generating suggestions.' }, 401);
    }

    const { data: habits, error: habitError } = await supabase
      .from('habits')
      .select('id, name, category, frequency, anchor, normal_version, minimum_version')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (habitError) {
      return jsonResponse({ error: habitError.message }, 400);
    }

    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data: logs, error: logError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, status, completion_method')
      .eq('user_id', user.id)
      .gte('log_date', since.toISOString().slice(0, 10))
      .order('log_date', { ascending: false })
      .limit(30);

    if (logError) {
      return jsonResponse({ error: logError.message }, 400);
    }

    let suggestions = fallbackSuggestions;
    let usedFallback = false;

    try {
      suggestions = await callGemini(buildPrompt(habits || [], logs || []));
    } catch (error) {
      usedFallback = true;
      console.error('Gemini failed, using fallback suggestions:', error);
    }

    const rowsToInsert = suggestions.map((suggestion) => ({
      user_id: user.id,
      suggestion_text: suggestion.suggestion_text,
      reason: suggestion.reason,
      status: 'shown',
      source: usedFallback ? 'fallback' : 'gemini',
    }));

    const { data: savedSuggestions, error: insertError } = await supabase
      .from('ai_suggestions')
      .insert(rowsToInsert)
      .select('*');

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 400);
    }

    return jsonResponse({
      success: true,
      usedFallback,
      message: usedFallback
        ? 'AI was unavailable, so TinyShift prepared some simple suggestions.'
        : 'Routine suggestions generated.',
      suggestions: savedSuggestions || [],
    });
  } catch (error) {
    console.error('Unexpected function error:', error);

    return jsonResponse(
      {
        success: false,
        error: 'Could not generate suggestions right now. Please try again soon.',
      },
      500,
    );
  }
});
