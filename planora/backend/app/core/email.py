import os
from datetime import datetime, timedelta
import secrets
from typing import Optional

# Try to import Resend, fall back if not available
try:
    from resend import Resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    Resend = None

# Initialize Resend client
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
resend_client = None

if RESEND_AVAILABLE and RESEND_API_KEY:
    try:
        resend_client = Resend(api_key=RESEND_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to initialize Resend client: {e}")


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return "".join([str(secrets.randbelow(10)) for _ in range(6)])


def send_otp_email(email: str, otp: str, user_name: str) -> bool:
    """Send OTP via Resend. Returns True if sent successfully."""
    if not resend_client:
        print(f"[DEMO] OTP for {email}: {otp}")  # Fallback for local dev
        return True

    try:
        resend_client.emails.send(
            {
                "from": "noreply@planora.app",
                "to": email,
                "subject": "Verify your Planora account",
                "html": f"""
<h2>Welcome to Planora, {user_name}!</h2>
<p>Your one-time code is:</p>
<h1 style="font-size: 48px; letter-spacing: 5px; font-weight: bold;">{otp}</h1>
<p>This code expires in 15 minutes.</p>
<p>If you didn't sign up, you can safely ignore this email.</p>
""",
            }
        )
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        return False