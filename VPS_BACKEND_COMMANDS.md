# VPS Backend Navigation Commands

## 🔍 Current Situation
- You can see `primeacademy_backend` in the listing
- But `cd primeacademy_backend` fails
- This means you're in a different directory than where you ran `ls -l`

## ✅ Solution Commands

### Step 1: Check where you are now
```bash
pwd
```

### Step 2: Navigate to where backend actually is
Based on your listing, the backend is likely in `/var/www`. Try:

```bash
# Go to /var/www
cd /var/www

# Verify backend is there
ls -la | grep primeacademy_backend

# Now navigate to backend
cd primeacademy_backend
```

### Step 3: Or use full path directly
```bash
cd /var/www/primeacademy_backend
```

### Step 4: Verify you're in backend
```bash
pwd
ls -la
```

---

## 🎯 Complete Command Sequence

Run these commands in order:

```bash
# 1. Check current location
pwd

# 2. Go to /var/www
cd /var/www

# 3. List to see backend
ls -la

# 4. Navigate to backend
cd primeacademy_backend

# 5. Verify
pwd
ls -la
```

---

## 🔧 Alternative: If Backend is in Different Location

If backend is not in `/var/www`, find it:

```bash
# Search for backend
find /var/www -type d -name "primeacademy_backend" 2>/dev/null
find /home -type d -name "primeacademy_backend" 2>/dev/null
find /root -type d -name "primeacademy_backend" 2>/dev/null

# Once found, navigate using full path
cd /path/to/primeacademy_backend
```

---

## 📝 Quick One-Liner

```bash
cd /var/www && ls -la && cd primeacademy_backend && pwd
```




