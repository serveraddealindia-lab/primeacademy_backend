import { Response } from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';

// __dirname is available in CommonJS

const certificatesDir = path.join(__dirname, '../../certificates');
if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir, { recursive: true });
}

// Generate unique certificate number
const generateCertificateNumber = (studentName: string, courseName: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Extract initials from student name
  const nameParts = studentName.trim().split(/\s+/);
  const initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('');
  
  // Extract first letter of course
  const courseInitial = courseName.charAt(0).toUpperCase();
  
  // Format: PA/A/MP/20251120 (Prime Academy / Course Initial / Student Initials / Date)
  return `PA/${courseInitial}/${initials}/${year}${month}${day}`;
};

// Generate PDF certificate using HTML template with Puppeteer - Exact match to reference image
const generateCertificatePDF = async (
  studentName: string,
  courseName: string,
  softwareCovered: string[],
  grade: string,
  monthOfCompletion: string,
  certificateNumber: string
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    let browser;
    try {
      // Read HTML template
      const templatePath = path.join(__dirname, '../templates/certificate.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
      
      // Replace placeholders with actual data
      htmlTemplate = htmlTemplate.replace('{{STUDENT_NAME}}', studentName.toUpperCase());
      htmlTemplate = htmlTemplate.replace('{{COURSE_NAME}}', courseName);
      htmlTemplate = htmlTemplate.replace('{{SOFTWARE_COVERED}}', softwareCovered.join(', '));
      htmlTemplate = htmlTemplate.replace('{{GRADE}}', grade);
      htmlTemplate = htmlTemplate.replace('{{MONTH_OF_COMPLETION}}', monthOfCompletion);
      htmlTemplate = htmlTemplate.replace('{{CERTIFICATE_NUMBER}}', certificateNumber);
      
      // Launch Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      
      // Set content and wait for fonts/styles to load
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const filename = `certificate_${certificateNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
      const filepath = path.join(certificatesDir, filename);
      
      await page.pdf({
        path: filepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      });
      
      await browser.close();
      
      resolve(`/certificates/${filename}`);
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      logger.error('Certificate PDF generation error:', error);
      reject(error);
    }
  });
};

// POST /api/certificates - Create certificate
export const createCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can create certificates',
      });
      return;
    }

    const { studentId, courseName, softwareCovered, grade, monthOfCompletion, certificateNumber, studentDeclarationAccepted } = req.body;

    if (!studentId || !courseName || !grade || !monthOfCompletion) {
      res.status(400).json({
        status: 'error',
        message: 'Student, course name, grade, and month of completion are required',
      });
      return;
    }

    // Validate student exists
    const student = await db.User.findByPk(studentId);
    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    if (student.role !== UserRole.STUDENT) {
      res.status(400).json({
        status: 'error',
        message: 'Selected user is not a student',
      });
      return;
    }

    // Generate certificate number if not provided
    const finalCertificateNumber = certificateNumber || generateCertificateNumber(student.name, courseName);

    // Check if certificate number already exists
    const existingCert = await db.Certificate.findOne({
      where: { certificateNumber: finalCertificateNumber },
    });
    if (existingCert) {
      res.status(409).json({
        status: 'error',
        message: 'Certificate number already exists',
      });
      return;
    }

    // Generate PDF
    const pdfUrl = await generateCertificatePDF(
      student.name,
      courseName,
      Array.isArray(softwareCovered) ? softwareCovered : [],
      grade,
      monthOfCompletion,
      finalCertificateNumber
    );

    // Create certificate record
    const certificate = await db.Certificate.create({
      studentId,
      courseName,
      softwareCovered: Array.isArray(softwareCovered) ? softwareCovered : [],
      grade,
      monthOfCompletion,
      certificateNumber: finalCertificateNumber,
      pdfUrl,
      issuedBy: req.user.userId,
      issuedAt: new Date(),
      studentDeclarationAccepted: studentDeclarationAccepted === true,
      studentDeclarationDate: studentDeclarationAccepted === true ? new Date() : undefined,
    });

    // Fetch with associations
    const certificateWithDetails = await db.Certificate.findByPk(certificate.id, {
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email'], required: false },
        { model: db.User, as: 'issuer', attributes: ['id', 'name', 'email'], required: false },
      ],
    });

    // Get backend base URL
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const backendBaseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
    const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${backendBaseUrl}${pdfUrl}`;

    // Ensure softwareCovered is an array in the response
    const certObj = certificateWithDetails?.toJSON();
    if (certObj && !Array.isArray(certObj.softwareCovered)) {
      if (typeof certObj.softwareCovered === 'string') {
        try {
          certObj.softwareCovered = JSON.parse(certObj.softwareCovered);
        } catch {
          const softwareStr = String(certObj.softwareCovered);
          certObj.softwareCovered = softwareStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }
      } else {
        certObj.softwareCovered = [];
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Certificate created successfully',
      data: {
        certificate: certObj || certificateWithDetails,
        pdfUrl: fullPdfUrl,
      },
    });
  } catch (error) {
    logger.error('Create certificate error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating certificate',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// GET /api/certificates - Get all certificates
export const getAllCertificates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const certificates = await db.Certificate.findAll({
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email'] },
        { model: db.User, as: 'issuer', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Get backend base URL
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const backendBaseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
    
    // Convert relative PDF URLs to full URLs and ensure softwareCovered is an array
    const certificatesWithFullUrls = certificates.map((cert) => {
      const certObj = cert.toJSON();
      if (certObj.pdfUrl && !certObj.pdfUrl.startsWith('http')) {
        certObj.pdfUrl = `${backendBaseUrl}${certObj.pdfUrl}`;
      }
      // Ensure softwareCovered is always an array
      if (!Array.isArray(certObj.softwareCovered)) {
        if (typeof certObj.softwareCovered === 'string') {
          try {
            // Try to parse as JSON string
            certObj.softwareCovered = JSON.parse(certObj.softwareCovered);
          } catch {
            // If not JSON, treat as comma-separated string
            const softwareStr = String(certObj.softwareCovered);
          certObj.softwareCovered = softwareStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
          }
        } else {
          certObj.softwareCovered = [];
        }
      }
      return certObj;
    });

    res.status(200).json({
      status: 'success',
      data: {
        certificates: certificatesWithFullUrls,
      },
    });
  } catch (error) {
    logger.error('Get certificates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching certificates',
    });
  }
};

// GET /api/certificates/:id - Get certificate by ID
export const getCertificateById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const certificateId = parseInt(req.params.id, 10);
    if (isNaN(certificateId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid certificate ID',
      });
      return;
    }

    const certificate = await db.Certificate.findByPk(certificateId, {
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email'] },
        { model: db.User, as: 'issuer', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!certificate) {
      res.status(404).json({
        status: 'error',
        message: 'Certificate not found',
      });
      return;
    }

    // Get backend base URL
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const backendBaseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
    const certObj = certificate.toJSON();
    if (certObj.pdfUrl && !certObj.pdfUrl.startsWith('http')) {
      certObj.pdfUrl = `${backendBaseUrl}${certObj.pdfUrl}`;
    }
    // Ensure softwareCovered is always an array
    if (!Array.isArray(certObj.softwareCovered)) {
      if (typeof certObj.softwareCovered === 'string') {
        try {
          certObj.softwareCovered = JSON.parse(certObj.softwareCovered);
        } catch {
          const softwareStr = String(certObj.softwareCovered);
          certObj.softwareCovered = softwareStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }
      } else {
        certObj.softwareCovered = [];
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        certificate: certObj,
      },
    });
  } catch (error) {
    logger.error('Get certificate error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching certificate',
    });
  }
};

// GET /api/certificates/:id/download - Download certificate PDF
export const downloadCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const certificateId = parseInt(req.params.id, 10);
    if (isNaN(certificateId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid certificate ID',
      });
      return;
    }

    const certificate = await db.Certificate.findByPk(certificateId);
    if (!certificate) {
      res.status(404).json({
        status: 'error',
        message: 'Certificate not found',
      });
      return;
    }

    if (!certificate.pdfUrl) {
      res.status(404).json({
        status: 'error',
        message: 'PDF not found for this certificate',
      });
      return;
    }

    const filepath = path.join(__dirname, '../..', certificate.pdfUrl);
    if (!fs.existsSync(filepath)) {
      res.status(404).json({
        status: 'error',
        message: 'PDF file not found on server',
      });
      return;
    }

    res.download(filepath, `certificate_${certificate.certificateNumber}.pdf`);
  } catch (error) {
    logger.error('Download certificate error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while downloading certificate',
    });
  }
};
