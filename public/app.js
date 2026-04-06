document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    initApp();
});

let TOTAL_BUDGET = 150000;
let VOYAGE_DATE = "2026-07-16";
window.currentItineraryRows = []; // 全域存放當前天數的航線列表，避免 onclick 傳字串報錯

async function initApp() {
    await fetchSettings();
    switchTab('home');
    fetchVoyageStatus();
    fetchExpenses();
    fetchChecklist();
}

// ===================================
// XSS 防護
// ===================================
function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
    );
}

// ===================================
// UI 切換邏輯
// ===================================
function switchTab(tabName) {
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.remove('hidden', 'active'), targetView.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'text-primary');
        btn.classList.add('text-gray-400', 'opacity-60');
    });
    const activeBtn = document.querySelector(`[data-target="view-${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'text-primary');
        activeBtn.classList.remove('text-gray-400', 'opacity-60');
    }
    
    if (tabName === 'itinerary') changeDay(currentDay);
    if (tabName === 'checklist') fetchChecklist();
}

// ===================================
// 娜美氣象局 API (Open-Meteo)
// ===================================
const WMO_CODES = {
    0: '晴空萬里', 1: '晴時多雲', 2: '多雲', 3: '陰天', 
    45: '起霧', 48: '霧',
    51: '毛毛雨', 53: '小雨', 55: '大雨',
    61: '小雨', 63: '下雨', 65: '大雨',
    71: '小雪', 73: '下雪', 75: '大雪',
    80: '猛烈陣雨', 81: '狂風暴雨', 82: '暴雨',
    95: '雷雨', 96: '雷雨冰雹', 99: '強烈雷暴'
};

async function openWeatherModal() {
    // 預先顯示 Loading
    document.getElementById('weather-temp').innerText = `--°C`;
    document.getElementById('weather-desc').innerText = `連線中...`;
    document.getElementById('weather-precip').innerText = `-- mm`;
    
    const m = document.getElementById('weather-modal'), c = document.getElementById('weather-modal-content');
    m.classList.remove('hidden');
    setTimeout(() => c.classList.remove('translate-y-full'), 10);
    
    try {
        // 福岡市區座標: 33.5902, 130.4017 (免金鑰天氣 API)
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=33.5902&longitude=130.4017&current=temperature_2m,precipitation,weather_code&timezone=Asia%2FTokyo");
        const data = await res.json();
        
        const temp = data.current.temperature_2m;
        const precip = data.current.precipitation;
        const desc = WMO_CODES[data.current.weather_code] || '未知氣候';
        
        document.getElementById('weather-temp').innerText = `${temp}°C`;
        document.getElementById('weather-desc').innerText = desc;
        document.getElementById('weather-precip').innerText = `目前降雨量: ${precip} mm`;
        
        // 更新首頁氣象局版面
        document.getElementById('home-weather-temp').innerText = `${Math.round(temp)}°`;
        document.getElementById('home-weather-desc').innerText = desc;
    } catch(e) {
        document.getElementById('weather-desc').innerText = `無法取得`;
    }
}
function closeWeatherModal() {
    const c = document.getElementById('weather-modal-content');
    c.classList.add('translate-y-full');
    setTimeout(() => document.getElementById('weather-modal').classList.add('hidden'), 300);
}

// ===================================
// 船長設定 API (Settings)
// ===================================
async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.total_budget) TOTAL_BUDGET = Number(data.total_budget);
        if (data.voyage_date) VOYAGE_DATE = data.voyage_date;
        
        document.getElementById('setting-budget').value = TOTAL_BUDGET;
        document.getElementById('setting-date').value = VOYAGE_DATE;
        const bEl = document.getElementById('expense-budget');
        if (bEl) bEl.innerText = TOTAL_BUDGET.toLocaleString();
        
        if (typeof updateSettingBudgetTWD === 'function') updateSettingBudgetTWD();
    } catch (e) { console.error(e); }
}

async function saveSettings() {
    const total_budget = document.getElementById('setting-budget').value;
    const voyage_date = document.getElementById('setting-date').value;
    try {
        const res = await fetch('/api/settings', {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({total_budget, voyage_date})
        });
        if(res.ok) { closeSettingsModal(); initApp(); }
    } catch(e) { alert("更新失敗"); }
}

function updateSettingBudgetTWD() {
    const jpy = Number(document.getElementById('setting-budget').value) || 0;
    document.getElementById('setting-budget-twd').innerText = `約 NT$ ${Math.round(jpy * 0.21).toLocaleString()}`;
}

function openSettingsModal() {
    updateSettingBudgetTWD();
    document.getElementById('settings-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('settings-modal-content').classList.remove('translate-y-full'), 10);
}
function closeSettingsModal() {
    document.getElementById('settings-modal-content').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('settings-modal').classList.add('hidden'), 300);
}

// ===================================
// 地圖 Modal API
// ===================================
function openMapModal() {
    let defaultLocation = "九州 日本";
    const locations = {
        1: "福岡市區 日本",
        2: "熊本市 日本",
        3: "阿蘇山 日本",
        4: "由布院 日本",
        5: "門司港 日本",
        6: "太宰府 日本",
        7: "福岡機場 日本"
    };
    
    let query = locations[currentDay] || defaultLocation;
    if (window.currentItineraryRows && window.currentItineraryRows.length > 0) {
        // 如果當日有行程，以第一個行程做為地圖搜尋起點
        query = window.currentItineraryRows[0].title + " 日本";
    }

    document.getElementById('map-iframe').src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=12&ie=UTF8&iwloc=&output=embed`;
    const titleEl = document.getElementById('map-modal-title');
    if (titleEl) titleEl.innerHTML = `<i class="ph-fill ph-map-trifold mr-2 text-xl"></i>偉大航道總覽 - DAY ${currentDay}`;

    document.getElementById('map-modal').classList.remove('hidden');
    setTimeout(() => { document.getElementById('map-modal-content').classList.remove('scale-95', 'opacity-0'); }, 10);
}

function openFoodMap() {
    let query = "福岡 美食 餐廳";
    const locations = {
        1: "福岡 天神 美食",
        2: "熊本城 周邊美食",
        3: "阿蘇 周邊美食",
        4: "由布院 美食",
        5: "小倉 門司港 美食",
        6: "太宰府 美食",
        7: "福岡機場 美食"
    };
    query = locations[currentDay] || query;
    
    document.getElementById('map-iframe').src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    const titleEl = document.getElementById('map-modal-title');
    if (titleEl) titleEl.innerHTML = `<i class="ph-fill ph-fork-knife mr-2 text-xl"></i>海上餐廳 - 尋找糧食`;

    document.getElementById('map-modal').classList.remove('hidden');
    setTimeout(() => { document.getElementById('map-modal-content').classList.remove('scale-95', 'opacity-0'); }, 10);
}

function closeMapModal() {
    document.getElementById('map-modal-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => document.getElementById('map-modal').classList.add('hidden'), 300);
}

// ===================================
// 倒數與首頁 API
// ===================================
async function fetchVoyageStatus() {
    try {
        const res = await fetch('/api/voyage-status');
        const data = await res.json();
        const daysEl = document.getElementById('countdown-days');
        if (daysEl) daysEl.innerText = data.days_left;
    } catch (err) {}
}

let jpyToTwdRate = 0.21;
async function fetchExchangeRate() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/JPY');
        const data = await res.json();
        if(data && data.rates && data.rates.TWD) {
            jpyToTwdRate = data.rates.TWD;
            const rt = document.getElementById('home-exchange-rate');
            if(rt) {
                rt.innerText = jpyToTwdRate.toFixed(4);
                rt.classList.add('text-secondary', 'drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]');
            }
        }
    } catch(err) {
        console.warn('Real time exchange rate failed, using 0.21');
    }
}
document.addEventListener('DOMContentLoaded', fetchExchangeRate);

// ===================================
// 金庫 (Expenses)
// ===================================
async function fetchExpenses() {
    try {
        const res = await fetch('/api/expenses');
        const expenses = await res.json();
        
        const listEl = document.getElementById('expense-list');
        listEl.innerHTML = '';
        let total = 0;

        if (expenses.length === 0) {
            listEl.innerHTML = '<p class="text-center font-bold text-gray-400 py-6">金庫目前空空如也...</p>';
        } else {
            expenses.forEach((item, index) => {
                total += item.amount;
                const rotateClass = index % 2 === 0 ? '-rotate-1' : 'rotate-1';
                const icon = (item.title.includes('SUICA') || item.title.includes('車')) ? '<i class="ph-bold ph-boat text-2xl"></i>' : '<i class="ph-bold ph-knife text-2xl"></i>';
                const colorClass = (item.title.includes('SUICA') || item.title.includes('車')) ? 'bg-ocean' : 'bg-primary';
                
                const safeTitle = escapeHTML(item.title);
                const dateObj = new Date(item.created_at || Date.now());
                const dateString = dateObj.toLocaleDateString('zh-TW', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
                const escArgs = safeTitle.replace(/'/g, "\\'");

                const html = `
                    <div onclick="openExpenseModal('${item.id}', '${escArgs}', ${item.amount})" class="bg-dark-200/40 backdrop-blur-md p-3 rounded border border-primary/20 border-white/10 shadow-lg flex items-center gap-3 transform ${rotateClass} cursor-pointer hover:bg-dark-300 transition active:scale-95">
                        <div class="w-12 h-12 ${colorClass} border border-primary/20 border-white/10 text-white flex items-center justify-center shrink-0">${icon}</div>
                        <div class="flex-1">
                            <h4 class="font-bold tracking-wider text-gray-100">${safeTitle}</h4>
                            <p class="text-[10px] font-bold text-gray-400">${dateString}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold tracking-wider text-xl text-gray-100 mb-0.5">฿ ${item.amount.toLocaleString()}</p>
                            <p class="text-[10px] font-bold text-primary">~ NT$ ${Math.round(item.amount * jpyToTwdRate).toLocaleString()}</p>
                        </div>
                    </div>`;
                listEl.insertAdjacentHTML('beforeend', html);
            });
        }
        document.getElementById('expense-total').innerText = total.toLocaleString();
        document.getElementById('expense-left').innerText = (TOTAL_BUDGET - total).toLocaleString();
    } catch (err) {}
}

function openExpenseModal(id='', title='', amount='') {
    const m = document.getElementById('expense-modal'), c = document.getElementById('expense-modal-content');
    document.getElementById('expense-id').value = id;
    document.getElementById('expense-title').value = title;
    document.getElementById('expense-amount').value = amount;
    
    document.getElementById('expense-modal-title').innerText = id ? "修改紀錄 (Update Bounty)" : "新紀錄 (New Bounty)";
    const delBtn = document.getElementById('btn-delete-expense');
    id ? delBtn.classList.remove('hidden') : delBtn.classList.add('hidden');

    m.classList.remove('hidden');
    setTimeout(() => c.classList.remove('translate-y-full'), 10);
}

function closeExpenseModal() {
    document.getElementById('expense-modal-content').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('expense-modal').classList.add('hidden'), 300);
}

async function submitExpense() {
    const id = document.getElementById('expense-id').value;
    const title = document.getElementById('expense-title').value;
    const amount = document.getElementById('expense-amount').value;
    if (!title || !amount) { alert("名稱與金額為必填！"); return; }
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/expenses/${id}` : `/api/expenses`;

    await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount: Number(amount) })
    });
    closeExpenseModal();
    fetchExpenses();
}

async function deleteExpense() {
    const id = document.getElementById('expense-id').value;
    if (!confirm("確定要放棄這筆紀錄嗎？")) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    closeExpenseModal();
    fetchExpenses();
}

// ===================================
// 航海日誌 (Itinerary)
// ===================================
let currentDay = 1;

async function changeDay(day) {
    currentDay = day;
    // 重設全部 Tab 樣式 (Inactive: 暗底)
    document.querySelectorAll('.day-tab').forEach(tab => {
        tab.classList.remove('bg-gradient-to-r', 'from-secondary', 'to-yellow-600', 'text-dark-400', 'shadow-[0_0_15px_rgba(234,179,8,0.6)]', 'font-black', 'scale-105', 'border-secondary');
        tab.classList.add('bg-dark-200/80', 'backdrop-blur-xl', 'text-gray-400', 'border-white/20', 'opacity-80', 'font-bold');
    });
    // 設定當下的 Tab (Active: 黃金漸層)
    const activeTab = document.getElementById(`tab-day-${day}`);
    if (activeTab) {
        activeTab.classList.remove('bg-dark-200/80', 'backdrop-blur-xl', 'text-gray-400', 'border-white/20', 'opacity-80', 'font-bold');
        activeTab.classList.add('bg-gradient-to-r', 'from-secondary', 'to-yellow-600', 'text-dark-400', 'border-secondary', 'shadow-[0_0_15px_rgba(234,179,8,0.6)]', 'font-black', 'scale-105');
    }

    try {
        const res = await fetch(`/api/itinerary/${day}`);
        const rows = await res.json();
        window.currentItineraryRows = rows; // 存到全域供 Modal 抓取
        
        const listEl = document.getElementById('itinerary-list');
        listEl.innerHTML = '<div class="absolute left-[13px] top-6 bottom-0 w-0 border-l-2 border-dashed border-white/5"></div>';
        
        if (rows.length === 0) {
            listEl.innerHTML += '<p class="text-center font-bold text-gray-400 py-6">當日目前沒有安排航線！</p>';
        } else {
            rows.forEach((item, index) => {
                const sTitle = escapeHTML(item.title);
                const sTime = escapeHTML(item.time_str);
                const sDesc = escapeHTML(item.description);
                const sCat = escapeHTML(item.category);
                const sUrl = item.image_url || '';
                const fallbackUrl = `https://picsum.photos/seed/japan_${item.id}/800/600`;

                // 完全不使用 onclick 字串傳遞，直接傳 Array Index，避免所有跳脫字元錯誤！
                const html = `
                    <div class="relative cursor-pointer transition transform hover:-translate-y-1 active:scale-95" onclick="openItineraryDetailByIndex(${index})">
                        <div class="absolute -left-[35px] top-3 w-6 h-6 bg-dark-300 text-primary border border-primary/20 border-white/10 rounded-full flex items-center justify-center z-10 shadow-wanted-sm">
                            <i class="ph-fill ph-anchor-simple text-sm font-bold tracking-wider"></i>
                        </div>
                        <div class="bg-dark-200/40 backdrop-blur-md p-4 rounded-xl border border-primary/20 border-white/10 shadow-wanted relative overflow-hidden group">
                            <div class="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style="background-image:url('${sUrl}'), url('${fallbackUrl}')"></div>
                            
                            <div class="flex justify-between items-center mb-2 pr-2 relative z-10">
                                <span class="text-sm font-bold tracking-wider text-primary">${sTime}</span>
                                <span class="text-[10px] font-bold bg-secondary text-gray-100 border border-white/10 px-2 py-0.5 rounded transform -rotate-2">${sCat}</span>
                            </div>
                            <h3 class="font-bold tracking-wider text-gray-100 text-lg relative z-10 flex items-center justify-between">
                                ${sTitle} <i class="ph-bold ph-caret-right text-wood-400 opacity-0 group-hover:opacity-100 transition"></i>
                            </h3>
                            <p class="text-xs text-gray-400 mt-1 truncate relative z-10">${sDesc}</p>
                        </div>
                    </div>`;
                listEl.insertAdjacentHTML('beforeend', html);
            });
        }
    } catch(e) {}
}

// 景點詳細視窗 (改由陣列 index 讀取！)
function openItineraryDetailByIndex(index) {
    const item = window.currentItineraryRows[index];
    if (!item) return;

    window.currentItinIndex = index; // 記憶目前開啟的景點序號，供編輯使用

    document.getElementById('detail-title').innerText = item.title;
    document.getElementById('detail-time').innerText = item.time_str;
    document.getElementById('detail-desc').innerText = item.description || '無詳細說明';
    
    // 如果原圖失效則換上備份風景圖
    const imgEl = document.getElementById('detail-img');
    imgEl.onerror = function() { this.src = `https://picsum.photos/seed/japan_${item.id}/800/600`; };
    imgEl.src = item.image_url || `https://picsum.photos/seed/japan_${item.id}/800/600`;
    
    document.getElementById('btn-delete-itin').onclick = () => deleteItinerary(item.id);
    
    const m = document.getElementById('itinerary-detail-modal');
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('itinerary-detail-content').classList.remove('scale-95', 'opacity-0'), 10);
}

function closeItineraryDetail() {
    document.getElementById('itinerary-detail-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => document.getElementById('itinerary-detail-modal').classList.add('hidden'), 300);
}

async function deleteItinerary(id) {
    if (!confirm("確定要取消這個航點嗎？")) return;
    await fetch(`/api/itinerary/${id}`, { method: 'DELETE' });
    closeItineraryDetail();
    changeDay(currentDay);
}

function editCurrentItinerary() {
    closeItineraryDetail();
    const item = window.currentItineraryRows[window.currentItinIndex];
    if(!item) return;
    
    document.getElementById('add-itin-id').value = item.id;
    document.getElementById('add-itin-time').value = item.time_str;
    document.getElementById('add-itin-title').value = item.title;
    document.getElementById('add-itin-desc').value = item.description || '';
    const imgInput = document.getElementById('add-itin-img');
    if (imgInput) imgInput.value = item.image_url || '';
    
    document.getElementById('add-itin-modal-title').innerText = '編輯航點';
    const m = document.getElementById('itinerary-add-modal');
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('itinerary-add-modal-content').classList.remove('translate-y-full'), 10);
}

function openItineraryAddModal() {
    document.getElementById('add-itin-id').value = '';
    document.getElementById('add-itin-modal-title').innerText = '新增航點';
    document.getElementById('add-itin-title').value = '';
    document.getElementById('add-itin-desc').value = '';
    const imgInput = document.getElementById('add-itin-img');
    if (imgInput) imgInput.value = '';
    const m = document.getElementById('itinerary-add-modal');
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('itinerary-add-modal-content').classList.remove('translate-y-full'), 10);
}
function closeItineraryAddModal() {
    document.getElementById('itinerary-add-modal-content').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('itinerary-add-modal').classList.add('hidden'), 300);
}

async function submitItinerary() {
    const id = document.getElementById('add-itin-id').value;
    const time_str = document.getElementById('add-itin-time').value;
    const title = document.getElementById('add-itin-title').value;
    const desc = document.getElementById('add-itin-desc').value;
    const imgEl = document.getElementById('add-itin-img');
    const image_url = imgEl ? imgEl.value : '';
    
    if(!title) { alert("名稱不可為空"); return; }

    const url = id ? `/api/itinerary/${id}` : '/api/itinerary';
    const method = id ? 'PUT' : 'POST';

    await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ day_num: currentDay, time_str, category: '探險', title, description: desc, image_url: image_url })
    });
    closeItineraryAddModal();
    changeDay(currentDay);
}

// ===================================
// 裝備庫 (Checklist)
// ===================================
async function fetchChecklist() {
    try {
        const res = await fetch('/api/checklist');
        const rows = await res.json();
        const listEl = document.getElementById('checklist-list');
        listEl.innerHTML = '';
        if(rows.length === 0) listEl.innerHTML = '<p class="text-center font-bold text-gray-400">空空如也，尚未準備裝備</p>';
        rows.forEach(item => {
            const checkedAttr = item.is_packed ? 'checked' : '';
            const textStyle = item.is_packed ? 'line-through opacity-50' : 'text-gray-100';
            const html = `
                <div class="flex items-center justify-between bg-dark-200/40 backdrop-blur-md p-3 rounded-xl border border-primary/20 border-white/10 shadow-lg">
                    <label class="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" ${checkedAttr} onchange="toggleChecklist('${item.id}', this.checked)" class="w-6 h-6 border border-primary/20 border-white/10 rounded text-primary focus:ring-primary focus:ring-2">
                        <span class="font-bold tracking-wider text-lg ${textStyle} transition-all">${escapeHTML(item.item_name)}</span>
                    </label>
                    <button onclick="deleteChecklist('${item.id}')" class="text-gray-500 hover:text-primary ml-2 transition active:scale-95"><i class="ph-bold ph-trash text-2xl"></i></button>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', html);
        });
    } catch(e){}
}

async function addChecklistItem() {
    const input = document.getElementById('checklist-input');
    const item_name = input.value.trim();
    if(!item_name) return;
    await fetch('/api/checklist', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({item_name})
    });
    input.value = '';
    fetchChecklist();
}

async function toggleChecklist(id, is_packed) {
    await fetch(`/api/checklist/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({is_packed})
    });
    fetchChecklist();
}

async function deleteChecklist(id) {
    await fetch(`/api/checklist/${id}`, { method: 'DELETE' });
    fetchChecklist();
}

async function resetChecklist() {
    if (!confirm("確定要清空所有已打包的項目，重新整理行囊嗎？（未完成清單保留）")) return;
    await fetch('/api/checklist/reset', { method: 'POST' });
    fetchChecklist();
}

// ===================================
// 之國 · 航海許可証 (登入系統)
// ===================================
function checkLoginStatus() {
    if (sessionStorage.getItem('voyage_auth') === 'granted') {
        const screen = document.getElementById('login-screen');
        if (screen) screen.remove();
    }
}

function attemptLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (username === '1111' && password === '1111') {
        errorEl.classList.add('hidden');
        sessionStorage.setItem('voyage_auth', 'granted');

        btn.textContent = '⚔ 許可！出發！';

        const screen = document.getElementById('login-screen');
        screen.style.transition = 'opacity 0.9s ease';
        screen.style.opacity = '0';
        setTimeout(() => screen.remove(), 900);
    } else {
        errorEl.classList.remove('hidden');
        // 抖動效果
        const form = document.getElementById('login-form');
        form.classList.remove('wano-shake');
        void form.offsetWidth; // reflow
        form.classList.add('wano-shake');
        setTimeout(() => form.classList.remove('wano-shake'), 500);
    }
}

// ===================================
// 密碼解析所 (Tesseract OCR + 後端翻譯)
// ===================================
let ocrImageFile = null;

function openOcrModal() {
    const m = document.getElementById('ocr-modal');
    const c = document.getElementById('ocr-modal-content');
    m.classList.remove('hidden');
    setTimeout(() => c.classList.remove('translate-y-full'), 10);
}

function closeOcrModal() {
    const c = document.getElementById('ocr-modal-content');
    c.classList.add('translate-y-full');
    setTimeout(() => document.getElementById('ocr-modal').classList.add('hidden'), 300);
}

function handleOcrFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    ocrImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('ocr-preview-img').src = e.target.result;
        document.getElementById('ocr-preview-box').classList.remove('hidden');
        document.getElementById('ocr-drop-zone').classList.add('hidden');
        document.getElementById('ocr-scan-btn').classList.remove('hidden');
        document.getElementById('ocr-result-box').classList.add('hidden');
        document.getElementById('ocr-progress-box').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// 圖片壓縮並轉 base64（去掉 data:... 前綴），解決手機照片太大傳送失敗的問題
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawBase64 = e.target.result.split(',')[1];
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let w = img.width;
                    let h = img.height;
                    const MAX_DIMENSION = 1200;
                    if (w > h && w > MAX_DIMENSION) {
                        h = Math.round(h * (MAX_DIMENSION / w));
                        w = MAX_DIMENSION;
                    } else if (h > MAX_DIMENSION) {
                        w = Math.round(w * (MAX_DIMENSION / h));
                        h = MAX_DIMENSION;
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl.split(',')[1]);
                } catch (canvasErr) {
                    // 如果 Canvas 壓縮失敗，退回使用原始圖檔
                    resolve(rawBase64);
                }
            };
            
            img.onerror = () => {
                // iOS 不支援 HEIC 放入 img，會觸發 error，在此直接退回原始圖檔
                resolve(rawBase64);
            };
            
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function runOcr() {
    if (!ocrImageFile) return;

    document.getElementById('ocr-scan-btn').classList.add('hidden');
    document.getElementById('ocr-result-box').classList.add('hidden');
    document.getElementById('ocr-progress-box').classList.remove('hidden');
    document.getElementById('ocr-progress-bar').style.width = '20%';
    document.getElementById('ocr-status-text').textContent = '🤖 圖片預處理中...';

    try {
        const base64 = await fileToBase64(ocrImageFile);
        document.getElementById('ocr-progress-bar').style.width = '50%';
        document.getElementById('ocr-status-text').textContent = '✨ AI 精準解析 ＆ 翻譯中，請稍候...';

        const res = await fetch('/api/scan-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: base64,
                mimeType: ocrImageFile.type || 'image/jpeg'
            })
        });

        document.getElementById('ocr-progress-bar').style.width = '90%';

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error || `連線錯誤 (${res.status})`);
        }

        const data = await res.json();
        const rawText = data.resultText || '';

        // Gemini JSON 擷取
        let japanese = '', chinese = '';
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                japanese = (parsed.japanese || '').trim();
                chinese = (parsed.chinese || '').trim();
            } else {
                japanese = rawText.trim();
                chinese = '（AI 未回傳標準格式，顯示原始摘要）';
            }
        } catch (e) {
            japanese = rawText.trim();
            chinese = '（資料格式異常）';
        }

        document.getElementById('ocr-progress-bar').style.width = '100%';
        document.getElementById('ocr-japanese-text').textContent = japanese || '（未偵測到文字）';
        document.getElementById('ocr-translated-text').textContent = chinese || '（無翻譯）';
        document.getElementById('ocr-result-box').classList.remove('hidden');

    } catch (err) {
        console.error('OCR error:', err);
        document.getElementById('ocr-status-text').textContent = `❌ ${err.message}`;
        document.getElementById('ocr-scan-btn').classList.remove('hidden');
    } finally {
        document.getElementById('ocr-progress-box').classList.add('hidden');
    }
}


function resetOcrModal() {
    ocrImageFile = null;
    const fileInput = document.getElementById('ocr-file-input');
    if (fileInput) fileInput.value = '';
    document.getElementById('ocr-preview-img').src = '';
    document.getElementById('ocr-preview-box').classList.add('hidden');
    document.getElementById('ocr-drop-zone').classList.remove('hidden');
    document.getElementById('ocr-scan-btn').classList.add('hidden');
    document.getElementById('ocr-result-box').classList.add('hidden');
    document.getElementById('ocr-progress-box').classList.add('hidden');
    document.getElementById('ocr-progress-bar').style.width = '0%';
    document.getElementById('ocr-japanese-text').textContent = '';
    document.getElementById('ocr-translated-text').textContent = '';
}

function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent;
    if (!text) return;

    const btnId = elementId === 'ocr-japanese-text' ? 'copy-jp-btn' : 'copy-tw-btn';
    const btn = document.getElementById(btnId);

    navigator.clipboard.writeText(text).then(() => {
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✓ 已複製！';
            btn.style.color = '#4ade80';
            setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
        }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

