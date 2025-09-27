# PublishOnce Task Completion Guidelines

## When a Task is Completed

### 1. Code Quality Checks
- **TypeScript Compilation**: Ensure code compiles without errors
  ```bash
  npm run build
  ```
- **Type Checking**: Verify all TypeScript types are properly defined
- **Import/Export**: Check all imports and exports are correct

### 2. Testing Requirements
- **Unit Tests**: Write or update unit tests for new functionality
- **Integration Tests**: Add integration tests for API endpoints
- **Test Coverage**: Maintain minimum 80% test coverage
  ```bash
  npm run test:coverage
  ```

### 3. Code Standards
- **Consistent Naming**: Follow camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Implement proper error handling with try-catch blocks
- **Documentation**: Add JSDoc comments for complex functions
- **Environment Variables**: Update .env.example if new config is added

### 4. Database Considerations
- **Schema Updates**: Update Mongoose models if database structure changes
- **Migration Scripts**: Create migration scripts for schema changes
- **Data Validation**: Ensure proper validation in models

### 5. API Standards
- **RESTful Design**: Follow REST conventions for new endpoints
- **Response Format**: Maintain consistent JSON response structure
- **Authentication**: Implement proper JWT authentication where needed
- **Rate Limiting**: Consider rate limiting for public endpoints

### 6. Performance Considerations
- **Database Queries**: Optimize MongoDB queries with proper indexing
- **Caching**: Implement Redis caching for frequently accessed data
- **Queue Processing**: Use Bull queues for long-running tasks

### 7. Security Checklist
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries (Mongoose handles this)
- **XSS Protection**: Sanitize user content
- **Authentication**: Verify JWT tokens properly
- **Environment Secrets**: Never commit secrets to version control

### 8. Final Verification
- **Health Check**: Verify `/health` endpoint responds correctly
- **API Testing**: Test all modified endpoints manually or with Postman
- **Error Scenarios**: Test error handling and edge cases
- **Documentation**: Update API documentation if endpoints changed