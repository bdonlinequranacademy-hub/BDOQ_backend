# Google Sign-In Setup (BOQ Academy)

Google OAuth credentials **Google Cloud Console** থেকে নিতে হবে। সেগুলো `My-Academy/.env` ফাইলে রাখবেন — Git-এ commit করবেন না।

---

## ১. Google Cloud Console-এ যান

1. [Google Cloud Console](https://console.cloud.google.com/) খুলুন
2. Google account দিয়ে login করুন
3. **New Project** তৈরি করুন (যেমন: `BOQ Academy`) অথবা existing project select করুন

---

## ২. OAuth consent screen সেটআপ

1. **APIs & Services** → **OAuth consent screen**
2. User type: **External**
3. App name: `BD Online Quran Academy`
4. User support email: `contact@bdonlinequranacademy.com`
5. Developer contact email: আপনার email
6. Scopes: default (`email`, `profile`, `openid`) যথেষ্ট
7. **Save**

> Production-এ public users ব্যবহার করলে **Publish app** করতে হতে পারে।

---

## ৩. OAuth Client ID তৈরি করুন

1. **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `BOQ Portal OAuth`

### Authorized JavaScript origins

| Environment | URL |
|-------------|-----|
| Local portal | `http://localhost:5174` |
| Production portal | `https://myacademy.bdonlinequranacademy.com` |

### Authorized redirect URIs

Backend callback — **portal নয়, API**:

| Environment | Redirect URI |
|-------------|----------------|
| Local | `http://localhost:5000/api/auth/google/callback` |
| Production | `https://api.bdonlinequranacademy.com/api/auth/google/callback` |

5. **Create** → **Client ID** এবং **Client secret** copy করুন

---

## ৪. `.env` ফাইলে বসান

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

API_BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:5174
```

---

## ৫. Verify

```bash
cd My-Academy && npm run dev
```

```
GET http://localhost:5000/api/auth/oauth-providers
→ { "data": { "google": true } }
```

Portal: `/login?portal=student` → **Continue with Google**

---

## Credentials কোথায় পাবেন

| Variable | Location |
|----------|----------|
| `GOOGLE_CLIENT_ID` | [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client → Client ID |
| `GOOGLE_CLIENT_SECRET` | Same page → Client secret |

---

## Common errors

| Error | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Add exact `{API_BASE_URL}/api/auth/google/callback` in Google Console |
| `oauth_disabled` | Fill `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env` |
| `oauth_account_required` | Teacher/admin must be created by admin first |
