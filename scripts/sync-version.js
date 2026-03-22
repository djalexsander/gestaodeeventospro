import fs from "fs";
import path from "path";

const root = process.cwd();

const packageJsonPath = path.join(root, "package.json");
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(root, "src-tauri", "Cargo.toml");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function syncVersion() {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("package.json não encontrado.");
  }

  if (!fs.existsSync(tauriConfPath)) {
    throw new Error("src-tauri/tauri.conf.json não encontrado.");
  }

  if (!fs.existsSync(cargoTomlPath)) {
    throw new Error("src-tauri/Cargo.toml não encontrado.");
  }

  const packageJson = readJson(packageJsonPath);
  const version = packageJson.version;

  if (!version) {
    throw new Error("A versão não foi encontrada no package.json.");
  }

  if (version.startsWith("v")) {
    throw new Error(`A versão no package.json está como "${version}". Use sem "v", por exemplo: "1.0.2".`);
  }

  const tauriConf = readJson(tauriConfPath);
  tauriConf.version = version;
  writeJson(tauriConfPath, tauriConf);

  let cargoToml = readText(cargoTomlPath);
  const versionRegex = /^version\s*=\s*".*"$/m;

  if (!versionRegex.test(cargoToml)) {
    throw new Error('Não foi possível encontrar a linha version = "..." no Cargo.toml');
  }

  cargoToml = cargoToml.replace(versionRegex, `version = "${version}"`);
  writeText(cargoTomlPath, cargoToml);

  console.log(`Versão sincronizada com sucesso: ${version}`);
  console.log(`- package.json -> ${version}`);
  console.log(`- src-tauri/tauri.conf.json -> ${version}`);
  console.log(`- src-tauri/Cargo.toml -> ${version}`);
}

try {
  syncVersion();
} catch (error) {
  console.error("Erro ao sincronizar versão:");
  console.error(error.message);
  process.exit(1);
}