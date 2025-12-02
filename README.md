# Prime Academy CRM System

A comprehensive Customer Relationship Management system for Prime Academy, built with Node.js, Express, React, and TypeScript.

## Features

- **Student Management**: Complete student enrollment, profile management, and tracking
- **Faculty Management**: Faculty profiles, assignments, and scheduling
- **Employee Management**: Employee profiles, attendance, and leave management
- **Batch Management**: Course batches with scheduling and capacity management
- **Payment Management**: Payment tracking, receipts, and EMI management
- **Attendance Tracking**: Student and employee attendance with biometric integration
- **Certificate Generation**: Automated certificate generation with student declarations
- **Portfolio Management**: Student portfolio tracking and approval
- **Student Orientation**: Multi-language orientation system (English/Gujarati)
- **Reports & Analytics**: Comprehensive reporting system
- **Photo Management**: Centralized photo upload and management

## Tech Stack

### Backend
- Node.js + Express.js
- TypeScript
- Sequelize ORM
- MySQL/MariaDB
- JWT Authentication
- PDF Generation (pdfmake)
- File Upload (Multer)

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- Tailwind CSS
- React Router

## Project Structure

```
primeacademy/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── migrations/     # Database migrations
│   │   └── utils/          # Utility functions
│   ├── uploads/            # Uploaded files
│   ├── orientations/       # Orientation PDFs
│   ├── receipts/           # Generated receipts
│   └── certificates/       # Generated certificates
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── components/     # Reusable components
│   │   ├── api/            # API client functions
│   │   ├── context/        # React contexts
│   │   └── utils/          # Utility functions
│   └── dist/               # Build output
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MySQL/MariaDB 8.0+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/primeacademy-crm.git
   cd primeacademy-crm
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Build TypeScript
   npm run build
   
   # Run migrations
   npm run migrate
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env file
   echo "VITE_API_BASE_URL=http://localhost:3000" > .env
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000
```

## Deployment

See [GITHUB_DEPLOYMENT_GUIDE.md](./GITHUB_DEPLOYMENT_GUIDE.md) for detailed deployment instructions to VPS.

Quick deployment:
1. Push code to GitHub
2. Clone on VPS
3. Follow deployment guide

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/attendance-reports/all-students` - Get all students
- `POST /api/students/enroll` - Complete student enrollment
- `GET /api/students/all-software` - Get all software list

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment
- `GET /api/payments/:id/receipt` - Download receipt

### Orientation
- `GET /api/orientation/:studentId` - Get orientation status
- `POST /api/orientation/:studentId/accept` - Accept orientation

## Database Schema

Key tables:
- `users` - User accounts
- `student_profiles` - Student information
- `faculty_profiles` - Faculty information
- `batches` - Course batches
- `enrollments` - Student enrollments
- `payment_transactions` - Payment records
- `student_orientations` - Orientation acceptance
- `certificates` - Generated certificates

## Contributing

1. Create a feature branch
2. Make your changes
3. Commit with descriptive messages
4. Push to GitHub
5. Create a Pull Request

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** 2024
