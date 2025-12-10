import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync('public/icon.svg');

async function generateIcons() {
    console.log('Generating icons...');
    
    await sharp(svgBuffer)
        .resize(192, 192)
        .png()
        .toFile('public/icon-192.png');
        
    await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile('public/icon-512.png');

    console.log('Icons generated successfully.');
}

generateIcons().catch(console.error);