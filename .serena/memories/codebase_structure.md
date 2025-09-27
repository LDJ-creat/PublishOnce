# PublishOnce Codebase Structure

## Backend Architecture

### Core Application (`src/app.ts`)
- Express.js application setup
- Middleware configuration (CORS, Helmet, Morgan)
- Route mounting and error handling
- Health check endpoint at `/health`

### Controllers (`src/controllers/`)
- `articleController.ts` - Article CRUD operations
- `userController.ts` - User management
- `platformController.ts` - Platform management
- `credentialController.ts` - Platform credentials management

### Services (`src/services/`)
- **Publishers** (`publishers/`) - Platform-specific publishing logic
  - `base.ts` - Base publisher interface
  - `csdn.ts`, `juejin.ts`, `huawei.ts`, `wechat.ts` - Platform implementations
- **Scrapers** (`scrapers/`) - Data scraping from platforms
  - Similar structure to publishers
- **Queue** (`queue/`) - Bull queue processors
  - `publishProcessor.ts` - Handle publishing tasks
  - `scrapeProcessor.ts` - Handle scraping tasks
  - `notificationProcessor.ts` - Handle notifications
- **Scheduler** (`scheduler/`) - Cron job management

### Models (`src/models/`)
- `User.ts` - User schema and model
- `Article.ts` - Article schema and model
- `Platform.ts` - Platform configuration model
- `PlatformCredential.ts` - User platform credentials
- `Stats.ts` - Article statistics model

### Routes (`src/routes/`)
- `auth.ts` - Authentication routes
- `articles.ts` - Article management routes
- `platforms.ts` - Platform routes
- `credentials.ts` - Credential management routes

### Configuration (`src/config/`)
- `database.ts` - MongoDB connection configuration

### Middleware (`src/middleware/`)
- `auth.ts` - JWT authentication middleware
- `errorHandler.ts` - Global error handling
- `notFoundHandler.ts` - 404 error handling

### Testing Structure (`tests/`)
- `unit/` - Unit tests (70% of test suite)
- `integration/` - Integration tests (20% of test suite)
- `e2e/` - End-to-end tests (10% of test suite)
- `fixtures/` - Test data and fixtures
- `utils/` - Testing utilities and helpers

## Key Dependencies
- **Express** - Web framework
- **Mongoose** - MongoDB ODM
- **Bull** - Redis-based queue system
- **Playwright** - Browser automation
- **JWT** - Authentication tokens
- **Jest** - Testing framework