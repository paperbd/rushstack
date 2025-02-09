const fsx = require('fs-extra');
const child_process = require('child_process');
const path = require('path');
const process = require('process');

function executeCommand(command) {
  console.log('---> ' + command);
  child_process.execSync(command, { stdio: 'inherit' });
}

// Clean the old build outputs
console.log(`==> Starting build.js for ${path.basename(process.cwd())}`);
fsx.emptyDirSync('dist');
fsx.emptyDirSync('lib');
fsx.emptyDirSync('temp');

// Run the TypeScript compiler
executeCommand('node node_modules/typescript/lib/tsc');

// Run the API Extractor command-line
if (process.argv.indexOf('--production') >= 0) {
  executeCommand('node node_modules/@microsoft/api-extractor/lib/start run');
} else {
  executeCommand('node node_modules/@microsoft/api-extractor/lib/start run --local');
}

// Run the API Documenter command-line
executeCommand('node node_modules/@microsoft/api-documenter/lib/start '
  + 'generate --input-folder etc --output-folder etc/yaml-experimental');
executeCommand('node node_modules/@microsoft/api-documenter/lib/start '
  + 'yaml --input-folder etc --output-folder etc/yaml');

console.log(`==> Finished build.js for ${path.basename(process.cwd())}`);
