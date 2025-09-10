"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allModels = exports.initializeModels = exports.StatsModel = exports.Stats = exports.PlatformModel = exports.Platform = exports.ArticleModel = exports.Article = exports.UserModel = exports.User = void 0;
var User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
Object.defineProperty(exports, "UserModel", { enumerable: true, get: function () { return __importDefault(User_1).default; } });
var Article_1 = require("./Article");
Object.defineProperty(exports, "Article", { enumerable: true, get: function () { return Article_1.Article; } });
Object.defineProperty(exports, "ArticleModel", { enumerable: true, get: function () { return __importDefault(Article_1).default; } });
var Platform_1 = require("./Platform");
Object.defineProperty(exports, "Platform", { enumerable: true, get: function () { return Platform_1.Platform; } });
Object.defineProperty(exports, "PlatformModel", { enumerable: true, get: function () { return __importDefault(Platform_1).default; } });
var Stats_1 = require("./Stats");
Object.defineProperty(exports, "Stats", { enumerable: true, get: function () { return Stats_1.Stats; } });
Object.defineProperty(exports, "StatsModel", { enumerable: true, get: function () { return __importDefault(Stats_1).default; } });
const initializeModels = async () => {
    try {
        console.log('Models initialized successfully');
    }
    catch (error) {
        console.error('Error initializing models:', error);
        throw error;
    }
};
exports.initializeModels = initializeModels;
exports.allModels = {
    User,
    Article,
    Platform,
    Stats
};
//# sourceMappingURL=index.js.map