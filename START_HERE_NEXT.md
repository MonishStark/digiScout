<!-- @format -->

# YOUR EXACT NEXT STEPS - FOLLOW THIS ORDER

---

## 📌 YOU ARE HERE

✅ All local work is DONE
✅ Frontend built
✅ Environment file created with passwords
✅ Files ready to upload

**You're 20% done. 80% remains on GCP VM.**

---

## 🎯 THE 4 STEPS TO DEPLOY

### STEP 1️⃣: GET YOUR API KEYS (5 minutes)

**You need 4 keys. Copy each link and follow the instructions:**

#### Key #1: Gemini API

```
Link: https://aistudio.google.com/app/apikeys
Steps:
  1. Open the link
  2. Click "Create API key"
  3. Copy the key
Action: Save it temporarily (you'll need it soon)
```

#### Key #2: Google Maps

```
Link: https://console.cloud.google.com/apis/library
Steps:
  1. Open the link
  2. Search for "Places API"
  3. Enable it
  4. Search for "Maps JavaScript API"
  5. Enable it
  6. Go to Credentials (left menu)
  7. Click "Create Credentials" > "API Key"
  8. Copy the key
Action: Save it temporarily
```

#### Key #3: Netlify Token

```
Link: https://app.netlify.com/user/applications
Steps:
  1. Open the link (log in if needed)
  2. Scroll to "Personal access tokens"
  3. Click "New access token"
  4. Name it: Digital Scout
  5. Copy the token
Action: Save it temporarily
```

#### Key #4: CallHippo API Key

```
Link: https://app.callhippo.com/
Steps:
  1. Open the link (log in)
  2. Go to Settings > Integrations > API
  3. Copy your API key
Action: Save it temporarily
```

---

### STEP 2️⃣: EDIT .env.production FILE (5 minutes)

**File location:**

```
c:\Users\Dhanush\Downloads\zip\.env.production
```

**Open it with any text editor (Notepad, VS Code, etc.)**

**Find these 4 lines:**

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GOOGLE_MAPS_PLATFORM_KEY=YOUR_GOOGLE_MAPS_KEY_HERE
VITE_NETLIFY_TOKEN=YOUR_NETLIFY_TOKEN_HERE
CALLHIPPO_API_KEY=YOUR_CALLHIPPO_KEY_HERE
```

**Replace each value:**

```
GEMINI_API_KEY=sk-proj-abcd1234...  ← Your actual Gemini key
GOOGLE_MAPS_PLATFORM_KEY=AIzaSyD...  ← Your actual Maps key
VITE_NETLIFY_TOKEN=nfp_123...        ← Your actual Netlify token
CALLHIPPO_API_KEY=ch_...             ← Your actual CallHippo key
```

**Also find and update:**

```
APP_DOMAIN=your-domain.com           ← Your actual domain
APP_DOMAIN_EMAIL=admin@your-domain.com  ← Your email
```

**Then save the file (Ctrl+S)**

---

### STEP 3️⃣: GET YOUR GCP VM INFO (2 minutes)

**Open Google Cloud Console:**

1. Go to: https://console.cloud.google.com/
2. Go to: Compute Engine > VM Instances
3. Find your VM instance
4. **Copy these 3 values:**

```
VM_NAME = (name of your instance, e.g., "digitalscout-prod")
VM_ZONE = (zone it's in, e.g., "us-central1-a")
VM_IP   = (External IP, e.g., "34.123.45.67")
```

**Note them down:**

```
My VM Name:  _______________
My VM Zone:  _______________
My VM IP:    _______________
```

---

### STEP 4️⃣: UPLOAD FILES TO GCP (5 minutes)

**Copy this exact command:**

```bash
gcloud compute scp --recurse `
  --exclude='.git/*' `
  --exclude='node_modules/*' `
  --exclude='.env.local' `
  'c:\Users\Dhanush\Downloads\zip\' YOUR_VM_NAME:/opt/digitalscout/ `
  --zone=YOUR_VM_ZONE
```

**Replace the values with yours:**

❌ WRONG:

```bash
gcloud compute scp --recurse ... YOUR_VM_NAME:/opt/digitalscout/ ...
```

✅ RIGHT:

```bash
gcloud compute scp --recurse `
  --exclude='.git/*' `
  --exclude='node_modules/*' `
  --exclude='.env.local' `
  'c:\Users\Dhanush\Downloads\zip\' digitalscout-prod:/opt/digitalscout/ `
  --zone=us-central1-a
```

**Paste the command in PowerShell and press Enter**

**Wait for upload to complete** (~2-5 minutes)

---

## 🎬 NOW OPEN THIS FILE FOR GCP DEPLOYMENT

**Open file:**

```
c:\Users\Dhanush\Downloads\zip\GCP_DEPLOYMENT_ONLY.md
```

**This file contains 17 numbered commands you execute on the GCP VM.**

**Start with: GCP COMMAND #1: SSH Into VM**

---

## 📊 WHAT YOU JUST DID

- ✅ Gathered 4 API keys
- ✅ Edited environment file with your secrets
- ✅ Got your GCP VM details
- ✅ Uploaded everything to GCP VM

**Next: Follow GCP_DEPLOYMENT_ONLY.md commands in order**

---

## ⏱️ TIME ESTIMATE

**What you just did:** 17 minutes
**What's left (GCP):** 40-50 minutes

**Total:** ~1 hour

---

## 🔑 IMPORTANT REMINDERS

- 🔒 Never share .env.production file
- 🔒 Never commit .env.production to git
- 🔒 Keep your 4 API keys secret
- ⏸️ When you update DNS at your registrar, wait 5 minutes before continuing
- 📝 Some commands are long - copy the ENTIRE command block

---

## 🎯 YOUR CHECKLIST

- [ ] Gathered all 4 API keys
- [ ] Edited .env.production with real values
- [ ] Updated APP_DOMAIN and APP_DOMAIN_EMAIL
- [ ] Saved .env.production
- [ ] Noted down VM_NAME, VM_ZONE, VM_IP
- [ ] Ran gcloud scp upload command
- [ ] Upload completed successfully
- [ ] Ready to open GCP_DEPLOYMENT_ONLY.md

---

## 🚀 READY TO START GCP DEPLOYMENT?

**Open:** `GCP_DEPLOYMENT_ONLY.md`

**Start with:** `GCP COMMAND #1: SSH Into VM`

**Execute commands in order from the file.**

---

**Questions about a command?** Each command in GCP_DEPLOYMENT_ONLY.md has explanation and expected output.

**Need help?** Check the troubleshooting section at the bottom of GCP_DEPLOYMENT_ONLY.md

---

**You've got this! 🚀**
