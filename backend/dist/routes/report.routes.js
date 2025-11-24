"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController = __importStar(require("../controllers/report.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /reports/all-students
router.get('/all-students', auth_middleware_1.verifyTokenMiddleware, reportController.getAllStudents);
// GET /reports/students-without-batch
router.get('/students-without-batch', auth_middleware_1.verifyTokenMiddleware, reportController.getStudentsWithoutBatch);
// GET /reports/batch-attendance?batchId=&from=&to=
router.get('/batch-attendance', auth_middleware_1.verifyTokenMiddleware, reportController.getBatchAttendance);
// GET /reports/pending-payments
router.get('/pending-payments', auth_middleware_1.verifyTokenMiddleware, reportController.getPendingPayments);
// GET /reports/portfolio-status
router.get('/portfolio-status', auth_middleware_1.verifyTokenMiddleware, reportController.getPortfolioStatus);
// Import extended report functions
const extendedReportController = __importStar(require("../controllers/report-extended.controller"));
// GET /reports/student/:studentId/current-batch
router.get('/student/:studentId/current-batch', auth_middleware_1.verifyTokenMiddleware, extendedReportController.getStudentCurrentBatch);
// GET /reports/student/:studentId/attendance?from=&to=
router.get('/student/:studentId/attendance', auth_middleware_1.verifyTokenMiddleware, extendedReportController.getStudentAttendance);
// GET /reports/batches-by-faculty?facultyId=&from=&to=
router.get('/batches-by-faculty', auth_middleware_1.verifyTokenMiddleware, extendedReportController.getBatchesByFaculty);
// GET /reports/monthwise-payments?month=&year=
router.get('/monthwise-payments', auth_middleware_1.verifyTokenMiddleware, extendedReportController.getMonthwisePayments);
// GET /reports/all-analysis
router.get('/all-analysis', auth_middleware_1.verifyTokenMiddleware, extendedReportController.getAllAnalysisReports);
// GET /reports/download?type=
router.get('/download', auth_middleware_1.verifyTokenMiddleware, extendedReportController.downloadReportCSV);
exports.default = router;
//# sourceMappingURL=report.routes.js.map