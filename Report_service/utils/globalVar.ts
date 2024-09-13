// utils/globalVar.ts
export class GlobalVar {
    private reference_id: string;

    constructor() {
        this.reference_id = "";
    }

    public getReferenceId(): string {
        return this.reference_id;
    }

    public setReferenceId(referenceId: string): void {
        this.reference_id = referenceId;
    }
}

// Export a single instance of GlobalVar
export const globalVar = new GlobalVar();
