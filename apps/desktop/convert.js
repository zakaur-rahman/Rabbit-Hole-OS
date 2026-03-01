const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const path = require('path');
const fs = require('fs');

const inputPng = path.resolve(__dirname, 'build-icon-source.png');
const tempPng = path.resolve(__dirname, 'build/temp-icon.png');
const outputIco = path.resolve(__dirname, 'build/icon.ico');

console.log('Converting source PNG to ICO format...');

async function generate() {
    try {
        const roundedCorners = Buffer.from(
            '<svg><rect x="0" y="0" width="256" height="256" rx="48" ry="48"/></svg>'
        );

        // Generate 256x256 PNG for the ICO
        await sharp(inputPng)
            .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .composite([{
                input: roundedCorners,
                blend: 'dest-in'
            }])
            .png()
            .toFile(tempPng);

        console.log('Converting temporary PNG to ICO...');

        const convertFunc = typeof pngToIco === 'function' ? pngToIco : pngToIco.default;

        const buf = await convertFunc(tempPng);
        fs.writeFileSync(outputIco, buf);
        fs.unlinkSync(tempPng);

        console.log('Successfully generated build/icon.ico from custom image!');
    } catch (err) {
        console.error('Failure:', err);
        process.exit(1);
    }
}

generate();
