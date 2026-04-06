const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('public/index.html', 'utf8');

// Colors: Green -> Yellow
html = html.replace(/#10b981/g, '#eab308'); 
html = html.replace(/16, 185, 129/g, '234, 179, 8');
html = html.replace(/16,185,129/g, '234,179,8');

// Insert Lightning CSS
const lightningCSS = `
.lightning-flash {
    position: absolute; inset: 0; pointer-events: none; z-index: 50; 
    animation: lightning 12s infinite; mix-blend-mode: color-dodge;
}
@keyframes lightning {
    0%, 93%, 98%, 100% { opacity: 0; background: transparent; }
    94% { opacity: 0.8; background: rgba(234,179,8,0.3); }
    95% { opacity: 0; }
    96% { opacity: 1; background: rgba(126,34,206,0.6); }
    97% { opacity: 0; }
}
`;
html = html.replace('</style>', lightningCSS + '</style>');

// Add Lightning flash to container
html = html.replace(/<div id="app-container"[^>]*>/, match => match + '\n        <div class="lightning-flash"></div>');

// Replace the single Captain Memo with a Carousel
const oldMemoRegionRegex = /<h3 class="text-lg font-bold tracking-wider text-gray-100 mt-7 mb-3 border-l-2 border-ocean pl-2">船長的備忘錄<\/h3>[\s\S]*?<div class="bg-dark-100\/90 backdrop-blur-md border border-white\/10 rounded-xl p-4 text-gray-200 shadow-2xl relative overflow-hidden transform transition hover:-translate-y-1">[\s\S]*?<\/div>\s*<\/div>\s*<!-- VIEW: ITINERARY/;

const newMemoHTML = `
                <h3 class="text-lg font-bold tracking-wider text-gray-100 mt-7 mb-3 border-l-2 border-ocean pl-2">船長的備忘錄</h3>
                <div class="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory custom-scrollbar px-1">
                    <!-- Memo 1 -->
                    <div class="min-w-[85%] sm:min-w-[300px] snap-center shrink-0 bg-dark-100/90 backdrop-blur-md border border-ocean/50 border-l-4 border-l-ocean p-4 rounded-xl shadow-lg relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer">
                        <i class="ph-fill ph-treasure-chest absolute text-8xl text-ocean/10 -bottom-2 -right-2 transition-transform group-hover:rotate-12 duration-500"></i>
                        <div class="relative z-10 flex gap-3 items-center">
                            <div class="w-10 h-10 shrink-0 bg-ocean rounded-full flex items-center justify-center font-bold shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                                <i class="ph-fill ph-wine text-xl text-white"></i>
                            </div>
                            <div>
                                <h4 class="text-[13px] font-bold tracking-wider text-gray-100 mb-0.5">準備大吃大喝？</h4>
                                <p class="text-[10px] text-gray-400 leading-relaxed">記得使用上面「海上餐廳」的羅盤，尋找附近的海賊據點和肉！</p>
                            </div>
                        </div>
                    </div>
                    <!-- Memo 2 -->
                    <div class="min-w-[85%] sm:min-w-[300px] snap-center shrink-0 bg-dark-200/90 backdrop-blur-md border border-primary/50 border-l-4 border-l-primary p-4 rounded-xl shadow-lg relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer">
                        <i class="ph-fill ph-map-trifold absolute text-8xl text-primary/10 -bottom-2 -right-2 transition-transform group-hover:rotate-12 duration-500"></i>
                        <div class="relative z-10 flex gap-3 items-center">
                            <div class="w-10 h-10 shrink-0 bg-primary rounded-full flex items-center justify-center font-bold shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                                <i class="ph-fill ph-compass text-xl text-white"></i>
                            </div>
                            <div>
                                <h4 class="text-[13px] font-bold tracking-wider text-gray-100 mb-0.5">迷失方向了嗎？</h4>
                                <p class="text-[10px] text-gray-400 leading-relaxed">點擊「偉大航道總覽」，查看每天精選的討伐路線圖！</p>
                            </div>
                        </div>
                    </div>
                    <!-- Memo 3 -->
                    <div class="min-w-[85%] sm:min-w-[300px] snap-center shrink-0 bg-dark-100/90 backdrop-blur-md border border-secondary/50 border-l-4 border-l-secondary p-4 rounded-xl shadow-lg relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer">
                        <i class="ph-fill ph-coin absolute text-8xl text-secondary/10 -bottom-2 -right-2 transition-transform group-hover:rotate-12 duration-500"></i>
                        <div class="relative z-10 flex gap-3 items-center">
                            <div class="w-10 h-10 shrink-0 bg-secondary rounded-full flex items-center justify-center font-bold shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                                <i class="ph-fill ph-currency-jpy text-xl text-dark-400"></i>
                            </div>
                            <div>
                                <h4 class="text-[13px] font-bold tracking-wider text-gray-100 mb-0.5">匯率即時監控中！</h4>
                                <p class="text-[10px] text-gray-400 leading-relaxed">現在所有的記帳都會馬上抓取日幣對台幣最新的匯率喔！</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VIEW: ITINERARY`;

html = html.replace(oldMemoRegionRegex, newMemoHTML);

// Make buttons interactive
html = html.replace(/class=\"([^\"]*flex flex-col items-center gap-1 group transform transition hover:-translate-y-1[^\"]*)\"/g, 'class="$1 active:scale-95"');
html = html.replace(/bg-dark-200\/40 backdrop-blur-md p-3 rounded/g, 'bg-dark-200/40 backdrop-blur-md p-3 rounded hover:scale-[1.02] active:scale-95 transition-transform');
fs.writeFileSync('public/index.html', html, 'utf8');

// 2. Update app.js (Real-time Exchange Rate)
let appjs = fs.readFileSync('public/app.js', 'utf8');

const appJsCode = `
let jpyToTwdRate = 0.21;
async function fetchExchangeRate() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/JPY');
        const data = await res.json();
        if(data && data.rates && data.rates.TWD) {
            jpyToTwdRate = data.rates.TWD;
        }
    } catch(err) {
        console.warn('Real time exchange rate failed, using 0.21');
    }
}
fetchExchangeRate();

// Update original functions
`;

appjs = appjs.replace(/Math\.round\(item\.amount \* 0\.21\)/g, 'Math.round(item.amount * jpyToTwdRate)');
appjs = appjs.replace(/Math\.round\(total \* 0\.21\)/g, 'Math.round(total * jpyToTwdRate)');

// Insert fetchExchangeRate at the top of app.js
if (!appjs.includes('fetchExchangeRate')) {
    appjs = appJsCode + appjs;
}

// Add active effect to itinerary card dynamically added in appJS
appjs = appjs.replace(/class=\"bg-dark-100\/50 border border-white\/10 rounded overflow-hidden flex shadow-lg\"/, 'class="bg-dark-100/50 border border-white/10 rounded overflow-hidden flex shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"');

fs.writeFileSync('public/app.js', appjs, 'utf8');

// 3. Drop Itinerary Table in sqlite
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./voyage.sqlite');
db.run("DROP TABLE IF EXISTS itinerary", (err) => {
    if(err) console.error(err);
    else console.log("itinerary table dropped successfully.");
    db.close();
});
