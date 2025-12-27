#!/bin/bash

# Fix batch.controller.ts directly on VPS
# Run this script on your VPS server

cd /var/www/primeacademy_backend

BACKEND_FILE="src/controllers/batch.controller.ts"

echo "=========================================="
echo "FIXING batch.controller.ts ON VPS"
echo "=========================================="
echo ""

# Backup the original file
echo "1. Creating backup..."
cp "$BACKEND_FILE" "${BACKEND_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "   ✓ Backup created"
echo ""

# Check if file exists
if [ ! -f "$BACKEND_FILE" ]; then
    echo "ERROR: File not found: $BACKEND_FILE"
    exit 1
fi

echo "2. Making Course model includes conditional..."
echo ""

# Fix 1: Make Course include conditional in getAllBatches
# Find the section with Course model include and replace it
sed -i '/model: db\.Course,/,/required: false,/c\
    // Add Course include only if model exists\
    if (db.Course) {\
      includes.push({\
        model: db.Course,\
        as: '\''course'\'',\
        attributes: ['\''id'\'', '\''name'\'', '\''software'\''],\
        required: false,\
      });\
    } else {\
      logger.warn('\''Course model not found in db object, skipping course include'\'');\
    }' "$BACKEND_FILE"

# Actually, let me create a more precise fix using a different approach
# We'll use a Node.js script to make the changes properly

cat > /tmp/fix-batch-controller.js << 'EOFSCRIPT'
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node fix-batch-controller.js <file-path>');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Replace getAllBatches Course include with conditional version
const getAllBatchesCourseInclude = `        {
          model: db.Course,
          as: 'course',
          attributes: ['id', 'name', 'software'],
          required: false,
        },`;

const getAllBatchesReplacement = `    // Build includes array
    const includes: any[] = [
      {
        model: db.User,
        as: 'admin',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: db.Enrollment,
        as: 'enrollments',
        include: [
          {
            model: db.User,
            as: 'student',
            attributes: ['id', 'name', 'email', 'phone'],
          },
        ],
      },
      {
        model: db.Session,
        as: 'sessions',
        include: [
          {
            model: db.User,
            as: 'faculty',
            attributes: ['id', 'name', 'email'],
          },
        ],
        attributes: ['id', 'facultyId', 'date', 'status'],
      },
      {
        model: db.User,
        as: 'assignedFaculty',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        required: false,
      },
    ];

    // Add Course include only if model exists
    if (db.Course) {
      includes.push({
        model: db.Course,
        as: 'course',
        attributes: ['id', 'name', 'software'],
        required: false,
      });
    } else {
      logger.warn('Course model not found in db object, skipping course include');
    }

    // Get all batches with related data
    const batches = await db.Batch.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: includes,`;

// Find and replace the getAllBatches section
const getAllBatchesPattern = /(\/\/ Get all batches with related data\s+const batches = await db\.Batch\.findAll\(\{[^}]*include: \[[\s\S]*?)(\s+\],\s+order: \[\[)'createdAt'/;
if (getAllBatchesPattern.test(content)) {
  content = content.replace(
    /(\/\/ Get all batches with related data\s+const batches = await db\.Batch\.findAll\(\{[^}]*include: \[)([\s\S]*?)(\s+\],\s+order: \[\[)'createdAt'/,
    (match, p1, p2, p3) => {
      // Remove the Course include from p2
      const includesWithoutCourse = p2.replace(/{\s*model: db\.Course,[\s\S]*?required: false,\s*},?\s*/g, '');
      return getAllBatchesReplacement + p3 + "'createdAt'";
    }
  );
  console.log('✓ Fixed getAllBatches Course include');
} else {
  console.log('⚠ Could not find getAllBatches pattern, trying alternative...');
  // Alternative: just add the conditional check before the include
  if (content.includes('model: db.Course,') && content.includes('as: \'course\'')) {
    // This is a simpler fix - we'll just wrap it
    console.log('⚠ Using manual fix approach');
  }
}

// Fix 2: Replace getBatchById Course include with conditional version
const getBatchByIdReplacement = `    // Build includes array
    const includes: any[] = [
      {
        model: db.User,
        as: 'admin',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: db.Enrollment,
        as: 'enrollments',
        include: [
          {
            model: db.User,
            as: 'student',
            attributes: ['id', 'name', 'email', 'phone'],
          },
        ],
      },
      {
        model: db.Session,
        as: 'sessions',
        include: [
          {
            model: db.User,
            as: 'faculty',
            attributes: ['id', 'name', 'email'],
          },
        ],
        attributes: ['id', 'facultyId', 'date', 'status'],
      },
      {
        model: db.User,
        as: 'assignedFaculty',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        required: false,
      },
    ];

    // Add Course include only if model exists
    if (db.Course) {
      includes.push({
        model: db.Course,
        as: 'course',
        attributes: ['id', 'name', 'software'],
        required: false,
      });
    }

    const batch = await db.Batch.findByPk(batchId, {
      include: includes,`;

// Find and replace getBatchById section
if (content.includes('const batch = await db.Batch.findByPk(batchId, {')) {
  const getBatchByIdPattern = /(const batch = await db\.Batch\.findByPk\(batchId, \{[\s\S]*?include: \[)([\s\S]*?)(\s+\],\s+\}\);)/;
  if (getBatchByIdPattern.test(content)) {
    content = content.replace(
      getBatchByIdPattern,
      (match, p1, p2, p3) => {
        // Remove Course include from p2
        const includesWithoutCourse = p2.replace(/{\s*model: db\.Course,[\s\S]*?required: false,\s*},?\s*/g, '');
        return getBatchByIdReplacement + p3;
      }
    );
    console.log('✓ Fixed getBatchById Course include');
  }
}

// Fix 3: Improve error handling in getAllBatches
content = content.replace(
  /} catch \(error\) \{\s+logger\.error\('Get all batches error:', error\);\s+res\.status\(500\)\.json\(\{[\s\S]*?message: 'Internal server error while fetching batches',\s+\}\);\s+\}/,
  `} catch (error: any) {
    logger.error('Get all batches error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batches',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }`
);
console.log('✓ Improved getAllBatches error handling');

// Fix 4: Improve error handling in getBatchById
content = content.replace(
  /} catch \(error\) \{\s+logger\.error\('Get batch by ID error:', error\);\s+res\.status\(500\)\.json\(\{[\s\S]*?message: 'Internal server error while fetching batch',\s+\}\);\s+\}/,
  `} catch (error: any) {
    logger.error('Get batch by ID error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }`
);
console.log('✓ Improved getBatchById error handling');

// Fix 5: Improve error handling in createBatch
content = content.replace(
  /} catch \(error\) \{\s+await transaction\.rollback\(\);\s+throw error;\s+\}\s+} catch \(error\) \{\s+logger\.error\('Create batch error:', error\);\s+res\.status\(500\)\.json\(\{[\s\S]*?message: 'Internal server error while creating batch',\s+\}\);\s+\}/,
  `} catch (error) {
      await transaction.rollback();
      logger.error('Create batch transaction error:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      throw error;
    }
  } catch (error: any) {
    logger.error('Create batch error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating batch',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }`
);
console.log('✓ Improved createBatch error handling');

fs.writeFileSync(filePath, content, 'utf8');
console.log('');
console.log('✓ All fixes applied successfully!');
EOFSCRIPT

echo "3. Applying fixes using Node.js script..."
node /tmp/fix-batch-controller.js "$BACKEND_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "4. Rebuilding backend..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "5. Restarting backend..."
        pm2 restart backend-api
        echo ""
        echo "=========================================="
        echo "✓ SUCCESS! Backend updated and restarted"
        echo "=========================================="
        echo ""
        echo "Check logs with: pm2 logs backend-api"
    else
        echo ""
        echo "✗ Build failed! Check the errors above."
        echo "Restore backup with: cp ${BACKEND_FILE}.backup.* $BACKEND_FILE"
    fi
else
    echo ""
    echo "✗ Fix script failed! File not modified."
    echo "Restore backup with: cp ${BACKEND_FILE}.backup.* $BACKEND_FILE"
fi

