export default function generateRandomString(length: number): string {
    console.log("execute method: generateRandomString");
    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    console.log("result:", result);
    return result;
}