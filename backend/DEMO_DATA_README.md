# Demo Data Seeder

This seeder creates demo/test data for the Prime Academy system.

## What It Creates

- **5 Employees** with employee profiles
- **5 Faculty** members with faculty profiles (expertise and availability)
- **5 Students** with student profiles
- **5 Batches** with different software and schedules
- **Enrollments** - Students enrolled in batches
- **Sessions** - 10 sessions per batch (some completed, some ongoing, some scheduled)

## How to Run

### Option 1: Run All Seeders (Recommended)
```bash
cd backend
npm run seed
```

This will run both the default users seeder and the demo data seeder.

### Option 2: Run Only Demo Data Seeder
```bash
cd backend
npx ts-node src/seeders/20240101000002-seed-demo-data.ts
```

## Login Credentials

All users have the password: **password123**

### Employees
1. John Employee - employee1@primeacademy.com
2. Sarah Employee - employee2@primeacademy.com
3. Mike Employee - employee3@primeacademy.com
4. Emily Employee - employee4@primeacademy.com
5. David Employee - employee5@primeacademy.com

### Faculty
1. Dr. Alice Faculty - faculty3@primeacademy.com
2. Prof. Bob Faculty - faculty4@primeacademy.com
3. Dr. Carol Faculty - faculty5@primeacademy.com
4. Prof. Daniel Faculty - faculty6@primeacademy.com
5. Dr. Eva Faculty - faculty7@primeacademy.com

### Students
1. Alex Student - student3@primeacademy.com
2. Maria Student - student4@primeacademy.com
3. James Student - student5@primeacademy.com
4. Lisa Student - student6@primeacademy.com
5. Tom Student - student7@primeacademy.com

### Batches Created
1. Digital Art Fundamentals - Batch 1 (Photoshop, Illustrator, InDesign)
2. Architecture & Design - Batch 1 (AutoCAD, SketchUp, Revit)
3. Video Production Masterclass - Batch 1 (Premiere Pro, After Effects, DaVinci Resolve)
4. 3D Animation & Modeling - Batch 1 (Blender, Maya, 3ds Max)
5. UI/UX Design Bootcamp - Batch 1 (Figma, Adobe XD, Sketch)

## Notes

- The seeder checks for existing users/batches to avoid duplicates
- Students are automatically enrolled in batches
- Sessions are created with different statuses (completed, ongoing, scheduled)
- All dates are set to 2024 for consistency

## Remove Demo Data

To remove the demo data, you can run:
```bash
cd backend
npx ts-node -e "import('./src/seeders/20240101000002-seed-demo-data').then(m => m.default.down(require('./src/config/database').default.getQueryInterface()))"
```

Or manually delete the users and batches from the database.






