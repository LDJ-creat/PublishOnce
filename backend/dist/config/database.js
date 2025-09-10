"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/publishonce';
        await mongoose_1.default.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`📦 MongoDB connected: ${mongoUri}`);
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.disconnect();
        console.log('📦 MongoDB disconnected');
    }
    catch (error) {
        console.error('❌ MongoDB disconnection error:', error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
mongoose_1.default.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
});
mongoose_1.default.connection.on('error', (error) => {
    console.error('❌ Mongoose connection error:', error);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected from MongoDB');
});
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    console.log('🛑 Mongoose connection closed through app termination');
    process.exit(0);
});
//# sourceMappingURL=database.js.map