"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const models_1 = __importDefault(require("../models"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
const seedUsers = async () => {
    try {
        // Connect to database
        await database_1.default.authenticate();
        console.log('Database connected successfully.');
        const saltRounds = 10;
        const defaultPassword = 'password123'; // Change this in production!
        const passwordHash = await bcrypt_1.default.hash(defaultPassword, saltRounds);
        // Create SuperAdmin
        const [, superAdminCreated] = await models_1.default.User.findOrCreate({
            where: { email: 'superadmin@primeacademy.com' },
            defaults: {
                name: 'Super Admin',
                email: 'superadmin@primeacademy.com',
                phone: '+1234567890',
                role: User_1.UserRole.SUPERADMIN,
                passwordHash,
                isActive: true,
            },
        });
        console.log(superAdminCreated
            ? '✓ SuperAdmin created'
            : '✓ SuperAdmin already exists');
        // Create Admin
        const [, adminCreated] = await models_1.default.User.findOrCreate({
            where: { email: 'admin@primeacademy.com' },
            defaults: {
                name: 'Admin User',
                email: 'admin@primeacademy.com',
                phone: '+1234567891',
                role: User_1.UserRole.ADMIN,
                passwordHash,
                isActive: true,
            },
        });
        console.log(adminCreated ? '✓ Admin created' : '✓ Admin already exists');
        // Create Faculty
        const [, facultyCreated] = await models_1.default.User.findOrCreate({
            where: { email: 'faculty@primeacademy.com' },
            defaults: {
                name: 'Faculty User',
                email: 'faculty@primeacademy.com',
                phone: '+1234567892',
                role: User_1.UserRole.FACULTY,
                passwordHash,
                isActive: true,
            },
        });
        console.log(facultyCreated ? '✓ Faculty created' : '✓ Faculty already exists');
        // Create Student
        const [, studentCreated] = await models_1.default.User.findOrCreate({
            where: { email: 'student@primeacademy.com' },
            defaults: {
                name: 'Student User',
                email: 'student@primeacademy.com',
                phone: '+1234567893',
                role: User_1.UserRole.STUDENT,
                passwordHash,
                isActive: true,
            },
        });
        console.log(studentCreated ? '✓ Student created' : '✓ Student already exists');
        console.log('\n=== Default Login Credentials ===');
        console.log('All users have the password: password123\n');
        console.log('SuperAdmin:');
        console.log('  Email: superadmin@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Admin:');
        console.log('  Email: admin@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Faculty:');
        console.log('  Email: faculty@primeacademy.com');
        console.log('  Password: password123\n');
        console.log('Student:');
        console.log('  Email: student@primeacademy.com');
        console.log('  Password: password123\n');
    }
    catch (error) {
        console.error('Error seeding users:', error);
        throw error;
    }
    finally {
        await database_1.default.close();
    }
};
// Run if called directly
if (require.main === module) {
    seedUsers()
        .then(() => {
        console.log('Seeding completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}
exports.default = seedUsers;
//# sourceMappingURL=seed.js.map