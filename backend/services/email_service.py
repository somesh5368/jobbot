"""
Email Alert Service using Resend
Free tier: 3000 emails/month - more than enough
"""
import os
import resend
from typing import List
from datetime import datetime

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "jobbot@yourdomain.com")  # Set in Resend dashboard


def send_new_jobs_alert(
    to_email: str,
    recipient_name: str,
    jobs: List[dict],
) -> bool:
    """Send email when new matching jobs are found"""
    if not jobs:
        return False

    job_cards_html = ""
    for job in jobs[:10]:  # Max 10 per email
        risk_color = "#22c55e" if job.get("fake_risk_score", 0) < 30 else \
                     "#f59e0b" if job.get("fake_risk_score", 0) < 60 else "#ef4444"
        risk_label = "✅ Safe" if job.get("fake_risk_score", 0) < 30 else \
                     "⚠️ Check" if job.get("fake_risk_score", 0) < 60 else "🚨 Risky"

        job_cards_html += f"""
        <div style="background:#1e293b;border-radius:12px;padding:20px;margin:16px 0;border-left:4px solid #6366f1;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <h3 style="color:#f1f5f9;margin:0 0 4px;">{job.get('title', 'N/A')}</h3>
              <p style="color:#94a3b8;margin:0;">{job.get('company', 'N/A')} • {job.get('location', 'Remote')}</p>
            </div>
            <span style="background:#6366f1;color:white;padding:4px 12px;border-radius:20px;font-size:14px;font-weight:bold;">
              {job.get('match_score', 0)}% Match
            </span>
          </div>
          <div style="margin:12px 0;display:flex;gap:12px;flex-wrap:wrap;">
            <span style="background:#0f172a;color:#94a3b8;padding:4px 10px;border-radius:6px;font-size:13px;">
              📍 {job.get('work_mode', 'N/A')}
            </span>
            <span style="background:#0f172a;color:#94a3b8;padding:4px 10px;border-radius:6px;font-size:13px;">
              💰 {job.get('stipend', 'N/A')}
            </span>
            <span style="background:#0f172a;color:#94a3b8;padding:4px 10px;border-radius:6px;font-size:13px;">
              🌐 {job.get('source', 'N/A')}
            </span>
            <span style="color:{risk_color};font-size:13px;font-weight:bold;">
              {risk_label} (Risk: {job.get('fake_risk_score', 0)}%)
            </span>
          </div>
          <a href="{job.get('apply_url', '#')}" 
             style="display:inline-block;background:#6366f1;color:white;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
            Apply Now →
          </a>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;">
        
        <!-- Header -->
        <div style="text-align:center;padding:30px 0 20px;">
          <div style="font-size:32px;margin-bottom:8px;">🤖</div>
          <h1 style="color:#f1f5f9;margin:0;font-size:24px;">JobBot AI Alert</h1>
          <p style="color:#64748b;margin:8px 0 0;">Hey {recipient_name}! Found {len(jobs)} new matching opportunities</p>
        </div>

        <!-- Summary Bar -->
        <div style="background:#1e293b;border-radius:12px;padding:16px 20px;margin:16px 0;display:flex;justify-content:space-between;">
          <div style="text-align:center;">
            <div style="color:#6366f1;font-size:24px;font-weight:bold;">{len(jobs)}</div>
            <div style="color:#64748b;font-size:12px;">New Listings</div>
          </div>
          <div style="text-align:center;">
            <div style="color:#22c55e;font-size:24px;font-weight:bold;">{sum(1 for j in jobs if j.get('fake_risk_score', 0) < 30)}</div>
            <div style="color:#64748b;font-size:12px;">Verified Safe</div>
          </div>
          <div style="text-align:center;">
            <div style="color:#f59e0b;font-size:24px;font-weight:bold;">{max((j.get('match_score', 0) for j in jobs), default=0)}%</div>
            <div style="color:#64748b;font-size:12px;">Top Match</div>
          </div>
        </div>

        <!-- Job Cards -->
        {job_cards_html}

        <!-- Footer -->
        <div style="text-align:center;padding:20px 0;border-top:1px solid #1e293b;margin-top:20px;">
          <p style="color:#334155;font-size:12px;margin:0;">
            JobBot AI • Scanning 24/7 for {recipient_name}<br>
            Sent at {datetime.now().strftime('%d %b %Y, %I:%M %p')} IST
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"🎯 {len(jobs)} New Job Matches Found — JobBot AI",
            "html": html_content,
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False


def send_auto_apply_confirmation(
    to_email: str,
    recipient_name: str,
    job: dict,
) -> bool:
    """Send confirmation when JobBot auto-applies to a job"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="background:#0f172a;font-family:-apple-system,sans-serif;padding:20px;">
      <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:16px;padding:30px;border-top:4px solid #22c55e;">
        <h2 style="color:#22c55e;margin:0 0 8px;">✅ Auto-Applied!</h2>
        <p style="color:#94a3b8;">JobBot just applied to this position on your behalf:</p>
        <div style="background:#0f172a;border-radius:10px;padding:16px;margin:16px 0;">
          <h3 style="color:#f1f5f9;margin:0 0 4px;">{job.get('title')}</h3>
          <p style="color:#64748b;margin:0;">{job.get('company')} • {job.get('location', 'Remote')}</p>
          <p style="color:#6366f1;margin:8px 0 0;font-weight:bold;">{job.get('match_score', 0)}% Match • Risk: {job.get('fake_risk_score', 0)}%</p>
        </div>
        <p style="color:#64748b;font-size:13px;">Applied on: {datetime.now().strftime('%d %b %Y at %I:%M %p')}</p>
      </div>
    </body>
    </html>
    """
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"✅ Auto-Applied: {job.get('title')} at {job.get('company')}",
            "html": html_content,
        })
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False


def send_fake_job_alert(
    to_email: str,
    recipient_name: str,
    job: dict,
    reasons: List[str],
) -> bool:
    """Alert user when a high-risk fake job is detected"""
    reasons_html = "".join(f"<li style='color:#fca5a5;'>{r}</li>" for r in reasons)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="background:#0f172a;font-family:-apple-system,sans-serif;padding:20px;">
      <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:16px;padding:30px;border-top:4px solid #ef4444;">
        <h2 style="color:#ef4444;margin:0 0 8px;">🚨 Fake Job Detected</h2>
        <p style="color:#94a3b8;">JobBot flagged this listing as high-risk. DO NOT apply:</p>
        <div style="background:#0f172a;border-radius:10px;padding:16px;margin:16px 0;">
          <h3 style="color:#f1f5f9;margin:0 0 4px;">{job.get('title')}</h3>
          <p style="color:#64748b;margin:0;">{job.get('company')}</p>
        </div>
        <ul style="padding-left:20px;margin:0;">{reasons_html}</ul>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">Risk Score: {job.get('fake_risk_score', 0)}/100</p>
      </div>
    </body>
    </html>
    """
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"🚨 Fake Job Alert: {job.get('title')} — JobBot AI",
            "html": html_content,
        })
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False
