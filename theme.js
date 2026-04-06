const fs = require('fs');
const idx = 'public/index.html';
const app = 'public/app.js';

let ih = fs.readFileSync(idx, 'utf-8');
let aj = fs.readFileSync(app, 'utf-8');

// Font and Palette
ih = ih.replace(/'"Noto Sans TC"', 'sans-serif'/g, `'"Noto Serif TC"', 'serif'`);
ih = ih.replace(/family=Noto\+Sans\+TC/g, 'family=Noto+Serif+TC');
ih = ih.replace(/colors: \{[\s\S]*?\},/m, `colors: { primary: '#7e22ce', secondary: '#10b981', ocean: '#1e3a8a', dark: { 100: '#2a1b42', 200: '#130f25', 300: '#090614', 400: '#05020a' }, gold: '#fbbf24' },`);
ih = ih.replace(/boxShadow: \{[\s\S]*?\}/m, `boxShadow: { 'wanted': '0 10px 40px -10px rgba(126, 34, 206, 0.4)', 'wanted-sm': '0 4px 20px -5px rgba(16, 185, 129, 0.3)', 'nav': '0 -15px 40px rgba(0, 0, 0, 0.9)' }`);

// Replacing structural classes for Low Key Luxury
const classReplacements = [
    [/bg-parchment-100/g, 'bg-dark-300'],
    [/bg-parchment-200/g, 'bg-dark-200/80 backdrop-blur-xl'],
    [/bg-wood-800/g, 'bg-dark-100/90 backdrop-blur-md'],
    [/bg-wood-900/g, 'bg-black'],
    [/text-wood-900/g, 'text-gray-100'],
    [/text-wood-800/g, 'text-gray-200'],
    [/text-wood-700/g, 'text-gray-300'],
    [/text-wood-600/g, 'text-gray-400'],
    [/text-wood-500/g, 'text-gray-500'],
    [/border-wood-800/g, 'border-white/10'],
    [/border-wood-900/g, 'border-white/10'],
    [/border-wood-500/g, 'border-white/5'],
    [/border-wood-700/g, 'border-white/10'],
    [/border-4/g, 'border border-primary/20'],
    [/border-2/g, 'border border-primary/20'],
    [/border-l-4/g, 'border-l-2'],
    [/border-b-4/g, 'border-b'],
    [/border-t-4/g, 'border-t border-primary/40'],
    [/shadow-\[8px_8px_0_rgba.*?\]/g, 'shadow-2xl'],
    [/shadow-\[2px_2px_0_rgba.*?\]/g, 'shadow-lg'],
    [/text-wood-300/g, 'text-primary/50'],
    [/bg-\[\#e4cb98\]/g, 'bg-gradient-to-br from-dark-100 to-dark-300'],
    [/bg-white\/[0-9]+/g, 'bg-dark-200/40 backdrop-blur-md'],
    [/bg-white/g, 'bg-dark-200/70 backdrop-blur-xl'],
    [/bg-gray-800/g, 'bg-dark-400'],
    [/bg-\[\#dc2626\]/g, 'bg-primary'],
    [/text-parchment-100/g, 'text-gray-200'],
    [/text-parchment-200/g, 'text-gray-400'],
    [/bg-\[url\('.*?cream-paper.*?'\)\]/g, "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-dark-400"],
    [/bg-\[url\('.*?wood-pattern.*?'\)\]/g, 'bg-gradient-to-br from-dark-100/50 to-dark-300/50'],
    [/bg-\[url\('.*?aged-paper.*?'\)\]/g, 'bg-none'],
    [/font-black/g, 'font-bold tracking-wider'],
    [/rounded-3xl/g, 'rounded-2xl'],
    [/rounded-\[2rem\]/g, 'rounded-2xl']
];

classReplacements.forEach(([regex, repl]) => {
    ih = ih.replace(regex, repl);
    aj = aj.replace(regex, repl);
});

// Remove old selection coloring style
ih = ih.replace(/selection:bg-secondary selection:text-wood-900/, 'selection:bg-primary selection:text-white');

// Ambient UX Glow
ih = ih.replace(/<div id="app-container" class="(.*?)">/, `<div id="app-container" class="$1">
        <!-- 背景星塵與極光效果 -->
        <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-50">
            <div class="absolute w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -top-20 -left-20 animate-[pulse_6s_infinite]"></div>
            <div class="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] bottom-40 -right-20 animate-[pulse_8s_infinite]"></div>
        </div>`);

// Change Zoro icon shadow for more neon green Wano style
ih = ih.replace(/shadow-wanted-sm overflow-hidden p-0/g, 'shadow-[0_0_20px_rgba(16,185,129,0.5)] overflow-hidden p-0 border-secondary');

// Apply Wano Sakura/Ember animation in CSS inside public/style.css
const cssStyle = `
/* CSS Embers/Haki aura UX */
.ember { width: 3px; height: 3px; position: absolute; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px 2px #10b981; animation: flyUp linear infinite; }
.ember:nth-child(even) { background: #7e22ce; box-shadow: 0 0 10px 2px #7e22ce; animation-duration: 8s !important; }
@keyframes flyUp {
    0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
    20% { opacity: 0.8; }
    100% { transform: translateY(-10vh) translateX(30px) scale(1.5); opacity: 0; }
}
/* Style Custom Scrollbar for Dark Theme */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #7e22ce; border-radius: 10px; }
`;
fs.appendFileSync('public/style.css', cssStyle);

// Add Embers to HTML
const embersHTML = `
        <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <div class="ember" style="left: 10%; animation-duration: 10s;"></div>
            <div class="ember" style="left: 30%; animation-duration: 15s; animation-delay: 2s;"></div>
            <div class="ember" style="left: 70%; animation-duration: 12s; animation-delay: 5s;"></div>
            <div class="ember" style="left: 85%; animation-duration: 9s; animation-delay: 1s;"></div>
        </div>
`;
ih = ih.replace(/<main class="([^"]*)" id="main-content">/, `<main class="$1" id="main-content">\n${embersHTML}`);

fs.writeFileSync(idx, ih);
fs.writeFileSync(app, aj);
console.log('Low key luxury Wano theme applied successfully!');
