# Direct VPS Commands to Fix batch.controller.ts

## Quick Fix - Run These Commands on Your VPS:

```bash
cd /var/www/primeacademy_backend

# 1. Backup the file
cp src/controllers/batch.controller.ts src/controllers/batch.controller.ts.backup

# 2. Use nano to edit the file
nano src/controllers/batch.controller.ts
```

## Manual Edits Needed in nano:

### Fix 1: Around line 1205 (getAllBatches function)
**FIND:**
```typescript
        {
          model: db.Course,
          as: 'course',
          attributes: ['id', 'name', 'software'],
          required: false,
        },
```

**REPLACE WITH:**
```typescript
        // Add Course include only if model exists
        ...(db.Course ? [{
          model: db.Course,
          as: 'course',
          attributes: ['id', 'name', 'software'],
          required: false,
        }] : []),
```

### Fix 2: Around line 1356 (getBatchById function)
**FIND:**
```typescript
        {
          model: db.Course,
          as: 'course',
          attributes: ['id', 'name', 'software'],
          required: false,
        },
```

**REPLACE WITH:**
```typescript
        // Add Course include only if model exists
        ...(db.Course ? [{
          model: db.Course,
          as: 'course',
          attributes: ['id', 'name', 'software'],
          required: false,
        }] : []),
```

### Fix 3: Around line 1279 (getAllBatches error handling)
**FIND:**
```typescript
  } catch (error) {
    logger.error('Get all batches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batches',
    });
  }
```

**REPLACE WITH:**
```typescript
  } catch (error: any) {
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
  }
```

### Fix 4: Around line 1442 (getBatchById error handling)
**FIND:**
```typescript
  } catch (error) {
    logger.error('Get batch by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch',
    });
  }
```

**REPLACE WITH:**
```typescript
  } catch (error: any) {
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
  }
```

## After Making Changes:

```bash
# Save in nano: Ctrl+O, Enter, Ctrl+X

# Rebuild
npm run build

# Restart
pm2 restart backend-api

# Check logs
pm2 logs backend-api
```

