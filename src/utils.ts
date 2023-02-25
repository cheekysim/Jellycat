import crypto from "crypto";
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config();

export default {
    title: title,
    logger: logger(),
    encrypt: encrypt,
    decrypt: decrypt,
    updateDotEnv: updateDotEnv,
}

function encrypt(text: string) {
    let key = crypto.randomBytes(32);
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), key: key.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(text: { iv: string, key: string, encryptedData: string }) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(text.key, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function title(str: string): string {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function updateDotEnv(key: string, value: string) {
    let original = fs.readFileSync(".env", "utf8").split("\n");
    let updated = original.map((line) => {
        if (line.startsWith(key)) {
            return `${key}=${value}`;
        } else {
            return line;
        }
    });
    fs.writeFileSync(".env", updated.join("\n"), { encoding: "utf8" });
}

function logger(): boolean {
    if (process.env.LOG == "true") {
        return true;
    } else {
        return false;
    }
}