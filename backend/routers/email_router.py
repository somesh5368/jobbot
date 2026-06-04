from fastapi import APIRouter, HTTPException
from database import get_db
from services.email_service import FROM_EMAIL
import resend

router = APIRouter()

@router.post("/test")
async def send_test_email():
    """Trigger a simple diagnostic test email to confirm Resend delivery configurations"""
    db = get_db()
    profile_res = db.table("profiles").select("email, full_name").limit(1).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile credentials not set.")
        
    profile = profile_res.data[0]
    to_email = profile["email"]
    to_name = profile["full_name"]
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:30px;">
      <h2>🚀 JobBot Email Service Live!</h2>
      <p>Hello {to_name},</p>
      <p>This is a successful diagnostic email. Your Resend API integrations are working perfectly.</p>
      <p>JobBot AI Automated Agents</p>
    </body>
    </html>
    """
    
    try:
        res = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "🚀 JobBot Email Service Connection Verified!",
            "html": html_content
        })
        return {"success": True, "resend_id": res.get("id") if isinstance(res, dict) else getattr(res, "id", None)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resend dispatch failed: {str(e)}")

@router.get("/log")
async def get_email_logs():
    """Retrieve last 50 recorded logs from the email_log table"""
    db = get_db()
    res = db.table("email_log").select("*").order("sent_at", desc=True).limit(50).execute()
    return {"logs": res.data or []}
