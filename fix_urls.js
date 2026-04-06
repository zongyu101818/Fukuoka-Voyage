const fs = require('fs');
let h = fs.readFileSync('public/index.html', 'utf8');

// Restore local paths from CDN URLs
h = h.replaceAll(
    'src="https://i.pinimg.com/736x/a8/56/0f/a8560fb2df083c65d66e90d94e533a27.jpg"',
    'src="zoro-avatar.jpg"'
);
h = h.replaceAll(
    'src="https://i.pinimg.com/736x/e2/64/50/e264503e4088502818ac2d99cebef268.jpg"',
    'src="zoro-countdown.jpg"'
);
h = h.replaceAll(
    'src="https://i.pinimg.com/originals/84/6c/d6/846cd688de4a2f49a9d58fc207188522.jpg"',
    'src="zoro-header.jpg"'
);
// Restore video src
h = h.replace(
    'src="zoro-gif.mp4" style="display:none" oncanplay="this.style.display=\'\'"',
    'src="zoro-gif.mp4"'
);

fs.writeFileSync('public/index.html', h);
console.log('Restored local paths');
// Verify
const remaining = (h.match(/pinimg\.com/g) || []).length;
console.log('CDN refs remaining:', remaining);
const local = (h.match(/src="zoro-/g) || []).length;
console.log('Local refs:', local);
