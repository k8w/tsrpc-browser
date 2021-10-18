const fs = require('fs');
const path = require('path');

// Read index.d.ts
let content = fs.readFileSync(path.resolve(__dirname, '../dist/index.d.ts'), 'utf-8');

// removePrivate
content = content.replace(/\s+(private).+;/g, '');
content = require('./copyright') + '\n' + content + `\n/// <reference path="./mongodb.d.ts" />\n`;

// Copy mongodb.d.ts
fs.copyFileSync(path.resolve(__dirname, '../src/mongodb.d.ts'), path.resolve(__dirname, '../dist/mongodb.d.ts'));

// Update index.d.ts
fs.writeFileSync(path.resolve(__dirname, '../dist/index.d.ts'), content, 'utf-8');
