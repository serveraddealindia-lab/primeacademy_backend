"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const bcrypt_1 = __importDefault(require("bcrypt"));
exports.default = {
    async up(queryInterface) {
        const saltRounds = 10;
        const defaultPassword = 'password123'; // Change this in production!
        const passwordHash = await bcrypt_1.default.hash(defaultPassword, saltRounds);
        const now = new Date();
        const users = [
            // 1 SuperAdmin
            {
                name: 'Super Admin',
                email: 'superadmin@primeacademy.com',
                phone: '+1234567890',
                role: 'superadmin',
                passwordHash,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            // 1 Admin
            {
                name: 'Admin User',
                email: 'admin@primeacademy.com',
                phone: '+1234567891',
                role: 'admin',
                passwordHash,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            // 2 Faculty
            {
                name: 'Faculty User 1',
                email: 'faculty1@primeacademy.com',
                phone: '+1234567892',
                role: 'faculty',
                passwordHash,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: 'Faculty User 2',
                email: 'faculty2@primeacademy.com',
                phone: '+1234567893',
                role: 'faculty',
                passwordHash,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            // 2 Students
            {
                name: 'Student User 1',
                email: 'student1@primeacademy.com',
                phone: '+1234567894',
                role: 'student',
                passwordHash,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: 'Student User 2',
                email: 'student2@primeacademy.com',
                phone: '+1234567895',
                role: 'student',
                passwordHash,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
        ];
        // Check if users already exist to avoid duplicates
        const emailList = users.map(u => u.email);
        const placeholders = emailList.map(() => '?').join(',');
        const [results] = await queryInterface.sequelize.query(`SELECT email FROM users WHERE email IN (${placeholders})`, {
            replacements: emailList,
            type: sequelize_1.QueryTypes.SELECT,
        });
        const existingUsers = Array.isArray(results) ? results : [];
        const existingEmails = new Set(existingUsers.map((u) => u.email));
        const usersToInsert = users.filter(u => !existingEmails.has(u.email));
        if (usersToInsert.length > 0) {
            try {
                await queryInterface.bulkInsert('users', usersToInsert);
                console.log(`\n✓ Inserted ${usersToInsert.length} new user(s)`);
            }
            catch (error) {
                // Handle duplicate entry errors gracefully
                if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
                    console.log('\n⚠ Some users already exist, skipping duplicates');
                }
                else {
                    throw error;
                }
            }
        }
        else {
            console.log('\n✓ All users already exist, skipping insertion');
        }
        console.log('\n✓ Seeded users successfully!');
        console.log('\n=== Default Login Credentials ===');
        console.log('All users have the password: password123\n');
        console.log('SuperAdmin:');
        console.log('  Email: superadmin@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Admin:');
        console.log('  Email: admin@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Faculty 1:');
        console.log('  Email: faculty1@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Faculty 2:');
        console.log('  Email: faculty2@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Student 1:');
        console.log('  Email: student1@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Student 2:');
        console.log('  Email: student2@primeacademy.com');
        console.log('  Password: password123\n');
    },
    async down(queryInterface) {
        // Remove seeded users
        await queryInterface.bulkDelete('users', {
            email: {
                [sequelize_1.Op.in]: [
                    'superadmin@primeacademy.com',
                    'admin@primeacademy.com',
                    'faculty1@primeacademy.com',
                    'faculty2@primeacademy.com',
                    'student1@primeacademy.com',
                    'student2@primeacademy.com',
                ],
            },
        });
        console.log('✓ Removed seeded users');
    },
};
//# sourceMappingURL=20240101000001-seed-users.js.map