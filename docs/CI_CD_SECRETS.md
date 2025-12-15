# CI/CD Secrets Configuration Guide

Complete guide for setting up all secrets required for Bakame AI's CI/CD pipeline.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  GitHub Repository                                                  │
│       │                                                             │
│       ├──────────────────────┬──────────────────────────────────┐  │
│       │                      │                                  │  │
│       ▼                      ▼                                  │  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────┐ │  │
│  │   GitHub    │      │   Vercel    │      │   Codemagic     │ │  │
│  │   Actions   │      │   (Web)     │      │   (Mobile)      │ │  │
│  │             │      │             │      │                 │ │  │
│  │ • CI checks │      │ • Preview   │      │ • Android AAB   │ │  │
│  │ • Lint      │      │ • Production│      │ • iOS IPA       │ │  │
│  │ • TypeCheck │      │ • Env vars  │      │ • App Stores    │ │  │
│  └─────────────┘      └─────────────┘      └─────────────────┘ │  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. GitHub Secrets

**Location:** GitHub → Repository → Settings → Secrets and variables → Actions

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create |
| `VERCEL_ORG_ID` | Vercel organization/team ID | Vercel Dashboard → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel Dashboard → Project → Settings → General → Project ID |

### How to Find Vercel IDs

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel link` in your project directory
3. Check `.vercel/project.json`:
   ```json
   {
     "orgId": "team_xxxxxxxxxxxx",     // VERCEL_ORG_ID
     "projectId": "prj_xxxxxxxxxxxx"   // VERCEL_PROJECT_ID
   }
   ```

---

## 2. Vercel Environment Variables

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

### Production Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key (for AI) |
| `UPSTASH_REDIS_REST_URL` | ⚠️ | Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ | Redis token |
| `SENTRY_DSN` | ⚠️ | Sentry error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Client-side Sentry |
| `NEXT_PUBLIC_APP_URL` | ⚠️ | `https://bakame.ai` |

### Optional Tool APIs

| Variable | Description |
|----------|-------------|
| `OPENWEATHER_API_KEY` | Weather tool |
| `TAVILY_API_KEY` | Web search tool |
| `NEWS_API_KEY` | News tool |
| `EXCHANGE_RATE_API_KEY` | Currency tool |
| `GOOGLE_TRANSLATE_API_KEY` | Translation tool |

### Environment Scopes

When adding variables in Vercel, select the appropriate environments:
- **Production**: Main deployment (bakame.ai)
- **Preview**: PR preview deployments
- **Development**: Local development (usually not needed)

---

## 3. Codemagic Configuration

**Location:** [codemagic.io](https://codemagic.io) → Apps → Bakame AI → Settings

### A. Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `API_URL` | `https://bakame.ai` | Production API URL |
| `ENVIRONMENT` | `production` | Environment name |

### B. Android Signing (Required for Play Store)

1. **Generate Keystore** (if you don't have one):
   ```bash
   keytool -genkey -v -keystore bakame-release.keystore \
     -alias bakame -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Upload to Codemagic:**
   - Go to: Teams → Settings → Code signing identities
   - Upload your `.keystore` file
   - Name it: `bakame_keystore`
   - Enter keystore password, key alias, key password

3. **Add to Workflow:**
   ```yaml
   android_signing:
     - bakame_keystore
   ```

### C. Google Play Credentials

1. **Create Service Account:**
   - Go to: [Google Cloud Console](https://console.cloud.google.com)
   - Select your project
   - IAM & Admin → Service Accounts → Create
   - Grant role: "Service Account User"

2. **Enable Play API:**
   - Go to: [Google Play Console](https://play.google.com/console)
   - Setup → API access → Link to your GCP project
   - Grant access to the service account

3. **Generate JSON Key:**
   - In GCP: Service Account → Keys → Add Key → JSON
   - Download the JSON file

4. **Add to Codemagic:**
   - Teams → Settings → Environment variables
   - Create variable group: `google_play_credentials`
   - Add: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` = (paste JSON content)

### D. iOS Signing (Required for App Store)

1. **App Store Connect API Key:**
   - Go to: [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Keys
   - Create new key with "Admin" role
   - Download the `.p8` file (only downloadable once!)
   - Note the Key ID and Issuer ID

2. **Add to Codemagic:**
   - Teams → Settings → Integrations → App Store Connect
   - Click "Add API key"
   - Upload `.p8` file
   - Enter Key ID and Issuer ID
   - Name it: `Bakame AI App Store Connect`

3. **Code Signing (Automatic):**
   - Codemagic can automatically manage provisioning profiles
   - In workflow settings, enable "Automatic code signing"
   - Or manually upload certificates/profiles in Code signing identities

---

## 4. Quick Setup Checklist

### GitHub (5 minutes)
- [ ] Create `VERCEL_TOKEN` secret
- [ ] Create `VERCEL_ORG_ID` secret
- [ ] Create `VERCEL_PROJECT_ID` secret

### Vercel (10 minutes)
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add `OPENROUTER_API_KEY`
- [ ] Add `UPSTASH_REDIS_REST_URL`
- [ ] Add `UPSTASH_REDIS_REST_TOKEN`
- [ ] Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Add `NEXT_PUBLIC_APP_URL`
- [ ] Add any tool API keys you have

### Codemagic (30 minutes)
- [ ] Connect GitHub repository
- [ ] Upload Android keystore
- [ ] Add Google Play service account credentials
- [ ] Set up App Store Connect integration
- [ ] Configure environment variables

---

## 5. Verification Commands

### Test Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (creates .vercel/project.json)
vercel link

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Test GitHub Actions
```bash
# Push to a branch
git push origin feature-branch

# Check Actions tab in GitHub
# Should see "Web App CI/CD" workflow running
```

### Test Codemagic
```bash
# Push to main (triggers release build)
git push origin main

# Or manually trigger in Codemagic dashboard
```

---

## 6. Environment Variable Reference

### Where Each Variable Goes

| Variable | Vercel | GitHub | Codemagic |
|----------|--------|--------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ❌ | ❌ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ❌ | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | ❌ |
| `OPENROUTER_API_KEY` | ✅ | ❌ | ❌ |
| `UPSTASH_REDIS_REST_URL` | ✅ | ❌ | ❌ |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | ❌ | ❌ |
| `SENTRY_DSN` | ✅ | ❌ | ❌ |
| `VERCEL_TOKEN` | ❌ | ✅ | ❌ |
| `VERCEL_ORG_ID` | ❌ | ✅ | ❌ |
| `VERCEL_PROJECT_ID` | ❌ | ✅ | ❌ |
| `API_URL` | ❌ | ❌ | ✅ |
| `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | ❌ | ❌ | ✅ |

---

## 7. Troubleshooting

### Vercel Deployment Fails
- Check all required environment variables are set
- Verify `VERCEL_TOKEN` is valid and not expired
- Check build logs in Vercel dashboard

### Codemagic Build Fails
- Verify keystore credentials match
- Check Flutter version compatibility
- Ensure all dependencies are in pubspec.yaml

### GitHub Actions Fails
- Check secrets are correctly named (case-sensitive)
- Verify Vercel token has correct permissions
- Review workflow logs for specific errors

---

## 8. Security Notes

1. **Never commit secrets** to the repository
2. **Rotate keys regularly** (especially after team changes)
3. **Use environment scopes** in Vercel to separate prod/preview
4. **Limit service account permissions** to minimum required
5. **Enable 2FA** on all service accounts

---

## Quick Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Codemagic Docs](https://docs.codemagic.io/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [OpenRouter Dashboard](https://openrouter.ai/keys)
- [Google Cloud Console](https://console.cloud.google.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
