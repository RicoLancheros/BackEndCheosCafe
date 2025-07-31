# Cheo's Cafe Backend API

RESTful API server for Cheo's Cafe e-commerce platform built with Node.js, Express, and TypeScript.

## Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MySQL
- **ORM:** Prisma
- **Authentication:** JWT (Access + Refresh tokens)
- **File Storage:** Cloudinary
- **Validation:** Zod
- **Security:** Rate limiting, CORS, Helmet
- **Development:** tsx, nodemon

## Features

- JWT-based authentication with refresh tokens
- Role-based authorization (ADMIN, CUSTOMER)
- Product catalog management
- Order processing and tracking
- User profile management
- File upload handling
- Review and rating system
- Store location management
- Discount code system
- Comprehensive input validation
- Rate limiting and security headers

## Requirements

- Node.js 20+
- MySQL 8.0+
- npm or yarn

## Installation

```bash
# Clone repository
git clone <repository-url>
cd BackEndCheos

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `.env` file with your configurations:
```env
# Database
DATABASE_URL="mysql://cheos_cafe_app:CheosCafe2024!@localhost:3306/cheos_cafe_db"

# JWT Secrets
JWT_ACCESS_SECRET="tu_super_secreto_access_token_aqui_muy_largo_y_seguro"
JWT_REFRESH_SECRET="tu_super_secreto_refresh_token_aqui_muy_largo_y_seguro"

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"

# Cloudinary
CLOUDINARY_CLOUD_NAME="tu_cloud_name"
CLOUDINARY_API_KEY="tu_api_key"
CLOUDINARY_API_SECRET="tu_api_secret"

# Email Configuration (SendGrid)
SENDGRID_API_KEY="tu_sendgrid_api_key"
FROM_EMAIL="noreply@cheoscafe.com"
```

## Database Setup

```bash
# Run database initialization script
mysql -u root -p < database/init.sql

# Generate Prisma client and sync database
npm run db:generate
npm run db:push

# Seed database with initial data
npm run db:seed
```

## Development

```bash
# Development server
npm run dev

# Production build
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Sync schema with database
- `npm run db:migrate` - Run migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `PUT /change-password` - Change password

### Products (`/api/products`)
- `GET /` - List products with filters
- `GET /:id` - Get product by ID

### Locations (`/api/locations`)
- `GET /` - List locations
- `GET /:id` - Get location by ID

### Orders (`/api/orders`)
- `GET /` - List user orders
- `GET /:id` - Get order details
- `POST /` - Create new order
- `PATCH /:id/cancel` - Cancel order

### Reviews (`/api/reviews`)
- `GET /` - List reviews
- `POST /` - Create review
- `PUT /:id` - Update review
- `DELETE /:id` - Delete review

### File Upload (`/api/upload`)
- `POST /single` - Upload single image
- `POST /multiple` - Upload multiple images

## Authentication

JWT-based authentication with:
- **Access Token**: Short-lived JWT (15 minutes)
- **Refresh Token**: Long-lived token (7 days)

**User Roles:**
- `CUSTOMER` - Regular user
- `ADMIN` - Administrator

**Required Headers:**
```
Authorization: Bearer <access_token>
```

## Security Features

- Rate limiting by IP
- CORS configuration
- Input validation and sanitization
- Password hashing with bcrypt
- Secure token handling
- SQL injection protection

## Database Schema

Main tables:
- `users` - User accounts
- `products` - Product catalog
- `orders` - Order transactions
- `reviews` - Product reviews
- `locations` - Store locations
- `discount_codes` - Promotional codes
- `audit_logs` - Activity tracking