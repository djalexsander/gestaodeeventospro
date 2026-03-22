#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
const version = pkg.version;

// Sync tauri.conf.json
const tauriPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf-8'));
tauri.version = version;
fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');

// Sync Cargo.toml
const cargoPath = path.resolve(__dirname, '../src-tauri/Cargo.toml');
let cargo = fs.readFileSync(cargoPath, 'utf-8');
cargo = cargo.replace(/^version\s*=\s*".*"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo);

console.log(`✅ Versão sincronizada: ${version}`);
