# EUROPIUM Gmail SMTP setup

The transactional email code uses Gmail SMTP only. The Resend dependency and any existing Resend environment variables may remain configured, but the application no longer calls Resend.

## Render environment variables

Add these to the EUROPIUM Render Web Service:

- `GMAIL_SMTP_USER`: `europiumbd63@gmail.com`
- `GMAIL_SMTP_APP_PASSWORD`: the 16-character Google App Password for that Gmail account (paste it without spaces; the app also strips whitespace)
- `GMAIL_SMTP_FROM_NAME`: `EUROPIUM` (optional; defaults to `EUROPIUM`)

Keep the existing Supabase environment variables. Do not add the Gmail account's normal password. Never commit the App Password or put it in source code/chat.

## Create the Google App Password

1. Sign in to the Google Account for `europiumbd63@gmail.com`.
2. Enable 2-Step Verification if it is not already enabled.
3. Open Google Account security settings and create an App Password. If Google does not offer App Passwords for this account, Gmail SMTP cannot be enabled this way for the account.
4. Copy the generated App Password into Render as `GMAIL_SMTP_APP_PASSWORD`.

## Verification

After Render has deployed the code and the environment variables are saved, create a fresh test order using an email inbox you can check. Verify the event in Admin → Orders and check the recipient's Inbox and Spam/Junk folders. Gmail SMTP acceptance means Gmail accepted the message for sending; it does not guarantee final inbox delivery.

## Important delivery and retry behavior

Consumer Gmail has sending limits and may restrict unusual automated sending. Use this for low-volume testing, not high-volume marketing. Gmail SMTP does not support Resend's idempotency-key mechanism, so the recovery job flags stale ambiguous sends for review instead of automatically resending and potentially duplicating customer emails.

Existing `needs_review` events are not automatically resent by switching providers. Verify provider logs first before attempting any manual resend.
