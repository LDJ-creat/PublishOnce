# PublishOnce Development Commands

## Environment Setup
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Initialize platform data
npm run init-platforms
```

## Development Commands
```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Build with watch mode
npm run build:watch

# Start production server
npm start
```

## Testing Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run performance tests
npm run test:performance

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Database Commands
```bash
# Initialize platforms data
npm run init-platforms
```

## Utility Commands (Windows)
```bash
# List files and directories
dir
ls (if using PowerShell with Unix aliases)

# Change directory
cd <directory>

# Find files
findstr /s /i "pattern" *.ts

# Git operations
git status
git add .
git commit -m "message"
git push

# Process management
tasklist | findstr node
taskkill /f /pid <pid>
```

## Service Dependencies
- **MongoDB**: Required for data storage
- **Redis**: Required for task queues and caching
- **Node.js**: Version >= 16.0.0

## Port Configuration
- **Backend API**: Port 3000 (configurable via PORT env var)
- **MongoDB**: Port 27017
- **Redis**: Port 6379