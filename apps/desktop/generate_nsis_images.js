const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generate() {
    try {
        const inputPng = path.resolve(__dirname, 'build-icon-source.png');
        const sidebarPng = path.resolve(__dirname, 'build/installerSidebar.png');
        const headerPng = path.resolve(__dirname, 'build/installerHeader.png');

        console.log('Extracting background color from logo...');
        const { data, info } = await sharp(inputPng).raw().toBuffer({ resolveWithObject: true });

        // Get top-left pixel
        const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 };
        console.log(`Detected background color: rgb(${bg.r}, ${bg.g}, ${bg.b})`);

        // 1. Generate Sidebar (164x314)
        console.log('Generating NSIS Sidebar (164x314)...');

        // Resize the logo to fit nicely in the sidebar (e.g. 120x120)
        const logoSidebar = await sharp(inputPng)
            .resize(130, 130, { fit: 'contain', background: bg })
            .toBuffer();

        await sharp({
            create: {
                width: 164,
                height: 314,
                channels: 4,
                background: bg
            }
        })
            .composite([{ input: logoSidebar, gravity: 'center' }])
            .png()
            .toFile(sidebarPng);

        // 2. Generate Header (150x57)
        console.log('Generating NSIS Header (150x57)...');

        // The header background is usually white in the wizard, we'll place the logo on the right side
        const headerBg = { r: 255, g: 255, b: 255, alpha: 1 };

        const logoHeader = await sharp(inputPng)
            .resize(45, 45, { fit: 'contain', background: headerBg })
            .toBuffer();

        await sharp({
            create: {
                width: 150,
                height: 57,
                channels: 4,
                background: headerBg
            }
        })
            .composite([{ input: logoHeader, gravity: 'east' }])
            .png()
            .toFile(headerPng);

        console.log('Successfully generated NSIS Sidebar and Header images!');
    } catch (err) {
        console.error('Failed to generate images:', err);
        process.exit(1);
    }
}

generate();
