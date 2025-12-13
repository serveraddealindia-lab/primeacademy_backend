# Rupee Symbol Setup for PDF Receipts

## Current Status
✅ SVG rupee symbol file created at: `backend/rupee.svg`

## How It Works
The code now:
1. Checks for rupee image files (PNG, JPG, SVG) in multiple locations
2. Reads the file and converts to base64
3. Uses it in PDF generation
4. Falls back to inline SVG if no file found

## If Rupee Symbol Still Not Showing

### Option 1: Convert SVG to PNG (Recommended)
pdfmake works better with PNG format. Convert the SVG to PNG:

**Using Online Tool:**
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `rupee.svg`
3. Set size to 24x24 or 48x48 pixels
4. Download as `rupee.png`
5. Place in `backend/rupee.png`

**Using ImageMagick (if installed):**
```bash
magick convert rupee.svg -resize 24x24 rupee.png
```

### Option 2: Download PNG Directly
Download a PNG rupee symbol:
1. Search for "rupee symbol PNG" online
2. Download a small image (24x24 to 48x48 pixels)
3. Save as `rupee.png` in the `backend` folder

### Option 3: Use the SVG (Current)
The code already uses the SVG file. If it's not showing, pdfmake might not support SVG format.

## Verify It's Working

1. **Check logs when generating receipt:**
   ```
   ✅ Rupee image loaded successfully from: [path] ([size] bytes)
   ```

2. **Restart server:**
   ```bash
   npm start
   ```

3. **Generate a new receipt** (not an old one)

## File Locations Checked (in order):
- `backend/rupee.png` ✅ (Best - use this)
- `backend/rupee.jpg`
- `backend/rupee.svg` ✅ (Currently exists)
- `dist/controllers/../../rupee.*`

## Next Steps
1. Convert `rupee.svg` to `rupee.png` (24x24 or 48x48 pixels)
2. Place `rupee.png` in `backend` folder
3. Restart server
4. Generate new receipt

The PNG format will work best with pdfmake!

