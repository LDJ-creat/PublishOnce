"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`,
            method: req.method,
            path: req.originalUrl
        },
        timestamp: new Date().toISOString()
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=notFoundHandler.js.map