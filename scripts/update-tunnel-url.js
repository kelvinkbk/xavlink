#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Starts Cloudflare tunnel and extracts the public URL,
 * then updates mobile/.env with it.
 */

const tunnelExe = "C:\\Progra~2\\cloudflared\\cloudflared.exe";
const envFile = path.join(__dirname, "..", "mobile", ".env");

console.log("[TUNNEL] Starting Cloudflare tunnel...");

const tunnel = spawn(tunnelExe, ["tunnel", "--url", "http://localhost:5000"]);

let urlFound = false;
let urlValue = "";

tunnel.stdout.on("data", (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Extract the tunnel URL from output
  if (!urlFound) {
    const match = output.match(/https:\/\/[\w\-]+\.trycloudflare\.com/);
    if (match) {
      urlFound = true;
      urlValue = match[0];
      console.log(`\n[TUNNEL] Detected URL: ${urlValue}`);
      updateEnv(urlValue);
    }
  }
});

tunnel.stderr.on("data", (data) => {
  process.stderr.write(data);
});

tunnel.on("close", (code) => {
  console.log(`[TUNNEL] Process exited with code ${code}`);
});

function updateEnv(url) {
  const apiUrl = `${url}/api`;
  const envContent = `EXPO_PUBLIC_API_URL=${apiUrl}\n`;

  try {
    fs.writeFileSync(envFile, envContent, "utf8");
    console.log(`[ENV] Updated ${envFile} with ${apiUrl}`);
    console.log("[ENV] Restart Expo to pick up the new URL");
  } catch (err) {
    console.error(`[ENV] Error writing env file: ${err.message}`);
  }
}
