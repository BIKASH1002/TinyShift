"""Isolated UI smoke tests. All external requests are intercepted; no real account is used.

Start Vite on 127.0.0.1:3017, install Python Playwright, then run this script.
Screenshots are written to a fresh temporary directory.
"""

import json
import os
import re
import tempfile
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("TINYSHIFT_TEST_URL", "http://127.0.0.1:3017")
PROJECT_REF = os.environ.get("TINYSHIFT_TEST_PROJECT_REF", "zmxtzoqsiykasrtvekqa")
USER_ID = "11111111-1111-4111-8111-111111111111"
HABIT_ID = "22222222-2222-4222-8222-222222222222"
today = datetime.now(timezone.utc).date()
last_monday = today - timedelta(days=today.weekday() + 7)
user = {
    "id": USER_ID,
    "aud": "authenticated",
    "role": "authenticated",
    "email": "demo@example.test",
    "user_metadata": {"full_name": "Demo Reader"},
}
session = {
    "access_token": "local-fixture-token",
    "refresh_token": "local-fixture-refresh",
    "token_type": "bearer",
    "expires_at": 4102444800,
    "expires_in": 3600,
    "user": user,
}
habit = {
    "id": HABIT_ID,
    "user_id": USER_ID,
    "name": "Read a little each day",
    "anchor": "After breakfast",
    "normal_version": "Read 10 pages",
    "minimum_version": "Read one page",
    "category": "Learning",
    "frequency": "Daily",
    "motivation": "Make room for curiosity",
    "is_active": True,
    "created_at": str(last_monday) + "T08:00:00Z",
    "updated_at": str(today) + "T08:00:00Z",
}
state = {
    "habits": [habit.copy()],
    "logs": [],
    "context": None,
    "fail": False,
    "coach_kind": "step",
    "coach_failure": False,
    "profile": {"full_name": "Demo Reader", "updated_at": habit["updated_at"], "avatar_url": None},
}
requests = []
output = tempfile.mkdtemp(prefix="tinyshift-ui-")


def mock(route):
    request = route.request
    parsed = urlparse(request.url)
    if parsed.hostname in ("127.0.0.1", "localhost"):
        route.continue_()
        return
    if not parsed.hostname.endswith(".supabase.co"):
        route.abort()
        return
    requests.append((request.method, parsed.path))
    if state["fail"]:
        route.abort()
        return
    path, query = parsed.path, parse_qs(parsed.query)
    payload = request.post_data_json if request.post_data else {}
    result = []
    if "/auth/v1/" in path:
        result = session if "token" in path else user
    elif path.endswith("/habits"):
        if request.method == "PATCH":
            state["habits"][0].update(payload)
        elif request.method == "POST":
            state["habits"].append(
                {**habit, **payload, "id": "33333333-3333-4333-8333-333333333333"}
            )
        result = state["habits"]
        if "id" in query:
            result = [h for h in result if h["id"] == query["id"][0].removeprefix("eq.")]
    elif path.endswith("/habit_logs"):
        if request.method == "POST":
            state["logs"] = [{**payload, "id": "fixture-log"}]
        elif request.method == "DELETE":
            old = state["logs"]
            state["logs"] = []
            result = old
        if request.method != "DELETE":
            result = state["logs"]
    elif path.endswith("/daily_contexts"):
        if request.method == "POST":
            state["context"] = payload
        result = [state["context"]] if state["context"] else []
    elif path.endswith("/profiles"):
        if request.method == "PATCH":
            state["profile"].update(payload)
        result = [state["profile"]]
    elif path.endswith("/weekly_reflections") and request.method == "POST":
        result = [{**payload, "id": "fixture-reflection"}]
    elif path.endswith("/create-rescue-step"):
        if state["coach_failure"]:
            route.fulfill(status=502, content_type="application/json", body=json.dumps({"error": "The coach is unavailable. Try again."}))
            return
        result = {
            "habitId": payload["habitId"], "habitUpdatedAt": habit["updated_at"],
            "day": payload["day"], "timeZone": payload["timeZone"],
            "suggestion": {
                "kind": state["coach_kind"],
                "action": "Recall one idea from your last chapter." if state["coach_kind"] == "step" else "Take a pause and return when you feel ready.",
                "reason": "A quiet mental step needs no book.",
                "seconds": 30 if state["coach_kind"] == "step" else 0,
            },
        }
    elif path.endswith("/rpc/complete_rescue_step"):
        result = {"id": "fixture-rescue-log", "habit_id": payload["p_habit_id"],
            "user_id": USER_ID, "log_date": payload["p_day"], "status": "done",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completion_method": "minimum", "skip_reason": None, "rescue_action": payload["p_action"]}
        state["logs"] = [result]
    elif path.endswith("/create-habit-draft"):
        result = {
            "draft": {
                "name": "Read with breakfast",
                "anchor": "After breakfast",
                "normalVersion": "Read 10 pages",
                "minimumVersion": "Read one page",
                "motivation": "Make room for curiosity",
                "category": "Learning",
                "frequency": "Daily",
            }
        }
    elif path.endswith("/create-weekly-review"):
        result = {
            "start": str(last_monday),
            "end": str(last_monday + timedelta(days=6)),
            "review": None,
            "evidence": [],
        }
    if isinstance(result, list) and "application/vnd.pgrst.object+json" in request.headers.get(
        "accept", ""
    ):
        result = result[0] if result else None
    route.fulfill(status=200, content_type="application/json", body=json.dumps(result))


def layout(page, name):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), (
        name + ": horizontal overflow"
    )
    assert page.get_by_role("heading", level=1).count() == 1, name + ": expected one page heading"
    assert page.evaluate(
        """() => [...document.querySelectorAll('button')].filter(b => b.getClientRects().length)
        .every(b => b.getBoundingClientRect().height >= 43.5)"""
    ), (name + ": undersized button")
    page.screenshot(path=f"{output}/{name}.png", full_page=True)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000}, timezone_id="UTC", reduced_motion="reduce"
    )
    context.route("**/*", mock)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    expect(page.get_by_role("heading", name="Small steps. Room for real life.")).to_be_visible()
    layout(page, "welcome-desktop")
    page.get_by_role("button", name="Get started", exact=True).click()
    expect(page.get_by_role("heading", name="Welcome back")).to_be_visible()
    layout(page, "login-desktop")
    page.get_by_role("button", name="Create an account", exact=True).click()
    expect(page.get_by_label("Your name")).to_be_visible()
    page.set_viewport_size({"width": 390, "height": 844})
    layout(page, "signup-mobile")
    # A fake session is injected only into this isolated browser, never into app source.
    page.evaluate(
        "({key, session}) => localStorage.setItem(key, JSON.stringify(session))",
        {"key": f"sb-{PROJECT_REF}-auth-token", "session": session},
    )
    page.reload()
    expect(page.get_by_role("heading", name="A little progress, your way.")).to_be_visible()
    expect(page.get_by_role("button", name="Complete Read a little each day (usual version)", exact=True)).to_be_visible()
    layout(page, "today-mobile")
    assert requests.count(("GET", "/rest/v1/habits")) == 1, "Duplicate initial habit reads"
    assert requests.count(("GET", "/rest/v1/habit_logs")) == 1, "Duplicate initial activity reads"
    page.set_viewport_size({"width": 1440, "height": 1000})
    layout(page, "today-desktop")
    page.get_by_role("button", name="Too tired or stuck? Open Rescue Coach", exact=True).click()
    coach = page.get_by_role("region", name="Rescue Coach", exact=True)
    expect(coach).to_be_visible()
    context_input = coach.get_by_label("What is making this habit difficult right now?")
    context_input.fill("At the airport, no book and very tired.")
    generate = coach.get_by_role("button", name="Find my rescue step", exact=True)
    expect(generate).to_be_disabled()
    coach.get_by_role("checkbox").check()
    state["coach_kind"] = "pause"
    generate.click()
    expect(coach.get_by_text("Room to pause", exact=True)).to_be_visible()
    expect(coach.get_by_role("button", name="Done - I did this rescue step", exact=True)).to_have_count(0)
    assert not state["logs"], "Generating a pause must not log activity"
    coach.get_by_text("Change your situation or try another idea", exact=True).click()
    context_input.fill("No book with me; I can recall a little of yesterday's reading.")
    expect(coach.get_by_text("Room to pause", exact=True)).to_have_count(0)
    state["coach_failure"] = True
    generate.click()
    expect(coach.get_by_role("alert")).to_contain_text("unavailable")
    expect(page.get_by_role("button", name="I completed the tiny version", exact=True)).to_be_enabled()
    state["coach_failure"] = False
    state["coach_kind"] = "step"
    generate.click()
    expect(coach.get_by_role("heading", name="Recall one idea from your last chapter.")).to_be_focused()
    assert not state["logs"], "Generating a step must not log activity"
    for width in [320, 390, 1440]:
        page.set_viewport_size({"width": width, "height": 900})
        layout(page, f"rescue-coach-{width}")
    coach.get_by_role("button", name="Done - I did this rescue step", exact=True).click()
    expect(page.get_by_text("Rescue completed. That counts as a tiny win. You can undo it on Today.", exact=True)).to_be_visible()
    assert state["logs"][0]["completion_method"] == "minimum"
    assert state["logs"][0]["rescue_action"] == "Recall one idea from your last chapter."
    page.get_by_role("navigation").get_by_role("button", name=re.compile("^Today")).click()
    page.get_by_role("button", name="Completed 1", exact=True).click()
    expect(page.get_by_text("Recall one idea from your last chapter.", exact=True)).to_be_visible()
    expect(page.get_by_text("Rescue completed", exact=True)).to_be_visible()
    page.get_by_role("button", name="Undo completion for Read a little each day", exact=True).click()
    page.get_by_role("button", name="To do 1", exact=True).click()
    expect(page.get_by_role("button", name="Complete Read a little each day (usual version)", exact=True)).to_be_visible()
    page.get_by_text("Adjust pace", exact=True).click()
    page.get_by_role("combobox", name="Energy", exact=True).click()
    page.get_by_role("option", name="Low", exact=True).click()
    page.get_by_role("button", name="Update my plan", exact=True).click()
    expect(page.get_by_role("button", name="Complete Read a little each day (tiny version)", exact=True)).to_be_visible()
    page.get_by_role("button", name="Complete Read a little each day (tiny version)", exact=True).click()
    expect(page.get_by_role("button", name="Undo last completion", exact=True)).to_be_visible()
    layout(page, "today-complete")
    page.get_by_role("button", name="Undo last completion", exact=True).click()
    expect(page.get_by_role("button", name="Complete Read a little each day (tiny version)", exact=True)).to_be_visible()
    page.get_by_role("button", name="Manage habits", exact=True).click()
    page.get_by_role("button", name="New habit", exact=True).click()
    page.get_by_text("Need a starting point? Design it with AI", exact=True).click()
    page.get_by_label("Your goal and what makes it difficult").fill(
        "I want to read, but I am tired after work."
    )
    page.get_by_role("checkbox").check()
    page.get_by_role("button", name="Generate AI draft", exact=True).click()
    expect(page.get_by_role("heading", name="Review the AI suggestion")).to_be_visible()
    page.get_by_role("button", name="Use this draft", exact=True).click()
    expect(page.get_by_label("Habit", exact=True)).to_have_value("Read with breakfast")
    category = page.get_by_role("combobox", name="Category", exact=True)
    category.click()
    menu = page.get_by_role("listbox", name="Category", exact=True)
    expect(menu).to_be_visible()
    rect, popup = category.bounding_box(), menu.bounding_box()
    assert abs(rect["width"] - popup["width"]) < 1
    assert abs(rect["x"] - popup["x"]) < 1
    page.screenshot(path=f"{output}/category-dropdown.png", full_page=True)
    # Restore the trigger to view after the full-page capture before keyboard input.
    category.scroll_into_view_if_needed()
    if category.get_attribute("aria-expanded") != "true":
        category.click()
    category.press("Home")
    expect(menu.locator('[data-active="true"]')).to_have_text("Health")
    category.press("ArrowDown")
    expect(menu.locator('[data-active="true"]')).to_have_text("Focus")
    category.press("Enter")
    expect(category).to_contain_text("Focus")
    category.click()
    category.press("Escape")
    expect(menu).not_to_be_visible()
    category.click()
    category.press("m")
    category.press("Enter")
    expect(category).to_contain_text("Mood")
    category.click()
    page.get_by_role("heading", name="Create a habit", exact=True).click()
    expect(menu).not_to_be_visible()
    category.click()
    category.press("Tab")
    expect(menu).not_to_be_visible()
    page.get_by_role("button", name="Cancel", exact=True).click()
    expect(page.get_by_role("dialog", name="Leave without saving?")).to_be_visible()
    page.get_by_role("button", name="Keep editing", exact=True).click()
    expect(page.get_by_role("dialog")).not_to_be_visible()
    page.get_by_role("button", name="Cancel", exact=True).click()
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).not_to_be_visible()
    for width in [1440, 1024, 768, 390, 320]:
        page.set_viewport_size({"width": width, "height": 900})
        layout(page, f"habit-form-{width}")
        category.click()
        rect, popup = category.bounding_box(), menu.bounding_box()
        assert abs(rect["width"] - popup["width"]) < 1
        assert abs(rect["x"] - popup["x"]) < 1
        assert popup["y"] >= 0 and popup["y"] + popup["height"] <= 901
        page.screenshot(path=f"{output}/dropdown-{width}.png")
        category.press("Escape")
    page.get_by_role("button", name="Create habit", exact=True).click()
    expect(page.get_by_role("heading", name="Small habits, room to grow.")).to_be_visible()
    edit = page.get_by_role("button", name="Edit Read a little each day", exact=True)
    edit.hover()
    expect(page.get_by_role("tooltip", name="Edit", exact=True)).to_be_visible()
    edit.focus()
    edit.press("Escape")
    expect(page.get_by_role("tooltip")).not_to_be_visible()
    delete = page.get_by_role("button", name="Delete Read a little each day", exact=True)
    delete.hover()
    expect(page.get_by_role("tooltip", name="Delete", exact=True)).to_be_visible()
    edit.click()
    expect(page.get_by_role("heading", name="Edit habit", exact=True)).to_be_visible()
    page.get_by_label("Habit", exact=True).fill("Reading " + "a very long habit name " * 12)
    page.get_by_role("button", name="Save changes", exact=True).click()
    expect(page.get_by_role("heading", name="Small habits, room to grow.")).to_be_visible()
    page.get_by_role("button", name=re.compile("^Today")).click()
    expect(page.get_by_role("heading", name="A little progress, your way.")).to_be_visible()
    layout(page, "today-long-name-320")
    for tab, heading in [
        ("Rescue", "A smaller step still counts."),
        ("Adjust", "Find what works for you."),
        ("Reflect", "Every week teaches you something."),
        ("Profile", "Your profile"),
    ]:
        page.get_by_role("navigation").get_by_role("button", name=re.compile("^" + tab)).click()
        expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name=heading, exact=True)).to_be_focused()
        expect(page.locator(".loading-state")).to_have_count(0)
        if tab == "Adjust":
            expect(page.get_by_text("Not enough history yet:", exact=False)).to_be_visible()
        for width in [390, 768, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            layout(page, f"{tab.lower()}-{width}")
        if tab == "Adjust":
            expect(
                page.get_by_role("button", name="Generate suggestion", exact=True)
            ).to_be_disabled()
            assert not any(path.endswith("create-habit-adjustment") for _, path in requests)
        if tab == "Rescue":
            first = page.get_by_role(
                "button", name="I completed the tiny version", exact=True
            ).bounding_box()
            second = page.get_by_role(
                "button", name="Skip today and save why", exact=True
            ).bounding_box()
            assert (
                second["x"] >= first["x"] + first["width"] + 11
                or second["y"] >= first["y"] + first["height"] + 11
            )
        if tab == "Reflect":
            page.get_by_label("What helped, and what got in the way?").fill(
                "Starting small helped."
            )
            page.get_by_role("button", name="Save reflection", exact=True).click()
            expect(page.get_by_text("Reflection saved.", exact=True)).to_be_visible()
        if tab == "Profile":
            picture = page.screenshot(clip={"x": 0, "y": 0, "width": 32, "height": 32})
            page.get_by_label("Choose profile photo").set_input_files(
                {"name": "test-photo.png", "mimeType": "image/png", "buffer": picture}
            )
            expect(page.get_by_alt_text("Your profile photo")).to_be_visible()
            page.get_by_role("button", name="Save profile changes", exact=True).click()
            expect(page.get_by_text("Profile saved.", exact=True)).to_be_visible()
            assert state["profile"]["avatar_url"].startswith("data:image/jpeg;base64,")
            page.get_by_role("navigation").get_by_role("button", name="Today", exact=False).click()
            page.get_by_role("navigation").get_by_role(
                "button", name="Profile", exact=False
            ).click()
            expect(page.get_by_role("button", name="Change photo", exact=True)).to_be_visible()
            expect(page.get_by_alt_text("Your profile photo")).to_be_visible()
            page.screenshot(path=f"{output}/profile-photo.png", full_page=True)
            page.get_by_role("button", name="Remove photo", exact=True).click()
            page.get_by_role("button", name="Save profile changes", exact=True).click()
            expect(page.get_by_text("Profile saved.", exact=True)).to_be_visible()
            assert state["profile"]["avatar_url"] is None
            page.get_by_label("Choose profile photo").set_input_files(
                {"name": "invalid.txt", "mimeType": "text/plain", "buffer": b"not a photo"}
            )
            expect(page.get_by_role("alert")).to_contain_text("Choose a JPG, PNG or WebP photo.")
    # Warm navigation should reuse data, without another profile request.
    profile_reads = requests.count(("GET", "/rest/v1/profiles"))
    page.get_by_role("navigation").get_by_role("button", name="Today", exact=False).click()
    expect(page.get_by_role("heading", name="A little progress, your way.")).to_be_visible()
    page.get_by_role("navigation").get_by_role("button", name="Profile", exact=False).click()
    expect(page.get_by_role("heading", name="Demo Reader", exact=True)).to_be_visible()
    assert requests.count(("GET", "/rest/v1/profiles")) == profile_reads
    # Simulate an external change after the short cache lifetime.
    page.clock.install()
    state["habits"] = []
    page.clock.fast_forward(61000)
    page.get_by_role("navigation").get_by_role("button", name="Today", exact=False).click()
    expect(page.get_by_role("heading", name="Start with one small habit.")).to_be_visible()
    layout(page, "today-empty")
    state["fail"] = True
    page.clock.fast_forward(61000)
    page.clock.resume()
    page.get_by_role("navigation").get_by_role("button", name="Adjust", exact=False).click()
    expect(page.get_by_role("alert").first).to_be_visible(timeout=20000)
    layout(page, "adjust-offline")
    assert not errors, errors
    browser.close()
print(
    "UI checks passed: onboarding, forms, AI draft, save, edit, completion, undo, eligibility, navigation, reflection, empty/error states, and responsive widths."
)
print("Screenshots:", output)
