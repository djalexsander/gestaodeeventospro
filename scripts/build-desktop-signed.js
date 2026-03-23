import fs from "fs";
import { spawn } from "child_process";

const root = process.cwd();
const keyPath = process.env.TAURI_SIGNING_PRIVATE_KEY;
const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;

if (!keyPath) {
  console.error("Defina a variável TAURI_SIGNING_PRIVATE_KEY no CMD antes de rodar.");
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Chave privada não encontrada: ${keyPath}`);
  process.exit(1);
}

if (!password) {
  console.error("Defina a variável TAURI_SIGNING_PRIVATE_KEY_PASSWORD no CMD antes de rodar.");
  process.exit(1);
}

const privateKey = fs.readFileSync(keyPath, "utf8");

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tauri", "build"],
  {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: {
      ...process.env,
      TAURI_SIGNING_PRIVATE_KEY: privateKey,
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: password,
    },
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});