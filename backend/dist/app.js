"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const scheduler_1 = __importDefault(require("./services/scheduler"));
const auth_1 = __importDefault(require("./routes/auth"));
const articles_1 = __importDefault(require("./routes/articles"));
const platforms_1 = __importDefault(require("./routes/platforms"));
const credentials_1 = __importDefault(require("./routes/credentials"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'PublishOnce Backend Service is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/articles', articles_1.default);
app.use('/api/platforms', platforms_1.default);
app.use('/api/credentials', credentials_1.default);
app.use('/api/v1', (req, res) => {
    res.json({ message: 'API routes will be implemented here' });
});
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const startServer = async () => {
    try {
        try {
            await (0, database_1.connectDatabase)();
            console.log('✅ Database connected successfully');
        }
        catch (dbError) {
            console.warn('⚠️ Database connection failed, running without database:', dbError.message);
            console.warn('💡 To enable database features, please install and start MongoDB');
        }
        await scheduler_1.default.initialize();
        console.log('✅ Task scheduler initialized');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔗 API endpoint: http://localhost:${PORT}/api/v1`);
            console.log('\n🎉 PublishOnce Backend is ready!');
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await scheduler_1.default.shutdown();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    await scheduler_1.default.shutdown();
    process.exit(0);
});
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map