import fs from 'fs';
import path from 'path';

function parseEnvLine(line: string): [string, string] | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) return null;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }

    return key ? [key, value] : null;
}

export function loadScriptEnv(): void {
    const projectRoot = path.resolve(__dirname, '..');
    const envFiles = ['.env.local', '.env'];

    for (const fileName of envFiles) {
        const filePath = path.join(projectRoot, fileName);
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        for (const line of content.split(/\r?\n/)) {
            const parsed = parseEnvLine(line);
            if (!parsed) continue;

            const [key, value] = parsed;
            if (process.env[key] === undefined || process.env[key] === '') {
                process.env[key] = value;
            }
        }
    }
}