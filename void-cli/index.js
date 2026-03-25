#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const CONNECTIONS_PATH = path.join(os.homedir(), '.void', 'connections.json');

function loadConnections() {
  try {
    return JSON.parse(fs.readFileSync(CONNECTIONS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function listConnections() {
  const connections = loadConnections();
  if (connections.length === 0) {
    console.log('No saved connections. Add connections in Void Terminal first.');
    return;
  }
  console.log('\n  Void Terminal — Saved Connections\n');
  const groups = new Map();
  connections.forEach(c => {
    const group = c.group || 'Ungrouped';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(c);
  });
  for (const [group, conns] of groups) {
    console.log(`  ${group}`);
    conns.forEach(c => {
      console.log(`    ${c.alias.padEnd(20)} ${c.username}@${c.host}:${c.port}  [${c.authMethod}]`);
    });
    console.log('');
  }
}

function connectTo(alias) {
  const connections = loadConnections();
  const conn = connections.find(c => c.alias === alias || c.host === alias);
  if (!conn) {
    console.error(`Connection "${alias}" not found. Use "void list" to see saved connections.`);
    process.exit(1);
  }

  const args = [];
  if (conn.authMethod === 'key' && conn.privateKeyPath) {
    const keyPath = conn.privateKeyPath.replace('~', os.homedir());
    args.push('-i', keyPath);
  }
  args.push('-p', String(conn.port || 22));
  args.push(`${conn.username}@${conn.host}`);

  console.log(`Connecting to ${conn.alias} (${conn.username}@${conn.host}:${conn.port})...`);
  const ssh = spawn('ssh', args, { stdio: 'inherit' });
  ssh.on('exit', (code) => process.exit(code || 0));
}

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
  Void Terminal CLI v0.1.0

  Usage:
    void list              List saved connections
    void connect <alias>   SSH into a saved connection
    void <alias>           Shorthand for connect

  Examples:
    void list
    void connect prod-api
    void prod-api
  `);
} else if (command === 'list' || command === 'ls') {
  listConnections();
} else if (command === 'connect') {
  if (!args[1]) { console.error('Usage: void connect <alias>'); process.exit(1); }
  connectTo(args[1]);
} else {
  // Treat as alias shorthand: void prod-api
  connectTo(command);
}
