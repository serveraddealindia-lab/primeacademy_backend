"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = void 0;
const getHealth = async (_req, res) => {
    try {
        res.status(200).json({ status: 'ok' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
};
exports.getHealth = getHealth;
//# sourceMappingURL=health.controller.js.map