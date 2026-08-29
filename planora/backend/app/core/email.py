from __future__ import annotations

import html
import os
import secrets

import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Planora <onboarding@resend.dev>")
RESEND_EMAIL_URL = "https://api.resend.com/emails"


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return "".join(str(secrets.randbelow(10)) for _ in range(6))


async def send_otp_email(email: str, otp: str, user_name: str) -> bool:
    """Send OTP via Resend. Returns False when email is not configured or fails."""
    if not RESEND_API_KEY:
        print(f"[DEV OTP] {email}: {otp}")
        return False

    safe_name = html.escape(user_name)
    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [email],
        "subject": "Verify your Planora account",
        "html": f"""
<h2>Welcome to Planora, {safe_name}!</h2>
<p>Your one-time code is:</p>
<h1 style="font-size: 48px; letter-spacing: 5px; font-weight: bold;">{otp}</h1>
<p>This code expires in 15 minutes.</p>
<p>If you did not sign up, you can safely ignore this email.</p>
""",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                RESEND_EMAIL_URL,
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            print(f"Failed to send OTP email: {response.status_code} {response.text}")
            return False
        return True
    except Exception as exc:
        print(f"Failed to send OTP email: {exc}")
        return False
