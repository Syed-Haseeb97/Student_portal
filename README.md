# IIIT Tiruchirappalli Academic Attendance Portal

Official mobile-first academic attendance ledger, 75% statutory bunk margin calculator, and administrative portal for Indian Institute of Information Technology, Tiruchirappalli.

## Authorization & Deployment Status

- **Authorization Override**: The project owner has explicitly authorized real email delivery (Resend) and live Firebase Auth/Firestore configuration through environment variables.
- **Institutional Access Boundary**: Access is strictly limited to verified `@iiitt.ac.in` institutional email addresses matching an active record on the approved institutional roster or staff registry.
- **Security Posture**: All mutations are handled via server-only Firebase Admin SDK routes wrapped in transactions. Cloud Firestore client rules enforce deny-by-default on all collections.

---

## Architecture & Technology Stack

- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Design System**: Mobility IIITT Theme (`#171915` canvas, `#20261F` surfaces, `#2D382B` borders, `#D9FA58` electric lime accents, sharp `rounded-[3px]` geometry)
- **Identity & Authentication**: Firebase Authentication (Passwordless Email Link) + Verified `@iiitt.ac.in` claim
- **Database & Storage**: Google Cloud Firestore (Admin SDK server-side, client deny-by-default)
- **Outbound Mailer**: Resend API (`EMAIL_FROM`) with server console fallback in development/emulator modes
- **State Management**: Context-driven `AuthProvider` & `useAuth` hook with real server profile resolution (`GET /api/me`)

---

## Live Configuration & Setup Guide

### 1. Firebase Console Configuration
1. **Create or select the dedicated Firebase project** for IIIT Trichy Attendance Portal.
2. **Enable Email Link (Passwordless) Sign-in**:
   - Go to **Authentication** > **Sign-in method**.
   - Click on **Email/Password**.
   - Enable **Email / Password** and toggle on **Email link (passwordless sign-in)**.
   - Click **Save**.
3. **Configure Authorized Domains**:
   - In **Authentication** > **Settings** > **Authorized domains**, add your deployment domains:
     - `localhost` (for local dev)
     - `portal.iiitt.ac.in` (production)
     - Your Vercel domain (e.g. `*.vercel.app`)
4. **Generate Service Account Private Key**:
   - Go to **Project Settings** > **Service accounts**.
   - Click **Generate new private key** and download the JSON file.
   - Set the raw JSON string as `FIREBASE_SERVICE_ACCOUNT_JSON` in your environment (never commit this file to git).
   - Set `FIREBASE_ADMIN_PROJECT_ID` to your project ID.
5. **Deploy Firestore Rules**:
   - Deploy `firestore.rules` using the Firebase CLI:
     ```bash
     firebase deploy --only firestore:rules
     ```

### 2. Outbound Email Delivery Setup

The portal supports two outbound email providers: **Gmail SMTP** (`EMAIL_PROVIDER=gmail`) and **Resend** (`EMAIL_PROVIDER=resend`).

#### Option A: Gmail SMTP Configuration (Recommended)
1. **Enable 2-Step Verification**:
   - Navigate to your [Google Account Security](https://myaccount.google.com/security).
   - Ensure **2-Step Verification** is enabled.
2. **Generate a 16-character App Password**:
   - Go to **Security** > **2-Step Verification** > **App passwords** (or search "App passwords" in account search).
   - Create an app named `IIITT Attendance Portal`.
   - Copy the generated 16-character string (format: `xxxx xxxx xxxx xxxx`).
3. **Configure Environment Variables**:
   ```env
   EMAIL_PROVIDER=gmail
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   EMAIL_FROM="IIIT Trichy Attendance Portal <your-email@gmail.com>"
   ```
4. **Important Operational Notes & Limitations**:
   - **Address Alignment**: `EMAIL_FROM` must use the exact same email address as `GMAIL_USER`. Google SMTP will reject or flag messages if the sender address attempts spoofing.
   - **Daily Sending Quota**: Free standard Gmail accounts are subject to an outbound limit of **~500 emails per 24-hour rolling window** (Google Workspace accounts allow up to ~2,000/day).
   - **Spam Warning & Burst Suspension**: Sending rapid bursts of automated sign-in emails can trigger Gmail's automated heuristics, causing outbound rate limiting, message rejections, or temporary account suspension.
5. **SMTP Diagnostic Script**:
   Verify outbound delivery directly via CLI:
   ```bash
   npx tsx scripts/send-test-email.ts <recipient@iiitt.ac.in>
   ```

#### Option B: Resend Configuration
1. Sign up or log into [Resend](https://resend.com).
2. Generate an API Key under **API Keys** and set `RESEND_API_KEY`.
3. Set `EMAIL_PROVIDER=resend`.
4. **Institutional Domain Verification**:
   - By default, Resend's free `onboarding@resend.dev` only delivers to the owner's email address.
   - To deliver to real students and faculty `@iiitt.ac.in`, add `iiitt.ac.in` under **Domains** in Resend and configure the DNS records (DKIM, SPF, MX).
   - Configure `EMAIL_FROM="IIITT Attendance <attendance@iiitt.ac.in>"`.

### 3. First Administrator Bootstrap
Every administrative route requires an active `staff/{uid}` document with `role: "admin"`. Use the safe offline bootstrap script (never exposed over HTTP):

```bash
# Ensure your environment variables are configured in .env.local
npx tsx scripts/bootstrap-admin.ts <admin-email@iiitt.ac.in> "Initial authorized administrator provisioning"
```

This script:
1. Verifies the user exists in Firebase Auth (or marks them verified).
2. Creates `staff/{uid}` with `role: "admin"` and `active: true`.
3. Appends an immutable record to the `auditEvents` collection.

---

## Local Development & Testing

### Environment Setup
Copy the template configuration:
```bash
# Windows PowerShell:
Copy-Item .env.example .env.local

# Linux/macOS:
cp .env.example .env.local
```

### Running Checks & Tests
```bash
# Full verification suite (lint, typecheck, unit and route authorization tests):
npm run check

# Security rules unit tests (against Firebase emulator):
npm run test:rules

# Route integration tests (against Firebase emulator):
npm run test:api

# Production build:
npm run build
```

---

## 75% Statutory Attendance Ordinance Rules

1. **Threshold**: Exactly 75.0% is compliant. A percentage of 74.9% is a shortfall.
2. **Completed Sessions Only**: Scheduled and cancelled sessions never count towards attendance calculation.
3. **Auditability**: Administrative corrections require an active administrator session, a mandatory written justification (5–300 characters), and write an append-only audit record.
