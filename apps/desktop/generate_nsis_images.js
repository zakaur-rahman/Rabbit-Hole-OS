const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// BMP writer for 24-bit uncompressed BMPs (what NSIS requires)
function createBmp(width, height, rgbBuffer) {
    const rowSize = Math.ceil((width * 3) / 4) * 4; // BMP rows are 4-byte aligned
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (info header) + pixel data

    const bmp = Buffer.alloc(fileSize);

    // File header (14 bytes)
    bmp.write('BM', 0);                         // Signature
    bmp.writeUInt32LE(fileSize, 2);              // File size
    bmp.writeUInt32LE(0, 6);                     // Reserved
    bmp.writeUInt32LE(54, 10);                   // Pixel data offset

    // Info header (40 bytes - BITMAPINFOHEADER)
    bmp.writeUInt32LE(40, 14);                   // Header size
    bmp.writeInt32LE(width, 18);                 // Width
    bmp.writeInt32LE(height, 22);                // Height (positive = bottom-up)
    bmp.writeUInt16LE(1, 26);                    // Color planes
    bmp.writeUInt16LE(24, 28);                   // Bits per pixel
    bmp.writeUInt32LE(0, 30);                    // Compression (BI_RGB = none)
    bmp.writeUInt32LE(pixelDataSize, 34);        // Image size
    bmp.writeInt32LE(2835, 38);                  // X pixels per meter (72 DPI)
    bmp.writeInt32LE(2835, 42);                  // Y pixels per meter (72 DPI)
    bmp.writeUInt32LE(0, 46);                    // Colors used
    bmp.writeUInt32LE(0, 50);                    // Important colors

    // Pixel data (bottom-up, BGR)
    for (let y = 0; y < height; y++) {
        const srcRow = (height - 1 - y) * width * 3; // Flip vertically
        const dstRow = 54 + y * rowSize;
        for (let x = 0; x < width; x++) {
            const srcIdx = srcRow + x * 3;
            const dstIdx = dstRow + x * 3;
            bmp[dstIdx] = rgbBuffer[srcIdx + 2];     // B
            bmp[dstIdx + 1] = rgbBuffer[srcIdx + 1]; // G
            bmp[dstIdx + 2] = rgbBuffer[srcIdx];     // R
        }
    }

    return bmp;
}

async function generateBmp(inputPath, width, height, options = {}) {
    let pipeline = sharp(inputPath);

    if (options.resize) {
        pipeline = pipeline.resize(width, height, options.resize);
    }

    pipeline = pipeline.removeAlpha().raw();
    const { data } = await pipeline.toBuffer({ resolveWithObject: true });
    return createBmp(width, height, data);
}

async function generate() {
    try {
        const sidebarSource = path.resolve(__dirname, 'assets/installer-sidebar-source.png');
        const headerSource = path.resolve(__dirname, 'assets/installer-header-source.png');
        const iconSource = path.resolve(__dirname, 'build-icon-source.png');

        const sidebarBmp = path.resolve(__dirname, 'build/installerSidebar.bmp');
        const uninstallerSidebarBmp = path.resolve(__dirname, 'build/uninstallerSidebar.bmp');
        const headerBmp = path.resolve(__dirname, 'build/installerHeader.bmp');

        const sidebarInput = fs.existsSync(sidebarSource) ? sidebarSource : iconSource;
        const headerInput = fs.existsSync(headerSource) ? headerSource : iconSource;

        // 1. Sidebar (164x314) — MUI_WELCOMEFINISHPAGE_BITMAP
        console.log('Generating NSIS Sidebar (164x314 BMP)...');
        console.log(`  Source: ${path.basename(sidebarInput)}`);

        const sidebarBmpData = await generateBmp(sidebarInput, 164, 314, {
            resize: { fit: 'cover', position: 'center' }
        });
        fs.writeFileSync(sidebarBmp, sidebarBmpData);
        fs.copyFileSync(sidebarBmp, uninstallerSidebarBmp);
        console.log('  ✓ Sidebar BMP generated');

        // 2. Header (150x57) — MUI_HEADERIMAGE_BITMAP
        console.log('Generating NSIS Header (150x57 BMP)...');
        console.log(`  Source: ${path.basename(headerInput)}`);

        // Composite: small logo on white background, right-aligned
        const headerBg = { r: 255, g: 255, b: 255 };
        const logoHeader = await sharp(headerInput)
            .resize(45, 45, { fit: 'contain', background: { ...headerBg, alpha: 1 } })
            .removeAlpha()
            .toBuffer();

        const headerRaw = await sharp({
            create: { width: 150, height: 57, channels: 3, background: headerBg }
        })
            .composite([{ input: logoHeader, gravity: 'east' }])
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const headerBmpData = createBmp(150, 57, headerRaw.data);
        fs.writeFileSync(headerBmp, headerBmpData);
        console.log('  ✓ Header BMP generated');

        console.log('\n✅ All NSIS installer BMPs generated successfully!');
    } catch (err) {
        console.error('Failed to generate images:', err);
        process.exit(1);
    }
}

generate();
