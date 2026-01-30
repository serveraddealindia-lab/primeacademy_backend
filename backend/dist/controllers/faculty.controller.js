"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFacultyProfile = exports.createFaculty = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// POST /api/faculty - Create faculty profile
const createFaculty = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { userId, expertise, availability, documents, softwareProficiency } = req.body;
        // Validation
        if (!userId) {
            res.status(400).json({
                status: 'error',
                message: 'userId is required',
            });
            return;
        }
        // Verify user exists and has faculty role
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        if (user.role !== User_1.UserRole.FACULTY) {
            res.status(400).json({
                status: 'error',
                message: 'User must have faculty role. Please update user role to faculty first.',
            });
            return;
        }
        // Check if faculty profile already exists
        const existingProfile = await models_1.default.FacultyProfile.findOne({ where: { userId } });
        if (existingProfile) {
            res.status(409).json({
                status: 'error',
                message: 'Faculty profile already exists for this user',
            });
            return;
        }
        // Validate required fields from documents - documents object is required
        if (!documents) {
            res.status(400).json({
                status: 'error',
                message: 'Documents object with personalInfo, employmentInfo, bankInfo, and emergencyInfo is required',
            });
            return;
        }
        const { personalInfo, employmentInfo, bankInfo, emergencyInfo } = documents;
        // Validate personal information - REQUIRED
        if (!personalInfo) {
            res.status(400).json({
                status: 'error',
                message: 'Personal information is required',
            });
            return;
        }
        if (!personalInfo.gender || !personalInfo.gender.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Gender is required',
            });
            return;
        }
        if (!personalInfo.dateOfBirth || !personalInfo.dateOfBirth.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Date of Birth is required',
            });
            return;
        }
        // Validate Date of Birth - must be at least 18 years old
        const dobDate = new Date(personalInfo.dateOfBirth);
        if (isNaN(dobDate.getTime())) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid date of birth format',
            });
            return;
        }
        if (dobDate > new Date()) {
            res.status(400).json({
                status: 'error',
                message: 'Date of birth cannot be in the future',
            });
            return;
        }
        // Check if age is at least 18
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        const dayDiff = today.getDate() - dobDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }
        if (age < 18) {
            res.status(400).json({
                status: 'error',
                message: 'Faculty must be at least 18 years old',
            });
            return;
        }
        if (!personalInfo.nationality || !personalInfo.nationality.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Nationality is required',
            });
            return;
        }
        if (!personalInfo.maritalStatus || !personalInfo.maritalStatus.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Marital Status is required',
            });
            return;
        }
        if (!personalInfo.address || !personalInfo.address.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Address is required',
            });
            return;
        }
        if (!personalInfo.city || !personalInfo.city.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'City is required',
            });
            return;
        }
        if (!personalInfo.state || !personalInfo.state.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'State is required',
            });
            return;
        }
        if (!personalInfo.postalCode || !personalInfo.postalCode.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Postal Code is required',
            });
            return;
        }
        // Validate employment information - REQUIRED
        if (!employmentInfo) {
            res.status(400).json({
                status: 'error',
                message: 'Employment information is required',
            });
            return;
        }
        if (!employmentInfo.department || !employmentInfo.department.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Department is required',
            });
            return;
        }
        if (!employmentInfo.designation || !employmentInfo.designation.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Designation is required',
            });
            return;
        }
        if (!employmentInfo.dateOfJoining || !employmentInfo.dateOfJoining.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Date of Joining is required',
            });
            return;
        }
        if (!employmentInfo.employmentType || !employmentInfo.employmentType.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Employment Type is required',
            });
            return;
        }
        if (!employmentInfo.workLocation || !employmentInfo.workLocation.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Work Location is required',
            });
            return;
        }
        // Validate bank information - REQUIRED
        if (!bankInfo) {
            res.status(400).json({
                status: 'error',
                message: 'Bank information is required',
            });
            return;
        }
        if (!bankInfo.bankName || !bankInfo.bankName.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Bank Name is required',
            });
            return;
        }
        if (!bankInfo.accountNumber || !bankInfo.accountNumber.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Account Number is required',
            });
            return;
        }
        if (!bankInfo.ifscCode || !bankInfo.ifscCode.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'IFSC Code is required',
            });
            return;
        }
        if (!bankInfo.branch || !bankInfo.branch.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Branch is required',
            });
            return;
        }
        if (!bankInfo.panNumber || !bankInfo.panNumber.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'PAN Number is required',
            });
            return;
        }
        // Validate PAN format (10 characters, alphanumeric)
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(bankInfo.panNumber.toUpperCase())) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid PAN Number format. PAN should be 10 characters (e.g., ABCDE1234F)',
            });
            return;
        }
        // Validate IFSC format (11 characters)
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankInfo.ifscCode.toUpperCase())) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid IFSC Code format. IFSC should be 11 characters (e.g., ABCD0123456)',
            });
            return;
        }
        // Validate emergency contact information - REQUIRED
        if (!emergencyInfo) {
            res.status(400).json({
                status: 'error',
                message: 'Emergency contact information is required',
            });
            return;
        }
        if (!emergencyInfo.emergencyContactName || !emergencyInfo.emergencyContactName.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Emergency Contact Name is required',
            });
            return;
        }
        if (!emergencyInfo.emergencyRelationship || !emergencyInfo.emergencyRelationship.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Emergency Relationship is required',
            });
            return;
        }
        if (!emergencyInfo.emergencyPhoneNumber || !emergencyInfo.emergencyPhoneNumber.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'Emergency Phone Number is required',
            });
            return;
        }
        // Validate phone number format (10 digits)
        const emergencyPhoneCleaned = emergencyInfo.emergencyPhoneNumber.replace(/[\s-]/g, '');
        if (!/^[0-9]{10}$/.test(emergencyPhoneCleaned)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid Emergency Phone Number format. Please enter a valid 10-digit phone number',
            });
            return;
        }
        // Validate expertise and availability
        if (!expertise || expertise.trim() === '') {
            res.status(400).json({
                status: 'error',
                message: 'Expertise/Specialization is required',
            });
            return;
        }
        if (!availability || availability.trim() === '') {
            res.status(400).json({
                status: 'error',
                message: 'Availability is required',
            });
            return;
        }
        // Prepare documents object with software proficiency
        let documentsData = documents || {};
        if (softwareProficiency) {
            documentsData.softwareProficiency = softwareProficiency;
        }
        // Create faculty profile
        const facultyProfile = await models_1.default.FacultyProfile.create({
            userId,
            dateOfBirth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth) : null,
            expertise: typeof expertise === 'string' ? { description: expertise } : expertise,
            availability: typeof availability === 'string' ? { schedule: availability } : availability,
            documents: Object.keys(documentsData).length > 0 ? documentsData : null,
        });
        // Fetch the created profile with user information
        const profileWithUser = await models_1.default.FacultyProfile.findByPk(facultyProfile.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
                },
            ],
        });
        res.status(201).json({
            status: 'success',
            message: 'Faculty profile created successfully',
            data: {
                facultyProfile: {
                    id: profileWithUser?.id,
                    userId: profileWithUser?.userId,
                    expertise: profileWithUser?.expertise,
                    availability: profileWithUser?.availability,
                    user: profileWithUser?.user,
                    createdAt: profileWithUser?.createdAt,
                    updatedAt: profileWithUser?.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create faculty error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating faculty profile',
        });
    }
};
exports.createFaculty = createFaculty;
// PUT /api/faculty/:id - Update faculty profile
const updateFacultyProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const facultyProfileId = parseInt(req.params.id, 10);
        if (isNaN(facultyProfileId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid faculty profile ID',
            });
            return;
        }
        const { expertise, availability } = req.body;
        // Find faculty profile
        const facultyProfile = await models_1.default.FacultyProfile.findByPk(facultyProfileId, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
                },
            ],
        });
        if (!facultyProfile) {
            res.status(404).json({
                status: 'error',
                message: 'Faculty profile not found',
            });
            return;
        }
        // Check permissions: users can update their own profile, admins can update any
        if (req.user.userId !== facultyProfile.userId &&
            req.user.role !== User_1.UserRole.SUPERADMIN &&
            req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only update your own faculty profile unless you are an admin',
            });
            return;
        }
        // Update fields
        if (expertise !== undefined) {
            // Handle both string and object formats
            if (typeof expertise === 'string') {
                facultyProfile.expertise = { description: expertise };
            }
            else if (expertise !== null) {
                facultyProfile.expertise = expertise;
            }
            else {
                facultyProfile.expertise = null;
            }
        }
        if (availability !== undefined) {
            // Handle both string and object formats
            if (typeof availability === 'string') {
                facultyProfile.availability = { schedule: availability };
            }
            else if (availability !== null) {
                facultyProfile.availability = availability;
            }
            else {
                facultyProfile.availability = null;
            }
        }
        await facultyProfile.save();
        // Fetch updated profile with user
        let updatedProfile;
        try {
            updatedProfile = await models_1.default.FacultyProfile.findByPk(facultyProfile.id, {
                include: [
                    {
                        model: models_1.default.User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
                    },
                ],
            });
        }
        catch (queryError) {
            logger_1.logger.error('Error fetching updated faculty profile with user:', queryError);
            // Fallback: fetch without user association
            updatedProfile = await models_1.default.FacultyProfile.findByPk(facultyProfile.id);
        }
        res.status(200).json({
            status: 'success',
            message: 'Faculty profile updated successfully',
            data: {
                facultyProfile: {
                    id: updatedProfile?.id,
                    userId: updatedProfile?.userId,
                    expertise: updatedProfile?.expertise,
                    availability: updatedProfile?.availability,
                    user: updatedProfile?.user,
                    createdAt: updatedProfile?.createdAt,
                    updatedAt: updatedProfile?.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update faculty profile error:', error);
        logger_1.logger.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            code: error?.parent?.code,
            sql: error?.parent?.sql,
            facultyProfileId: req.params.id,
            body: req.body,
        });
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating faculty profile',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        });
    }
};
exports.updateFacultyProfile = updateFacultyProfile;
//# sourceMappingURL=faculty.controller.js.map