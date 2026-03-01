const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputSvg = path.resolve(__dirname, '../frontend/public/cognode.svg');
const outputPng = path.resolve(__dirname, 'build/icon.png');

console.log('Converting', inputSvg, 'to', outputPng);

sharp(inputSvg)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPng)
    .then(() => {
        console.log('Successfully generated build/icon.png. Electron-builder will convert this to .ico automatically.');
    })
    .catch(err => {
        console.error('Failed to convert icon:', err);
        process.exit(1);
    });
