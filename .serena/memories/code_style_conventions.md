# PublishOnce Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled with all strict checks
- **Path mapping**: `@/*` maps to `src/*`
- **Decorators**: Experimental decorators enabled

## Code Style Guidelines
- **Language**: Mixed Chinese and English (Chinese for user-facing content, English for technical terms)
- **File naming**: camelCase for TypeScript files
- **Import style**: ES6 imports with explicit file extensions where needed
- **Type safety**: Strict TypeScript with explicit typing

## Project Structure Conventions
- `src/` - Source code
  - `controllers/` - Route handlers and business logic
  - `services/` - Business services (publishers, scrapers, queue)
  - `models/` - Database models (Mongoose schemas)
  - `routes/` - Express route definitions
  - `middleware/` - Express middleware
  - `config/` - Configuration files
  - `utils/` - Utility functions
  - `types/` - TypeScript type definitions
  - `scripts/` - Utility scripts

## Database Conventions
- **MongoDB** with Mongoose ODM
- Model files use PascalCase (e.g., `Article.ts`, `User.ts`)
- Schema definitions with TypeScript interfaces

## API Conventions
- RESTful API design
- Route prefixes: `/api/auth`, `/api/articles`, `/api/platforms`, `/api/credentials`
- JSON responses with consistent error handling
- JWT-based authentication

## Error Handling
- Centralized error handling middleware
- Custom error classes
- Proper HTTP status codes
- Structured error responses