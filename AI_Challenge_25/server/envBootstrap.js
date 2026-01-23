// envBootstrap.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Абсолютный путь к file.env рядом с envBootstrap.js
const envPath = path.join(__dirname, "file.env");

dotenv.config({ path: envPath });

console.log("[ENV BOOT] using env file =", envPath);
console.log("[ENV BOOT] OLLAMA_MODEL =", process.env.OLLAMA_MODEL);
console.log("[ENV BOOT] OLLAMA_URL  =", process.env.OLLAMA_URL);
