# VPS Navigation Commands

## 🔍 See All Folders and Files

### List current directory contents
```bash
# Basic list
ls

# Detailed list with permissions and sizes
ls -la

# List with human-readable sizes
ls -lh

# List only directories
ls -d */

# List with colors (if available)
ls --color=auto
```

### Find backend folder location
```bash
# Search for backend folder in current directory
find . -type d -name "backend" 2>/dev/null

# Search in /var/www
find /var/www -type d -name "backend" 2>/dev/null

# Search in entire system (slower)
find / -type d -name "backend" 2>/dev/null | grep -v proc | grep -v sys
```

### Check current location
```bash
# Show current directory
pwd

# Show directory structure
tree -L 2
# or if tree not installed:
ls -R
```

---

## 📂 Common Project Structures

### Structure 1: Separate repos
```
/var/www/
  ├── primeacademy_backend/    (backend code)
  └── primeacademy_frontend/   (frontend code)
```

### Structure 2: Monorepo
```
/var/www/primeacademy/
  ├── backend/
  └── frontend/
```

### Structure 3: Different location
```
/home/user/primeacademy/
  ├── backend/
  └── frontend/
```

---

## 🎯 Commands to Find and Navigate

### Step 1: See what's in current directory
```bash
ls -la
```

### Step 2: Check if backend exists as subdirectory
```bash
ls -la | grep backend
```

### Step 3: Check parent directory
```bash
cd ..
ls -la
```

### Step 4: Search for backend folder
```bash
# From /var/www
find /var/www -type d -name "backend" -maxdepth 3
```

### Step 5: Navigate once found
```bash
# If backend is in current directory
cd backend

# If backend is in parent
cd ../backend

# If backend is in different location
cd /path/to/backend
```

---

## 🔧 Quick Navigation Script

Run this to find your backend:

```bash
echo "Current location: $(pwd)"
echo ""
echo "Contents of current directory:"
ls -la
echo ""
echo "Searching for backend folder..."
find /var/www -type d -name "backend" -maxdepth 3 2>/dev/null
find /home -type d -name "backend" -maxdepth 3 2>/dev/null
```

---

## 📝 Example Commands for Your Situation

Based on your terminal, you're at `/var/www/primeacademy`. Try:

```bash
# 1. See what's actually in this directory
ls -la

# 2. Check if backend is elsewhere
ls -la /var/www/

# 3. Check if it's named differently
ls -la | grep -i back
ls -la | grep -i api
ls -la | grep -i server

# 4. Search for it
find /var/www -type d -name "*back*" 2>/dev/null

# 5. Check if you need to clone from GitHub
# If backend doesn't exist, you might need to clone it:
# git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend
```

---

## 🚀 If Backend Doesn't Exist - Clone It

If the backend folder doesn't exist, clone it from GitHub:

```bash
# Make sure you're in the right place
cd /var/www/primeacademy

# Clone backend repository
git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend

# Clone frontend repository (if needed)
git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git frontend

# Verify
ls -la
```

---

## ✅ Verify After Navigation

Once you find/navigate to backend:

```bash
# Check you're in the right place
pwd

# See backend contents
ls -la

# Check if it's a git repository
git status

# Check remote
git remote -v
```




