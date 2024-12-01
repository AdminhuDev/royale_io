export class Logger {
    static info(message, data = {}) {
        console.log(`[INFO] ${message}`, data);
    }

    static warn(message, data = {}) {
        console.warn(`[WARN] ${message}`, data);
    }

    static error(message, error = null) {
        console.error(`[ERROR] ${message}`, error);
    }
} 