"""Copy daily Garmin Connect values into Supabase (table garmin_daily).

Runs in GitHub Actions (see .github/workflows/garmin.yml) or locally.

Environment variables
  GARMIN_TOKENS          token string from garmin/get_token.py   (recommended, works with 2-step login)
  GARMIN_EMAIL           alternative to GARMIN_TOKENS (only without 2-step verification)
  GARMIN_PASSWORD        alternative to GARMIN_TOKENS
  SUPABASE_URL           https://<project>.supabase.co
  SUPABASE_SERVICE_KEY   service_role key (secret! only in GitHub secrets, never in the app)
  SUPABASE_USER_ID       your user id (Supabase → Authentication → Users)
  GARMIN_DAYS            how many days back to fetch (default 3)

Usage
  python garmin/sync.py            fetch and upload
  python garmin/sync.py --dry-run  fetch and print the JSON, upload nothing
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

import requests
from garminconnect import Garmin


def env(name: str, default: str | None = None) -> str | None:
    v = os.environ.get(name, default)
    return v.strip() if isinstance(v, str) else v


def login() -> Garmin:
    tokens = env("GARMIN_TOKENS")
    if tokens:
        api = Garmin()
        api.login(tokens)  # a JSON string is read as the token dump from get_token.py
        return api
    email, pw = env("GARMIN_EMAIL"), env("GARMIN_PASSWORD")
    if not (email and pw):
        sys.exit("Set GARMIN_TOKENS (recommended) or GARMIN_EMAIL + GARMIN_PASSWORD.")
    api = Garmin(email, pw)
    api.login()
    return api


def safe(fn, *args):
    """Garmin endpoints fail now and then (no data, no device feature). One bad call must not stop the run."""
    try:
        return fn(*args)
    except Exception as e:  # noqa: BLE001
        print(f"  ! {getattr(fn, '__name__', fn)}{args}: {e}", file=sys.stderr)
        return None


def first(*vals):
    for v in vals:
        if v is not None:
            return v
    return None


def day_values(api: Garmin, d: str) -> dict:
    out: dict = {"date": d}

    stats = safe(api.get_stats, d) or {}
    out["rhr"] = stats.get("restingHeartRate")
    out["steps"] = stats.get("totalSteps")
    out["stress"] = stats.get("averageStressLevel")
    out["bb_high"] = stats.get("bodyBatteryHighestValue")
    out["bb_low"] = stats.get("bodyBatteryLowestValue")
    out["bb_now"] = stats.get("bodyBatteryMostRecentValue")

    sleep = safe(api.get_sleep_data, d) or {}
    dto = sleep.get("dailySleepDTO") or {}
    secs = dto.get("sleepTimeSeconds")
    out["sleep_h"] = round(secs / 3600, 2) if secs else None
    out["sleep_score"] = ((dto.get("sleepScores") or {}).get("overall") or {}).get("value")
    if out["rhr"] is None:
        out["rhr"] = sleep.get("restingHeartRate")

    hrv = safe(api.get_hrv_data, d) or {}
    summ = hrv.get("hrvSummary") or {}
    out["hrv"] = summ.get("lastNightAvg")
    out["hrv_status"] = summ.get("status")

    mm = safe(api.get_max_metrics, d)
    if isinstance(mm, list):
        mm = mm[0] if mm else {}
    mm = mm or {}
    gen = mm.get("generic") or {}
    cyc = mm.get("cycling") or {}
    out["vo2"] = first(gen.get("vo2MaxValue"), gen.get("vo2MaxPreciseValue"))
    out["vo2_cycling"] = first(cyc.get("vo2MaxValue"), cyc.get("vo2MaxPreciseValue"))

    body = safe(api.get_body_composition, d, d) or {}
    weights = [w for w in (body.get("dateWeightList") or []) if w.get("weight")]
    if weights:
        out["weight_kg"] = round(weights[-1]["weight"] / 1000, 2)  # Garmin stores grams

    acts = safe(api.get_activities_by_date, d, d) or []
    out["activities"] = [
        {
            "id": a.get("activityId"),
            "type": (a.get("activityType") or {}).get("typeKey"),
            "name": a.get("activityName"),
            "start": a.get("startTimeLocal"),
            "min": round(a["duration"] / 60, 1) if a.get("duration") else None,
            "km": round(a["distance"] / 1000, 2) if a.get("distance") else None,
            "hr": a.get("averageHR"),
            "watts": first(a.get("avgPower"), a.get("averagePower")),
        }
        for a in acts
        if a.get("activityId")
    ]
    # drop empty fields so the JSON stays small
    return {k: v for k, v in out.items() if v not in (None, [], {})}


def upload(rows: list[dict]) -> None:
    url, key, uid = env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY"), env("SUPABASE_USER_ID")
    if not (url and key and uid):
        sys.exit("Set SUPABASE_URL, SUPABASE_SERVICE_KEY and SUPABASE_USER_ID.")
    payload = [{"user_id": uid, "date": r["date"], "data": r} for r in rows]
    headers = {
        "apikey": key,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    if key.startswith("eyJ"):  # legacy service_role JWT; new sb_secret_ keys only go in the apikey header
        headers["Authorization"] = f"Bearer {key}"
    res = requests.post(
        f"{url.rstrip('/')}/rest/v1/garmin_daily?on_conflict=user_id,date",
        headers=headers,
        data=json.dumps(payload),
        timeout=30,
    )
    if res.status_code >= 300:
        sys.exit(f"Supabase upload failed: {res.status_code} {res.text}")


def main() -> None:
    dry = "--dry-run" in sys.argv
    days = int(env("GARMIN_DAYS", "3") or 3)
    api = login()
    today = date.today()
    rows = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        print(f"Fetching {d} …")
        rows.append(day_values(api, d))
    if dry:
        print(json.dumps(rows, indent=2, ensure_ascii=False))
        return
    upload(rows)
    print(f"Uploaded {len(rows)} days.")


if __name__ == "__main__":
    main()
