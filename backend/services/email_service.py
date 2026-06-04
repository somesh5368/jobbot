import os
import logging
import resend
from typing import List, Optional
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from database import get_db

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "jobbot@yourdomain.com")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")

# Setup Jinja2 Template Environment
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
template_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def _log_email(
    email_type: str,
    subject: str,
    body_preview: str,
    status: str,
    resend_id: Optional[str] = None,
    error_msg: Optional[str] = None,
    job_id: Optional[str] = None,
    competition_id: Optional[str] = None
):
    """Log sent emails to Supabase email_log database table"""
    try:
        db = get_db()
        # Find profile id to log against
        profile_res = db.table("profiles").select("id").limit(1).execute()
        if not profile_res.data:
            return
        
        profile_id = profile_res.data[0]["id"]
        
        log_entry = {
            "profile_id": profile_id,
            "email_type": email_type,
            "subject": subject,
            "body_preview": body_preview[:150],
            "status": status,
            "resend_message_id": resend_id,
            "error_message": error_msg,
            "job_id": job_id,
            "competition_id": competition_id,
            "sent_at": datetime.utcnow().isoformat()
        }
        db.table("email_log").insert(log_entry).execute()
    except Exception as e:
        logger.error(f"Failed to write log to email_log: {e}")

def send_job_match_email(to_email: str, recipient_name: str, job: dict) -> bool:
    """Send alert for a single job recommendation match"""
    try:
        template = template_env.get_template("job_alert.html")
        html_content = template.render(
            recipient_name=recipient_name,
            job=job,
            dashboard_url=DASHBOARD_URL
        )
        
        subject = f"🎯 {job.get('match_score', 0)}% Match — {job.get('title')} at {job.get('company')}"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("job_alert", subject, f"Job alert for {job.get('title')}", "sent", resend_id=resend_id, job_id=job.get("id"))
        return True
    except Exception as e:
        logger.error(f"Error in send_job_match_email: {e}")
        _log_email("job_alert", f"Failed match: {job.get('title')}", str(e), "failed", error_msg=str(e), job_id=job.get("id"))
        return False

def send_competition_email(to_email: str, recipient_name: str, comp: dict) -> bool:
    """Send alert for hackathons and coding contests"""
    try:
        template = template_env.get_template("competition_alert.html")
        html_content = template.render(
            recipient_name=recipient_name,
            comp=comp,
            dashboard_url=DASHBOARD_URL
        )
        
        subject = f"🏆 New Competition — {comp.get('title')} by {comp.get('organizer')}"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("competition_alert", subject, f"Competition alert: {comp.get('title')}", "sent", resend_id=resend_id, competition_id=comp.get("id"))
        return True
    except Exception as e:
        logger.error(f"Error in send_competition_email: {e}")
        _log_email("competition_alert", f"Failed contest: {comp.get('title')}", str(e), "failed", error_msg=str(e), competition_id=comp.get("id"))
        return False

def send_interview_prep_email(to_email: str, recipient_name: str, job: dict, prep: dict) -> bool:
    """Send structured prep kit notifications"""
    try:
        template = template_env.get_template("interview_ready.html")
        html_content = template.render(
            recipient_name=recipient_name,
            job=job,
            prep=prep,
            dashboard_url=DASHBOARD_URL
        )
        
        subject = f"📋 Interview Prep Ready — {job.get('title')} at {job.get('company')}"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("interview_prep", subject, f"Prep guide for {job.get('title')}", "sent", resend_id=resend_id, job_id=job.get("id"))
        return True
    except Exception as e:
        logger.error(f"Error in send_interview_prep_email: {e}")
        _log_email("interview_prep", f"Failed prep: {job.get('title')}", str(e), "failed", error_msg=str(e), job_id=job.get("id"))
        return False

def send_weekly_digest_email(
    to_email: str,
    recipient_name: str,
    stats: dict,
    top_jobs: list,
    competitions: list,
    follow_ups: list
) -> bool:
    """Send Sunday weekly activity digest email"""
    try:
        template = template_env.get_template("weekly_digest.html")
        html_content = template.render(
            recipient_name=recipient_name,
            stats=stats,
            top_jobs=top_jobs,
            competitions=competitions,
            follow_ups=follow_ups,
            dashboard_url=DASHBOARD_URL
        )
        
        subject = f"📊 Your Week — {stats.get('scraped', 0)} new jobs, {stats.get('applied', 0)} applications"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("weekly_digest", subject, "Weekly hunting summary", "sent", resend_id=resend_id)
        return True
    except Exception as e:
        logger.error(f"Error in send_weekly_digest_email: {e}")
        _log_email("weekly_digest", "Failed weekly digest", str(e), "failed", error_msg=str(e))
        return False

def send_follow_up_reminder_email(
    to_email: str,
    recipient_name: str,
    job: dict,
    app: dict,
    draft_message: str
) -> bool:
    """Remind users to follow up after 7 days of inactivity"""
    try:
        template = template_env.get_template("follow_up_reminder.html")
        html_content = template.render(
            recipient_name=recipient_name,
            job=job,
            app=app,
            draft_message=draft_message,
            dashboard_url=DASHBOARD_URL
        )
        
        subject = f"⏰ Follow up with {job.get('company')} — {job.get('title')}"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("follow_up_reminder", subject, f"Follow up: {job.get('company')}", "sent", resend_id=resend_id, job_id=job.get("id"))
        return True
    except Exception as e:
        logger.error(f"Error in send_follow_up_reminder_email: {e}")
        _log_email("follow_up_reminder", f"Failed follow-up: {job.get('company')}", str(e), "failed", error_msg=str(e), job_id=job.get("id"))
        return False

def send_fake_job_alert(to_email: str, recipient_name: str, job: dict, reasons: List[str]) -> bool:
    """Alert user when a high-risk fake job is detected (Legacy v1 helper modernized)"""
    try:
        reasons_html = "".join(f"<li style='color:#fca5a5;'>{r}</li>" for r in reasons)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="background:#0f172a;font-family:-apple-system,sans-serif;padding:20px;color:#f1f5f9;">
          <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:16px;padding:30px;border-top:4px solid #ef4444;border-left:1px solid #334155;border-right:1px solid #334155;border-bottom:1px solid #334155;">
            <h2 style="color:#ef4444;margin:0 0 8px;">🚨 Fake Job Detected</h2>
            <p style="color:#cbd5e1;">JobBot flagged this listing as high-risk. DO NOT apply:</p>
            <div style="background:#0f172a;border-radius:10px;padding:16px;margin:16px 0;border:1px solid #334155;">
              <h3 style="color:#f8fafc;margin:0 0 4px;">{job.get('title')}</h3>
              <p style="color:#94a3b8;margin:0;">{job.get('company')}</p>
            </div>
            <ul style="padding-left:20px;margin:0;color:#fca5a5;">{reasons_html}</ul>
            <p style="color:#64748b;font-size:13px;margin-top:16px;">Risk Score: {job.get('fake_risk_score', 0)}/100</p>
          </div>
        </body>
        </html>
        """
        subject = f"🚨 Fake Job Alert: {job.get('title')} — JobBot AI"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("fraud_alert", subject, f"Fake job alert for {job.get('title')}", "sent", resend_id=resend_id, job_id=job.get("id"))
        return True
    except Exception as e:
        logger.error(f"Error in legacy send_fake_job_alert: {e}")
        _log_email("fraud_alert", f"Failed fake alert: {job.get('title')}", str(e), "failed", error_msg=str(e), job_id=job.get("id"))
        return False

def send_auto_apply_confirmation(to_email: str, recipient_name: str, job: dict) -> bool:
    """Send confirmation when JobBot auto-applies to a job (Legacy v1 helper modernized)"""
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="background:#0f172a;font-family:-apple-system,sans-serif;padding:20px;color:#f1f5f9;">
          <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:16px;padding:30px;border-top:4px solid #10b981;border-left:1px solid #334155;border-right:1px solid #334155;border-bottom:1px solid #334155;">
            <h2 style="color:#10b981;margin:0 0 8px;">✅ Auto-Applied!</h2>
            <p style="color:#cbd5e1;">JobBot just applied to this position on your behalf:</p>
            <div style="background:#0f172a;border-radius:10px;padding:16px;margin:16px 0;border:1px solid #334155;">
              <h3 style="color:#f8fafc;margin:0 0 4px;">{job.get('title')}</h3>
              <p style="color:#94a3b8;margin:0;">{job.get('company')} • {job.get('location', 'Remote')}</p>
              <p style="color:#6366f1;margin:8px 0 0;font-weight:bold;">{job.get('match_score', 0)}% Match &bull; Risk: {job.get('fake_risk_score', 0)}%</p>
            </div>
            <p style="color:#64748b;font-size:13px;">Applied on: {datetime.now().strftime('%d %b %Y at %I:%M %p')}</p>
          </div>
        </body>
        </html>
        """
        subject = f"✅ Auto-Applied: {job.get('title')} at {job.get('company')}"
        
        resp = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        
        resend_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        _log_email("application_confirmation", subject, f"Auto-applied: {job.get('title')}", "sent", resend_id=resend_id, job_id=job.get("id"))
        return True
    except Exception as e:
        logger.error(f"Error in legacy send_auto_apply_confirmation: {e}")
        _log_email("application_confirmation", f"Failed confirmation: {job.get('title')}", str(e), "failed", error_msg=str(e), job_id=job.get("id"))
        return False
