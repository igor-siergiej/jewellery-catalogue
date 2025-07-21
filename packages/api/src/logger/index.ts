import { ILogger } from '../lib/dependencyContainer/types';

export class Logger implements ILogger {
    private formatMessage(level: string, message: string, meta: Array<unknown>): string {
        const logObject = {
            level,
            message,
            ...(meta.length > 0 && { meta })
        };

        return JSON.stringify(logObject);
    }

    public info = (message: string, ...meta: Array<unknown>): void => {
        console.log(this.formatMessage('[INFO]', message, meta));
    };

    public warn = (message: string, ...meta: Array<unknown>): void => {
        console.warn(this.formatMessage('[WARN]', message, meta));
    };

    public error = (message: string, ...meta: Array<unknown>): void => {
        console.error(this.formatMessage('[ERROR]', message, meta));
    };

    public logHttpRequest = (method: string, url: string, status: number, responseTime: number): void => {
        const message = `${method} ${url} ${status} ${responseTime}ms`;
        console.log(this.formatMessage('[INFO]', message, []));
    };
}
