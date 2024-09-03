// Generate ISO 8601 timestamp
export default function generateTimestamp(): string {
    return new Date().toISOString();
}
