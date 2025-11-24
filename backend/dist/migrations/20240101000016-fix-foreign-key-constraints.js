"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    up: async (queryInterface) => {
        try {
            // Get all foreign key constraint names for the tables we need to modify
            const [batchFks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'batches'
        AND COLUMN_NAME = 'createdByAdminId'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);
            // Drop and recreate batches.createdByAdminId foreign key
            if (batchFks.length > 0) {
                const fkName = batchFks[0].CONSTRAINT_NAME;
                await queryInterface.sequelize.query(`
          ALTER TABLE \`batches\`
          DROP FOREIGN KEY \`${fkName}\`;
        `);
            }
            // Modify column to allow NULL and add new foreign key
            await queryInterface.sequelize.query(`
        ALTER TABLE \`batches\`
        MODIFY COLUMN \`createdByAdminId\` INT NULL;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`batches\`
        ADD CONSTRAINT \`batches_createdByAdminId_fkey\`
        FOREIGN KEY (\`createdByAdminId\`) REFERENCES \`users\`(\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL;
      `);
            // Fix sessions.facultyId
            const [sessionFks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sessions'
        AND COLUMN_NAME = 'facultyId'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);
            if (sessionFks.length > 0) {
                const fkName = sessionFks[0].CONSTRAINT_NAME;
                await queryInterface.sequelize.query(`
          ALTER TABLE \`sessions\`
          DROP FOREIGN KEY \`${fkName}\`;
        `);
            }
            await queryInterface.sequelize.query(`
        ALTER TABLE \`sessions\`
        MODIFY COLUMN \`facultyId\` INT NULL;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`sessions\`
        ADD CONSTRAINT \`sessions_facultyId_fkey\`
        FOREIGN KEY (\`facultyId\`) REFERENCES \`users\`(\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL;
      `);
            // Fix software_completions.facultyId
            const [completionFks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'software_completions'
        AND COLUMN_NAME = 'facultyId'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);
            if (completionFks.length > 0) {
                const fkName = completionFks[0].CONSTRAINT_NAME;
                await queryInterface.sequelize.query(`
          ALTER TABLE \`software_completions\`
          DROP FOREIGN KEY \`${fkName}\`;
        `);
            }
            await queryInterface.sequelize.query(`
        ALTER TABLE \`software_completions\`
        MODIFY COLUMN \`facultyId\` INT NULL;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`software_completions\`
        ADD CONSTRAINT \`software_completions_facultyId_fkey\`
        FOREIGN KEY (\`facultyId\`) REFERENCES \`users\`(\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL;
      `);
            console.log('✓ Foreign key constraints updated successfully');
        }
        catch (error) {
            console.error('Error updating foreign key constraints:', error);
            throw error;
        }
    },
    down: async (queryInterface) => {
        // Revert to RESTRICT (original behavior)
        // Note: This will fail if there are NULL values, so we need to handle that
        try {
            // Update NULL values to a default admin/faculty before reverting
            const [adminUsers] = await queryInterface.sequelize.query(`
        SELECT id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1;
      `);
            const [facultyUsers] = await queryInterface.sequelize.query(`
        SELECT id FROM users WHERE role = 'faculty' LIMIT 1;
      `);
            const defaultAdminId = adminUsers.length > 0 ? adminUsers[0].id : null;
            const defaultFacultyId = facultyUsers.length > 0 ? facultyUsers[0].id : null;
            if (defaultAdminId) {
                await queryInterface.sequelize.query(`
          UPDATE batches SET createdByAdminId = ${defaultAdminId} WHERE createdByAdminId IS NULL;
        `);
            }
            if (defaultFacultyId) {
                await queryInterface.sequelize.query(`
          UPDATE sessions SET facultyId = ${defaultFacultyId} WHERE facultyId IS NULL;
        `);
                await queryInterface.sequelize.query(`
          UPDATE software_completions SET facultyId = ${defaultFacultyId} WHERE facultyId IS NULL;
        `);
            }
            // Now revert constraints
            await queryInterface.sequelize.query(`
        ALTER TABLE \`batches\`
        DROP FOREIGN KEY \`batches_createdByAdminId_fkey\`;
      `).catch(() => { });
            await queryInterface.sequelize.query(`
        ALTER TABLE \`batches\`
        MODIFY COLUMN \`createdByAdminId\` INT NOT NULL;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`batches\`
        ADD CONSTRAINT \`batches_createdByAdminId_fkey\`
        FOREIGN KEY (\`createdByAdminId\`) REFERENCES \`users\`(\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`sessions\`
        DROP FOREIGN KEY \`sessions_facultyId_fkey\`;
      `).catch(() => { });
            await queryInterface.sequelize.query(`
        ALTER TABLE \`sessions\`
        MODIFY COLUMN \`facultyId\` INT NOT NULL;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`sessions\`
        ADD CONSTRAINT \`sessions_facultyId_fkey\`
        FOREIGN KEY (\`facultyId\`) REFERENCES \`users\`(\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`software_completions\`
        DROP FOREIGN KEY \`software_completions_facultyId_fkey\`;
      `).catch(() => { });
            await queryInterface.sequelize.query(`
        ALTER TABLE \`software_completions\`
        MODIFY COLUMN \`facultyId\` INT NOT NULL;
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE \`software_completions\`
        ADD CONSTRAINT \`software_completions_facultyId_fkey\`
        FOREIGN KEY (\`facultyId\`) REFERENCES \`users\`(\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT;
      `);
        }
        catch (error) {
            console.error('Error reverting foreign key constraints:', error);
            throw error;
        }
    },
};
//# sourceMappingURL=20240101000016-fix-foreign-key-constraints.js.map