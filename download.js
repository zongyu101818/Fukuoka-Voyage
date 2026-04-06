const fs = require('fs');

async function downloadImage(url, filename) {
    console.log(`Downloading ${filename}...`);
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.pinterest.com/',
        }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(`public/${filename}`, Buffer.from(buffer));
    const size = Math.round(fs.statSync(`public/${filename}`).size / 1024);
    console.log(`✅ Saved ${filename} (${size}KB)`);
}

downloadImage(
    'https://i.pinimg.com/originals/e2/64/50/e264503e4088502818ac2d99cebef268.jpg',
    'zoro-countdown.jpg'
);
