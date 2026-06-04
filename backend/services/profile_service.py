import logging
from uuid import uuid4
from database import get_db

logger = logging.getLogger(__name__)


def ensure_profile_row():
    """
    Single-user app: guarantee one profiles row exists.
    Called on first dashboard access so unlock/login does not fail with 404.
    """
    db = get_db()
    profile_res = db.table("profiles").select("*").limit(1).execute()
    if profile_res.data:
        profile = profile_res.data[0]
        _fix_invalid_setup_email(db, profile)
        return profile

    # Must be a valid email (ProfileResponse uses EmailStr — .local TLD fails validation)
    default_email = f"jobbot-{uuid4().hex[:12]}@example.com"
    insert_res = db.table("profiles").insert(
        {
            "full_name": "New User",
            "email": default_email,
            "experience_level": "fresher",
            "preferred_roles": [],
            "preferred_locations": [],
            "skills": [],
            "email_alerts_enabled": True,
            "alert_threshold": 60,
            "auto_apply_enabled": False,
            "auto_apply_threshold": 85,
        }
    ).execute()

    if not insert_res.data:
        raise RuntimeError("Failed to initialize profile in database")

    logger.info("Created default profile row for first-time setup")
    return insert_res.data[0]


def _fix_invalid_setup_email(db, profile: dict) -> None:
    """Repair legacy placeholder emails that break EmailStr response validation."""
    email = profile.get("email") or ""
    if not email.endswith("@setup.local"):
        return
    fixed = email.replace("@setup.local", "@example.com")
    try:
        db.table("profiles").update({"email": fixed}).eq("id", profile["id"]).execute()
        profile["email"] = fixed
        logger.info("Repaired invalid setup.local profile email")
    except Exception as e:
        logger.warning(f"Could not repair profile email: {e}")
        profile["email"] = fixed
