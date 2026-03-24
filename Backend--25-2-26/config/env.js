import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  // Absolute path so it works regardless of process.cwd().
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});
