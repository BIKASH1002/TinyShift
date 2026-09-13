# TinyShift manual test guide

## Current interface checks

This guide retains earlier feature scenarios. For current installation, use
[README.md](README.md). Where older steps say Save profile, use the tick beside
the profile name. The permanent Reload profile control has been removed; Try again
appears only after a loading failure. For a stale-save conflict, leave Profile and
return after confirming you no longer need the unsaved values.

1. Onboarding: switch Low energy and Good energy. Only the example changes; nothing is saved.
2. Profile: click the pencil beside the centered name, edit and select the tick.
   Verify Cancel and Escape preserve the saved name. Check an empty name is rejected.
3. Add/change/remove a profile photo, then use the tick to save. Navigate away and back.
4. Sign out from the desktop sidebar or mobile header. Confirm account deletion is
   isolated below Account and privacy and still requires password and typed confirmation.
5. Check all five tabs at desktop and mobile widths, including keyboard navigation,
   tooltips, reduced motion, long names and slow/offline connections.
6. Visit each tab, return to it and check cached content appears promptly. Change a
   habit, complete it and undo it; affected screens must show the updated data.
7. Leave a profile/reflection edit unsaved, switch windows for a minute and return.
   Background refresh must not replace the edit. Sign out and use a second account;
   the previous account's cached information must never appear.

## Before public release

- Verify all ten numbered database scripts, access policies and four current Edge
  Functions in the hosted project. Review any deployed legacy endpoints separately.
- Verify production Site URL, recovery redirects, email verification, SMTP delivery,
  password policy and expired/reused recovery links.
- Enable and monitor Cron if reminders are offered. Check scheduler errors and opt-out.
- Use disposable accounts to verify export, deletion and account isolation.
- Review privacy disclosures, provider retention, support procedures and MFA limitations.
- Configure redacted monitoring, backups and restore procedures, provider spending
  controls and abuse prevention. Verify HTTPS and appropriate hosting security headers.
- Run dependency/security checks and representative load tests before public launch.
  Local implementation alone is not production verification.

## Automated browser checks

Start Vite on port 3017, install Python Playwright 1.62.0 and its Chromium browser,
then run `python scripts/test-ui.py`. Set `TINYSHIFT_TEST_PROJECT_REF` to the
project reference configured in the frontend. External requests are mocked; no real
account is used. See `.github/workflows/checks.yml` for the complete automated suite.

## Roadmap Part 3: AI habit adjustments

Implemented locally; hosted migration/function deployment and live browser/AI testing are pending.
Setup and acceptance steps are in section 12 below. No habit changes automatically.

## Roadmap Part 1: persistent profile (September 7)

Requires the existing 001_profiles.sql migration; no new hosted migration is needed.

1. Open Profile. Expect your saved name (or signup name) and signed-in email, not a sample
   photo or unsupported rhythm/tiny-wins statistics.
2. Change the name, Save profile, then refresh. Expect the saved name to persist.
3. Sign out and back in: the same saved name should load. Another account must show its own name.
4. Try whitespace-only input: expect a validation error. The maximum name length is 100 characters.
5. Go offline and save: expect an error without a success message; your unsaved input remains.
   Reconnect and retry.
6. Load Profile in two tabs. Save in A, then save a different name in B. B must report a
   conflict. Reload profile (confirm discarding unsaved edits), then save again.
7. If profile loading fails, restore connectivity and select Reload profile.
8. For an older test account missing its profiles row, saving should create its own row.
   Do not delete real account data to simulate this; use a disposable test account.

Only the display name is editable in this part. Email changes, avatar uploads, password
recovery, and account deletion remain separate work. Browser navigation away discards an
unsaved edit; only Save profile persists it.

## 1. Prepare Supabase and start the app

Use a dedicated test account so sample history does not affect your personal habits.

1. In Supabase SQL Editor, run the existing migrations if not already installed:
   001_profiles.sql, 002_habits.sql, 003_ai_suggestions.sql,
   004_weekly_reflections.sql, 005_adaptive_habits.sql.
2. Run backend/sql/006_weekly_planning.sql. It creates daily_contexts,
   routine_proposals, and the atomic decide_routine_proposal function.
3. Ensure backend/.env contains EXPO_PUBLIC_SUPABASE_URL and
   EXPO_PUBLIC_SUPABASE_ANON_KEY for that project. Vite loads backend/.env, not the root .env.
4. From the project directory in WSL, run npm run dev and open http://localhost:3000.
   If npm still reports Cannot find module ../lib/cli.js, use:

   node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000

5. Sign up or sign in. Complete email verification if your Supabase project requires it.

Daily planning and weekly adjustments use deterministic rules and require no Gemini key or Edge Function deployment.
The old Gemini service remains in the repository but is not used by Today or Adjust.

## 2. First habit and daily plan

1. Open Today > Create a habit.
2. Enter Read, anchor After breakfast, normal Read 20 pages, minimum Read one page,
   frequency Daily. Save.
3. Expect the habit on Today. Refresh the browser: it must remain.
4. Set energy Steady and time 30 minutes. Click Update my plan.
   Expect Read 20 pages for a habit with no difficulty history.
5. Set energy Low and save. Expect Read one page with a low-energy explanation.
6. Refresh: the Low selection and tiny plan must persist.
7. Set energy High and time 5 minutes. Save. Expect the tiny version because time is limited.
8. Set energy High and time 30 minutes. Save. A new habit returns to the normal version.
9. Check the habits table: these context changes must not change normal_version or minimum_version.

## 3. Completion and Rescue Mode

1. On an incomplete habit, click Done: normal version. Refresh.
   Expect Completed (normal), without a second completion button.
2. Create another Daily habit. Set Low energy, save, then click Done: tiny version.
   Expect Completed (minimum) and one habit_logs row for this habit/date.
3. Create a third habit and open Rescue / skip.
4. Select a reason and click Skip today and save why.
   Expect a success message only after saving. The skipped habit leaves Rescue.
5. Return to Today. Expect the skip reason. Complete it if you decide to return to it.
   Expect the same habit/date row to become done, with skip_reason cleared.
6. For another pending habit, use I completed the tiny version in Rescue.
   Expect a persisted minimum completion. Choosing Rescue itself must not record a completion.
7. While a request is pending, action buttons must be disabled.

## 4. Test weekly learning immediately

1. In Authentication > Users, copy your dedicated test account ID.
2. Open backend/sql/manual_test_history.sql, replace the all-zero test_user UUID,
   and run it in SQL Editor. The script uses Asia/Kolkata; change that timezone if needed.
   Run as postgres with the test UUID supplied, or as authenticated with your test user
   selected/impersonated in the editor. In the latter case the unedited script uses
   auth.uid() automatically. Merely choosing the authenticated role without a user
   is insufficient. Do not grant SELECT on auth.users to authenticated.
3. It creates four [TEST] habits and nine logs for the last completed week.
   It does not alter your existing habits and refuses duplicate seeding.
4. Open Adjust. Expected:

| Habit | Last completed week | Expected proposal |
| --- | --- | --- |
| [TEST] Read | 3 completed, all tiny; 4 unlogged | Normal target becomes Read one page |
| [TEST] Stretch | 3 skips due to forgetting; 4 unlogged | Cue becomes Immediately after lunch |
| [TEST] Journal | 3 normal completions; 4 unlogged | No change |
| [TEST] New habit | 0 prior-week opportunities | Insufficient history; no change |

Missing records must not be displayed as skips. Normal and tiny completions both count as completed.
Today uses a rolling seven-day history, so its history-based recommendation may differ from the
last-completed-week summary. Low energy or five minutes always requests a tiny daily version.

## 5. Accept and reject

1. Accept the Read proposal. Expect Decision: accepted.
2. Refresh and revisit Adjust: the decision remains, without another Accept button.
3. Check habits.normal_version: it should be Read one page. The anchor stays unchanged.
4. On Today, save High energy and 30 minutes. The regular target now uses the accepted text.
5. On Stretch, click Keep current. Expect Decision: rejected.
6. Refresh: the rejection remains and Stretch's anchor is still After lunch.
7. Reopening Adjust must not create duplicate proposals. There is at most one per habit/week.
8. Optional stale-preview test using another pending proposal: change its corresponding habit
   field in SQL Editor, then click Accept in the app. Expect an error and no overwrite.

Proposals are generated when you open Adjust, using the last completed Monday-Sunday week,
or by the opted-in Part 4 scheduler after its hosted setup. Accepted changes apply immediately and remain
in future daily plans. This version proposes target-size or cue changes, not new calendar schedules.

## 6. Reflection, dates, and errors

1. Open Reflect. Counts must reflect the current week, with no sample chart values.
2. Write and save a reflection. Refresh: the text remains. Edit and save again:
   only one weekly_reflections row should exist for this user/week.
3. Create a Weekdays habit. It should be absent from Today on Saturday/Sunday.
4. Leave Today open across local midnight or return focus afterward. Within 30 seconds,
   the displayed date and context should change to the new local day.
5. Turn browser DevTools Network to Offline, then attempt a save. Expect an error,
   no success message, and no silent change. Restore Online and retry.
6. Sign out, then sign in with a second account. No first-account context, habits,
   reflections, or proposals should be shown.
7. Check at narrow phone width and desktop width. Scroll to the last action and confirm
   navigation does not cover it. Use keyboard Tab to reach fields and action buttons.

## 7. What to report

### Deleting a habit

1. Open Today and scroll to Manage habits. All active habits appear, including Weekdays habits on weekends.
2. Click Delete beside a habit, then Cancel. It must remain unchanged.
3. Click Delete again and Confirm delete. It must disappear from the plan and Manage habits.
4. Refresh and open Rescue and Adjust: the habit and its proposals must remain absent.
5. Past completion logs and saved reflections remain. Deletion sets is_active=false; it does not erase history.
6. Try with a completed habit too. Deletion should still be available.
7. If saving fails, expect an error and no success message. Restore connectivity and retry.

For each failure, record the step, expected behavior, actual behavior, browser/device,
and visible error. For product feedback, note whether the smaller action felt useful,
the evidence was understandable, and accepting the adjustment felt worthwhile.

## Developer checks

- node scripts/test-routines.mjs
- node scripts/test-ai.mjs (mocked provider and authentication; no API charges)
- node scripts/test-weekly-ai.mjs (weekly date/evidence and mocked endpoint checks; no API charges)
- node scripts/test-adjustment-ai.mjs (mocked adjustment endpoint, persistence and failure checks)
- node scripts/test-account.mjs (mocked deletion Auth and recovery service checks)
- node scripts/test-release.mjs (public environment validation)
- node node_modules/typescript/bin/tsc --noEmit
- node node_modules/vite/bin/vite.js build
- sh scripts/test-database.sh (WSL/Linux with PostgreSQL 16 installed)

The database script creates its own temporary cluster and tests migration reruns, acceptance,
rejection, duplicate acceptance, stale proposals, and cross-user isolation. It does not touch Supabase.

Still outside this iteration: push/email delivery, calendar rescheduling,
long-term effectiveness comparisons, full account lifecycle, and production deployment.

## 8. Habit editing and undo

1. Today > Manage habits > Edit. Change the name, anchor, normal version, tiny version,
   motivation, category and schedule. Save changes and refresh: all values should persist.
   No duplicate habit should appear; existing logs remain.
2. Edit again, change something, then Cancel: the saved habit must stay unchanged.
3. Try an empty or whitespace-only required field: saving must fail with feedback.
4. Open the same habit's editor in two browser tabs. Save in tab A, then save in tab B.
   Tab B must report that the habit changed and must not overwrite A. Reopen to load A's changes.
5. Complete a habit on Today. Click Undo completion: it becomes pending and Reflect's
   completion count decreases. Refresh to confirm. Repeat for a tiny completion.
6. Skip through Rescue, return to Today, then Undo skip. The skip reason and today's log
   should be removed, not the habit or older history. Completing it again must work.
7. Change a habit with today's log to Weekdays on a weekend. Manage habits should still
   offer Undo today's record even though the habit is absent from the daily plan.
8. With two tabs showing the same log, undo in A and complete it again. Undo the old record
   from B: expect a stale-record error, not removal of the new completion.
9. Repeat edit/undo offline: expect an error, no apparent success. Retry after reconnecting.
10. Sign into another account: the first account's habits and logs must remain inaccessible.

Undo here means undoing today's completion or skip; it does not restore deleted habits
or provide revision history for edits. Deletion still archives a habit and preserves past logs.

## 9. Enable AI-assisted creation

This setup has not been applied to your hosted project by this implementation.
Manual creation, editing, and undo do not depend on AI setup.

1. Run backend/sql/007_ai_request_limits.sql in Supabase SQL Editor after the earlier
   migrations. It adds a private per-user quota table and an authenticated reservation RPC.
2. In Supabase Edge Function secrets, set GEMINI_API_KEY and GEMINI_MODEL. Use a model ID
   available to your Gemini project that supports JSON structured output. Do not include
   the models/ prefix. Never put the Gemini key in a frontend/VITE/EXPO_PUBLIC variable.
3. With the Supabase CLI installed and authenticated, deploy from the backend directory:

   supabase functions deploy create-habit-draft --project-ref YOUR_PROJECT_REF --no-verify-jwt

   The gateway flag does not make draft generation anonymous: the function itself validates
   the bearer token with Supabase Auth getUser before reserving quota or calling Gemini.
   Deploy the repository function and its shared validation module together.
4. Restart/rebuild the frontend if its public Supabase URL or anon key changed.
5. Use a test account and a non-sensitive goal. Only the goal description is sent to Gemini;
   existing habits, completion history, and reflections are not included.

The endpoint uses Gemini JSON structured output plus local field validation:
https://ai.google.dev/gemini-api/docs/structured-output
Schema validation does not guarantee that every suggestion is sensible or safe; review quality manually.
Habit drafts, weekly AI reviews and AI adjustments share 10 attempts per account per UTC day and at least 15 seconds between attempts.
Failed provider attempts also consume quota. Configure provider spending limits before public testing;
per-account limits are not a global spending cap or protection against multiple-account abuse.

## 10. AI creation acceptance test

1. Open Create a habit. Describe: I want to read, but I am exhausted after work.
   Generate must remain disabled until the consent checkbox is checked.
2. Generate AI draft. Expect a separate preview with all habit fields, category and schedule.
   Check the habits table or return to Today: generating alone must not create a habit.
3. Enter manual form text, generate another draft after 15 seconds, then Discard draft.
   Your manual text must remain. Only Use this draft replaces the form, as its warning states.
4. Use this draft, change the tiny version, then Create habit. Expect exactly one saved habit
   with your edited values. Refresh, edit it, complete it and undo the completion.
5. Use a draft then Cancel instead of saving: no new habit should exist.
6. Try a short goal, request again immediately, and test offline. Expect disabled generation
   or a useful error; the manual form must remain usable.
7. With missing server secrets, expect the AI setup error. With an invalid model/key, expect
   an AI unavailable error. Restore configuration afterward; do not expose keys in screenshots.
8. Review several realistic goals with different time constraints. Check that the anchor is
   usable, the tiny version is genuinely smaller, and the normal action is achievable.
   Reject inappropriate advice; record the goal and output without sensitive information.

Automated verification covers shared validation, mocked endpoint success/error paths,
database quota/reset/cooldown, row isolation, editing and undo SQL behavior. It does not
replace browser interaction tests, deployed-function checks, or live AI quality evaluation.

## 11. Roadmap Part 2: AI-assisted weekly review

### Hosted setup

This part is implemented locally; the hosted function has not been deployed by this change.
No new SQL migration is needed beyond 007_ai_request_limits.sql. The new endpoint reuses
reserve_habit_draft, so draft creation and weekly reviews share the same quota.

1. Complete the Supabase and Gemini setup in section 9, including GEMINI_API_KEY and
   GEMINI_MODEL as server-side secrets.
2. From the backend directory, deploy the new function with its shared module:

   supabase functions deploy create-weekly-review --project-ref YOUR_PROJECT_REF --no-verify-jwt

   The endpoint validates the bearer token with Supabase Auth getUser. It queries the caller's
   rows with the caller's token and explicit user_id filters, not a service-role client.
3. Redeploy create-habit-draft to update its shared-quota error wording, then rebuild/restart
   the frontend. An older deployment still enforces the same quota but describes it as drafts only.

### What this part does

- Reflect retains its current-week statistics and editable reflection.
- The separate AI review uses the last completed Monday-Sunday week in the browser's time zone.
  The server computes the range; client-supplied user IDs, logs or counts are not used.
- Currently active habits are included; archived habits are excluded. Actual recorded normal
  completions, tiny completions, explicit skips and skip-reason counts are summarized.
- No completion-rate denominator, streak, unlogged-failure inference, or multiweek trend is used.
  This avoids treating today's edited schedule as historical schedule evidence.
- With consent, Gemini receives the week dates, habit names and aggregate counts. Database IDs
  are replaced with temporary references. Profile details, email, anchors, actions, daily-context
  entries, individual log timestamps and written reflections are not sent.
- The response contains commentary and questions, not proposed habit mutations. The review is an
  on-demand screen snapshot: it is not persisted and clears when leaving Reflect or refreshing.
- No recorded activity means no provider call and no quota consumption. Invalid provider output
  and failed provider requests consume an attempt after quota reservation.
- Input/output validation and evidence references constrain the response but do not prove all
  AI statements are true. Live quality evaluation remains necessary.

### Manual acceptance steps

1. Open Reflect and find AI review: last completed week. Generate is disabled until consent is
   checked. Your current-week reflection remains editable independently of AI.
2. Using a new test account without last-week activity, consent and generate. Expect an explicit
   no-activity message and last week's dates, not invented patterns. No Gemini call is made.
3. For a meaningful review use the dedicated history fixture described earlier in this guide.
   On September 7, 2026 in Asia/Kolkata, the review range should be August 31-September 6.
4. Generate, then expand Recorded evidence used. Compare each count to the fixture/logs:
   tiny completions are successes, skips only count explicit skip records, and absent records
   are not counted as skips. Archived habits should not appear.
5. Expect a short summary, one to three habit-specific interpretations, and reflection questions.
   Check for invented causes, schedules, diagnoses, cross-week improvement claims, or advice
   unsupported by records. Record such output as a quality failure even if it renders correctly.
6. Type an unsaved reflection, generate a review, and confirm your text remains unchanged.
   Check the habits and weekly_reflections tables: generation must not create or modify rows.
7. Navigate away and back: the AI review clears and consent starts unchecked. Saved manual
   reflections remain. Generate again only after at least 15 seconds.
8. Generate a habit draft and immediately request a weekly review (or the reverse). Expect a
   cooldown error. After the shared daily quota is used, expect a limit error; manual flows work.
9. Test offline, missing function deployment, missing secrets, and an invalid model in a test
   project. Expect a visible error, no fake review, and the ability to keep writing a reflection.
10. Switch accounts. Do not see the previous account's AI output or evidence. In browser Network,
    the request body should contain only consent and timeZone, with the normal authentication
    headers; the Gemini secret must never appear in browser requests.
11. Check phone width and keyboard access to consent, Generate, and Recorded evidence used.

Automated checks run without external API calls: week boundaries including DST/year transitions,
count aggregation/deduplication, output bounds and references, authentication, consent,
caller-row filtering, minimized provider payload, empty-history behavior, shared quota errors,
oversized account refusal, invalid/blocked provider responses and timeout handling.
Browser interaction and live Gemini response quality have not been verified automatically.

Part 3 adds personalized adaptive suggestions with explicit acceptance; see section 12.
No background jobs, reminders, account-lifecycle additions, or automatic habit changes were added here.

## 12. Part 3 setup and manual acceptance

### Hosted setup

1. Apply backend/sql/008_ai_habit_adjustments.sql in Supabase SQL Editor after existing migrations
   through 007_ai_request_limits.sql. It creates ai_habit_adjustments, per-user policies and decide_ai_habit_adjustment.
   It can be rerun. It does not change existing habits or rule-based proposals.
2. Keep GEMINI_API_KEY and GEMINI_MODEL in Supabase server-side secrets, as configured for Part 2.
3. From the backend directory deploy:

   supabase functions deploy create-habit-adjustment --project-ref YOUR_PROJECT_REF --no-verify-jwt

   The function itself verifies the caller with Auth getUser and accesses only that caller's rows.
   Include both shared modules (habitAdjustment.ts and weeklyReview.ts) in deployment.
4. Restart/rebuild the frontend. Older AI endpoints still enforce the same shared quota;
   redeploy them too if you want the updated wording describing all AI features.

### Flow and boundaries

Adjust > Personalize with AI > choose habit > consent > Generate suggestion > preview >
Accept AI change or Keep current.

- The selected habit's name, anchor, normal/tiny actions, last completed week's dates and
  aggregate normal/tiny/skip/reason counts are sent to Gemini. Account/database IDs, profile,
  written reflections, daily contexts and individual log timestamps are not sent.
- Three recorded check-ins (normal/tiny completions or explicit skips) are required. Counts
  use actual records, not inferred failures or historical assumptions about today's schedule.
- AI may propose changing only the anchor or normal_version, or recommend keeping the habit.
  Prompts request conservative changes, but validation cannot prove semantic safety or usefulness:
  reject inappropriate, more demanding or unrelated suggestions.
- Generating stores a pending proposal, not a habit change. One saved proposal per habit/evidence
  week is retained even after rejection; repeated requests reuse it without a provider call.
  A no-change result is not stored, so requesting again can consume another attempt.
- Accept applies exactly the previewed field and records the decision in the same transaction.
  Any later habit edit, including an accepted rule-based change, invalidates an AI preview.
  Rejecting a stale preview is allowed. Accepted/rejected decisions cannot be flipped by retrying.
- Evidence is a generation-time snapshot, not continuously recomputed. No revision history or
  undo of accepted adjustments is added; use normal habit editing if you want to revert the text.
- AI and rule-based proposals are separate. Only the current evidence week's AI proposals are
  shown; older decisions remain stored. Archived habits are hidden and cannot be accepted.

### Acceptance checklist

1. Use the earlier history fixture with a dedicated test account. Open Adjust. The existing
   rule-based patterns/proposals must still load; the new AI section is separate.
2. Choose [TEST] New habit, consent and generate. Expect an insufficient-records message,
   no saved proposal and no provider/quota use.
3. Choose [TEST] Read (three tiny completions), consent and generate. Expect either a preview
   with before/after, rationale and exact evidence counts, or an honest keep-current result.
   AI is not required to propose a change every time.
4. Check habits.normal_version and anchor before accepting. They must be unchanged.
   Refresh/reopen Adjust: a saved preview must remain, without another AI request.
5. Accept a valid preview. Confirm the decision persists after refresh, the proposed field alone
   changes, and Today uses the accepted text when that version applies. Existing logs remain.
6. Generate for [TEST] Stretch (recorded forgetting), then Keep current. Confirm the cue and
   normal/tiny actions remain unchanged and Decision: rejected persists.
7. Two-tab stale test: generate a pending preview in tab A; edit that habit in tab B and save.
   Accept in A must fail without overwriting B. Keep current should dismiss the stale proposal.
   The same protection applies after accepting a rule-based proposal for that habit.
8. Decision race: show the same pending proposal in two tabs. Accept in A, then Keep current
   in B. B must display the already accepted decision, not change it to rejected.
9. Archive a habit while a preview is open elsewhere. Acceptance must fail; after reload,
   the archived habit's proposal must disappear. Past logs and stored decisions remain.
10. Try offline saving/generation, absent 008_ai_habit_adjustments.sql/function deployment, bad model configuration,
    and the shared quota/cooldown. Expect visible errors; rule-based and manual habit flows
    remain usable when their own backend is reachable.
11. Sign into another account. It must not see or accept the first account's proposals.
12. Test narrow phone width and keyboard navigation. Confirm all before/after text is readable,
    consent is required, switching the selected habit clears consent, and buttons show busy states.

Automated checks cover pure adjustment validation, database migration reruns, field-only atomic
acceptance, rejection, stale snapshots, uniqueness, archived habits and account isolation.
Mocked endpoint checks cover consent/auth, evidence thresholds, payload minimization, preview
reuse (including decisions), no-change results, insert races/errors, malformed output and timeout.
No hosted deployment or live Gemini quality evaluation has been performed by these tests.

Part 4 adds background rule-based preparation and in-app reminders; see section 13.

## 13. Part 4: background preparation and in-app reminders

### Scope

This is an in-app inbox, not push notifications or email. A server-side scheduled job prepares
reminders while the browser is closed. Users see them on Today when they return. No browser
notification permission, external messaging provider, or additional Gemini data sharing is used.
Both daily reminders and weekly preparation default to off. AI generation stays on demand.

Weekly preparation uses the existing deterministic target/cue rules and creates pending proposals,
never habit changes. One weekly inbox item is prepared for users with an active habit created
before this week, even if no pattern qualifies for a change. Daily reminders are created only
when at least one currently scheduled active habit has no record that day. Both done and skipped
count as a check-in. Reminder text is generic and contains no habit names.

### Hosted setup (not performed by this implementation)

1. Apply backend/sql/009_scheduled_reminders.sql after earlier migrations.
2. Enable Supabase Cron / pg_cron in the project dashboard. Then, as the database owner,
   run backend/sql/enable_routine_cron.sql. It installs the named tinyshift-routine-schedule
   job every five minutes. The named installation can be rerun to update the schedule.
   See [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart).
3. Check cron.job and cron.job_run_details, or the Cron dashboard, for job execution.
   Per-account last_checked_at and last_error are stored in routine_preferences. Errors are
   SQLSTATE codes, not raw habit data. A successful job can still contain a failed account;
   monitor both job results and preferences.last_error.
4. Only privileged administration can invoke process_routine_schedule; authenticated browser
   users cannot run a job across accounts. No service-role key belongs in the frontend.
5. Rebuild/restart the frontend. In Profile choose time zone and enable the desired options.
   Saving preferences does not install or activate Cron by itself.

### Manual acceptance checklist

1. On a new test account open Profile > Weekly preparation and reminders. Both checkboxes
   must be off. Choose Asia/Kolkata (or your current device's zone) and save. Refresh to
   confirm persistence. Invalid zones/times should produce feedback, not silent fallback.
2. Enable daily reminders with a time a few minutes ahead. Leave at least one scheduled habit
   without today's log. Close the app and let a Cron tick run after that time.
   Return to Today: the reminder inbox should contain one daily item.
3. Dismiss it and refresh. It should stay dismissed, including after another Cron tick.
   Reminders poll on Today every 60 seconds and on window focus; reopening Today also reloads.
4. Repeat on a separate test day/account after logging every scheduled habit (done or skipped).
   No daily reminder should be created. Weekday-only habits should not trigger weekend reminders.
5. If a reminder was already created before completion, it remains a dated snapshot until
   dismissed or expired; the text does not claim the habit is still incomplete. Daily items
   expire at local midnight and weekly items at the next local Monday.
6. Enable weekly preparation and choose the Monday time. Use the earlier history fixture.
   Let the scheduler run without opening Adjust. Confirm routine_proposals already contains
   eligible changes before opening the app. No habits or AI usage rows should be modified.
7. On Today, Open Adjust from the weekly reminder. Check the last completed week's evidence
   and accept/reject proposals as before. Repeated scheduler runs and opening Adjust must not
   duplicate proposals or overwrite decisions.
8. Enable weekly preparation after Monday's time, or on Tuesday. The next tick should catch
   up the current week only, not create a backlog of reminders for missed weeks.
9. Turn both options off and save. Existing undismissed reminders should be dismissed and
   future job runs should skip this account. Previously prepared proposals remain for review.
   Turning reminders back on does not resurrect dismissed items for the same day/week.
10. Sign into another account. Preferences and reminders must be private. Test an offline
    preference save and reminder dismissal: show an error without claiming success.
11. Check narrow phone width and keyboard access. Use this device's time zone when travelling;
    the scheduler uses the saved zone while daily screens use device-local dates.

For a quicker developer check in a dedicated test project, the database owner can invoke:

    select public.process_routine_schedule();

This runs eligible accounts, not just the currently signed-in test account. Do not use simulated
future timestamps in a live project: they create future records and advance processing state.
The automated local suite uses isolated fixtures and simulated clocks instead.

### Scheduling behavior and operational limits

- The job locks a bounded batch of up to 100 opted-in accounts per run, skips locked rows and
  processes least-recently-checked accounts first. Each account is checked at most once in four
  minutes. Large queues may take longer than five minutes; this is not an exact-time guarantee.
- Each account's work is transactional. A failure rolls back that account's partial work,
  records its diagnostic code, and allows other accounts to continue. Later ticks retry it.
- Unique identities prevent duplicate daily/weekly reminders and duplicate habit/week proposals.
  DST repeated hours do not cause duplicate reminders. If a clock skips past a configured time,
  the next check after it is due processes it; expiry uses local calendar boundaries.
- Background weekly preparation runs once per evidence week. Later manual history edits are not
  automatically reprocessed by the job; opening Adjust can still prepare additional qualifying
  rule-based proposals. Existing previews retain their original evidence.
- Expired/dismissed inbox rows are retained, not deleted. Retention/cleanup, operational alerting,
  load testing and push/email delivery are future production work.
- To pause the job without deleting settings, use the Cron dashboard. Users can independently
  opt out in Profile. The app's manual and on-demand AI flows do not require Cron.

Local database tests cover migration reruns, daily/weekly due times, normal/tiny/skip rules,
proposal parity, idempotence, local-midnight expiry, opt-out, catch-up, bounded-batch progress,
failure isolation, account permissions and DST fall-back. Hosted Cron activation and browser
interaction still require manual verification.

Account controls and release checks are covered in section 14 and Before public release above.

## 14. Part 5: account lifecycle and privacy

### Setup

Apply backend/sql/010_account_privacy.sql after phases2-11. Export includes the legacy
ai_suggestions and weekly_reflections tables, so 003_ai_suggestions.sql and 004_weekly_reflections.sql must exist even if legacy AI is unused.
Deploy from the backend directory:

    supabase functions deploy delete-account --project-ref YOUR_PROJECT_REF --no-verify-jwt

The function validates Auth itself, re-verifies the current password and obtains the deletion
target from that verified account, never a client-supplied ID/email. It requires the server-only
SUPABASE_SERVICE_ROLE_KEY. Do not expose this key in browser configuration.

Configure Supabase Auth's exact recovery redirect allowlist entry:
http://localhost:3000/?account=recovery for development, and the matching HTTPS production URL.
SMTP, templates, password rules and token expiry must also be configured/tested in Supabase.
No hosted changes were made automatically.

### Password recovery

1. Sign out. On Sign in choose Forgot password?, enter the test email, then Send reset link.
   Expect a neutral status message without confirming whether an account exists.
2. Open the real email link. Expect Set a new password, not Today/onboarding.
3. Test a short password and mismatched confirmation: no update should occur.
4. Save a new 10-128 character password. Expect sign-out and the sign-in screen.
   Old password must fail; new password must succeed.
5. Test expired/reused links and a recovery screen reload. Without a valid session, expect guidance
   to request another link. Test a link opened while another session exists too.
6. From Profile, Send password reset email should use that signed-in account's email.
7. Offline/update errors must leave useful feedback. If the update succeeds but sign-out fails,
   the UI must identify that the password was already changed and offer another sign-out attempt.

### Export

1. Populate a disposable account with habits (including an archived habit), logs, reflections,
   proposals, reminder settings and reminders. Profile > Download my data downloads JSON.
2. Confirm format_version, account ID/email and all account-owned table arrays are present.
   Compare the export to the database, including private AI quota/deletion-attempt counters.
3. Confirm no password hashes, bearer tokens, other user's rows or temporary weekly AI reviews
   appear. Reviews were never persisted; external provider records are not part of this export.
4. Go offline or test without 010_account_privacy.sql. Expect an export error, not an empty or partial success.
   Keep export files private; delete test downloads manually when no longer needed.

### Account deletion — use a disposable account only

1. Export first if desired. Profile > Delete my account... opens a warning. Cancel: nothing changes.
2. Enter a wrong password and type DELETE. Expect verification failure; all account data remains.
   At least 15 seconds must pass between attempts; only five attempts per UTC day are allowed.
3. Test missing/wrong confirmation: deletion is disabled or rejected.
4. Enter the correct password and DELETE. Confirm the app reports Account deleted.
   The old account must no longer sign in. Its profile, habits/logs, stored reflections/proposals,
   quotas, preferences and reminders must disappear from the active database.
5. Verify a second account and its data are unaffected. A supplied arbitrary userId must never
   change the endpoint's target. The automated mock test covers this target binding.
6. Verify failure paths in a test project: missing function/secret, quota error, Auth deletion failure.
   A timeout/network interruption can leave an uncertain outcome: check sign-in/account status
   before retrying rather than assuming nothing happened.
7. Accounts with verified MFA factors are refused by this version's deletion flow. They require
   assisted deletion until an MFA-aware flow exists; do not disable MFA to bypass that safeguard.

Deletion is irreversible through the app and removes active application records, not necessarily
provider logs/backups or information previously sent to Gemini. Retention disclosures and assisted
support procedures must be reviewed before public release.

### Release validation

Check the public-key validator, CI workflow and render-error fallback. No service-role or Gemini
key may appear in a browser bundle. The build now allowlists only the public Supabase URL/key;
unrelated VITE_/EXPO_PUBLIC_ variables are not injected. Run the full local checks and then the
end-to-end workflow in staging. Hosted Auth emails, real deletion, browser interaction, live AI
quality, Cron operation and production security headers remain manually unverified.
# Plain-language copy checks

1. Open Create a habit, Adjust, Reflect, and Profile. Check that labels make sense without technical knowledge.
2. Generate an AI draft. Confirm the form explains that you must review and save it.
3. Turn off your internet connection and try generating a draft or saving settings. Expect a connection message, not “Failed to fetch”. Reconnect and retry.
4. Submit an empty required field or an overlong habit field. Feedback should name the field in everyday language, not a code identifier.
5. Complete a tiny version on Today. The status should say “tiny version”, not “minimum”.
6. Open Account and privacy. Provider information is intentionally retained here so you can see where your data goes.

For updated server messages, redeploy the functions from `backend`:

```sh
npx supabase functions deploy create-habit-draft --project-ref zmxtzoqsiykasrtvekqa --no-verify-jwt --use-api
npx supabase functions deploy create-weekly-review --project-ref zmxtzoqsiykasrtvekqa --no-verify-jwt --use-api
npx supabase functions deploy create-habit-adjustment --project-ref zmxtzoqsiykasrtvekqa --no-verify-jwt --use-api
npx supabase functions deploy delete-account --project-ref zmxtzoqsiykasrtvekqa --no-verify-jwt --use-api
```

Restart the local app or rebuild/redeploy the frontend to see its updated text.
No database changes are required for this naming cleanup.
# Redesigned interface

Start with Current interface checks at the top of this guide,
then continue with the feature checks below. Today now keeps energy/time controls
inside “What fits today?” and editing/deletion inside “Manage habits”.
Optional AI habit creation is under “Need a starting point? Design it with AI”.
The redesign changes the frontend only; it does not require another function deployment.
