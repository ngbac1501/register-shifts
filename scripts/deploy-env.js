const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('.env.production', 'utf8');
const lines = content.split('\n');

console.log('Starting environment variable upload to Vercel Production...');

lines.forEach(line => {
    // Basic parse
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;

    const key = line.substring(0, idx).trim();
    let value = line.substring(idx + 1).trim();

    // Handle double quotes
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
        // Unescape literal \n strings to actual newlines for the private key
        value = value.replace(/\\n/g, '\n');
    }

    if (!key) return;

    console.log(`Setting ${key}...`);
    try {
        fs.writeFileSync('.temp_env_val', value);
        // Using force to overwrite if exists
        // production
        execSync(`npx vercel env add ${key} production < .temp_env_val`, { stdio: 'pipe' });
        // preview (optional, but good for testing)
        // execSync(`npx vercel env add ${key} preview < .temp_env_val`, { stdio: 'pipe' });
    } catch (e) {
        // Ignore error if it already exists/fails (or maybe try rm first?)
        // If it fails because it exists, we might need 'vercel env rm' or just 'add' should fail?
        // Actually 'add' fails if exists. We should use 'rm' then 'add'? 
        // Or check return code.
        // There is 'vercel env add --force'? Help said: "Override ... --force".
        // Let's try --force.
        try {
            execSync(`npx vercel env add ${key} production --force < .temp_env_val`, { stdio: 'pipe' });
            console.log(`Set ${key} (forced).`);
        } catch (e2) {
            console.error(`Failed to set ${key}:`, e2.message);
        }
    }
});

if (fs.existsSync('.temp_env_val')) {
    fs.unlinkSync('.temp_env_val');
}
console.log('Done uploading env vars.');
