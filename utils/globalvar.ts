// utils/globalVar.ts

export class GlobalVar {
    private static sessionId: string = '';
    private static userId: string = '';
    private static sessionSecret: string = '';

    // Getter dan Setter 
    static getSessionId(): string {
        return this.sessionId;
    }

    static setSessionId(newSessionId: string): void {
        this.sessionId = newSessionId;
    }


    static getUserId(): string {
        return this.userId;
    }

    static setUserId(newUserId: string): void {
        this.userId = newUserId;
    }


    static getSessionSecret(): string {
        return this.sessionSecret;
    }

    static setSessionSecret(newSessionSecret: string): void {
        this.sessionSecret = newSessionSecret;
    }
}
