"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const createUser = async (userData) => {
    try {
        const response = await axios_1.default.post(`${API_BASE_URL}/auth/register`, userData);
        console.log(`✓ ${userData.role} created successfully:`, response.data.data.user.email);
        return response.data;
    }
    catch (error) {
        if (error.response?.status === 409) {
            console.log(`✓ ${userData.role} already exists:`, userData.email);
            return null;
        }
        throw error;
    }
};
const createDefaultUsers = async () => {
    const defaultPassword = 'password123';
    const users = [
        {
            name: 'Super Admin',
            email: 'superadmin@primeacademy.com',
            password: defaultPassword,
            role: 'superadmin',
            phone: '+1234567890',
        },
        {
            name: 'Admin User',
            email: 'admin@primeacademy.com',
            password: defaultPassword,
            role: 'admin',
            phone: '+1234567891',
        },
        {
            name: 'Faculty User',
            email: 'faculty@primeacademy.com',
            password: defaultPassword,
            role: 'faculty',
            phone: '+1234567892',
        },
        {
            name: 'Student User',
            email: 'student@primeacademy.com',
            password: defaultPassword,
            role: 'student',
            phone: '+1234567893',
        },
    ];
    console.log('Creating users via API...\n');
    console.log('Make sure the backend server is running!\n');
    for (const user of users) {
        try {
            await createUser(user);
        }
        catch (error) {
            console.error(`✗ Error creating ${user.role}:`, error.response?.data?.message || error.message);
        }
    }
    console.log('\n=== Default Login Credentials ===');
    console.log('All users have the password: password123\n');
    users.forEach((user) => {
        console.log(`${user.role.charAt(0).toUpperCase() + user.role.slice(1)}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Password: ${defaultPassword}\n`);
    });
};
// Run if called directly
if (require.main === module) {
    createDefaultUsers()
        .then(() => {
        console.log('\nUser creation completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('User creation failed:', error.message);
        process.exit(1);
    });
}
exports.default = createDefaultUsers;
//# sourceMappingURL=create-user-via-api.js.map