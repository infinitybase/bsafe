const { readFileSync, writeFileSync, mkdirSync, rmSync } = require('fs');
const { hexlify } = require('fuels');
const { join } = require('path');
const { promisify } = require('util');
const exec = promisify(require('node:child_process').exec);

const projects = ['predicate'];

function getProjectPaths(rootDir, projects) {
    return projects.map((project) => {
        const binaryPath = join(rootDir, project, '/out/debug/', `${project}.bin`);
        const abiPath = join(rootDir, project, '/out/debug/', `${project}-abi.json`);
        const bytes = readFileSync(binaryPath);
        const abiJSON = readFileSync(abiPath);
        return {
            project,
            abi: abiJSON,
            bin: `"${hexlify(bytes)}"`
        };
    });
}

async function main() {
    try {
        const output = await exec('forc build', {
            cwd: join(__dirname, './src')
        });
        process.stdout.write(output.stdout);
        console.log('Create export file...');
        const rootDir = join(__dirname, `./src/`);
        const distDir = join(__dirname, './dist');
        const mainMJSPath = join(distDir, './index.mjs');
        const mainTSPath = join(distDir, './index.ts');
        const mainJSPath = join(distDir, './index.js');
        const fileContent = getProjectPaths(rootDir, projects);

        console.log('Clean dist folder');
        try {
            rmSync(distDir, { recursive: true });
        } catch {}
        mkdirSync(distDir);

        console.log('Save binary to main');
        const mjsContent = fileContent
            .map((content) => [`export const ${content.project}ABI = ${content.abi};`, `export const ${content.project}BIN = ${content.bin};`])
            .flat()
            .join('\n');
        writeFileSync(mainTSPath, mjsContent);
        writeFileSync(mainMJSPath, mjsContent);
        writeFileSync(
            mainJSPath,
            fileContent
                .map((content) => [`module.exports.${content.project}ABI = ${content.abi};`, `module.exports.${content.project}BIN = ${content.bin};`])
                .flat()
                .join('\n')
        );
        console.log('✅ Done!');
    } catch (err) {
        console.error(err);
    }
}

main();
