const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// DB 路徑：Render production 使用 persistent disk，本地使用 ./
const DB_DIR = process.env.NODE_ENV === 'production' ? '/opt/render/project/data' : '.';
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'voyage.sqlite');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 將靜態網頁交給 public 資料夾處理
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API: 圖片高精度解析翻譯 (利用後端 Gemini API，用戶前端不用輸入 Key)
// ==========================================
app.post('/api/scan-translate', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: '找不到圖片內容' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未設定 GEMINI_API_KEY 變數' });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: '請辨識這張圖片中的所有日文文字，並翻譯成繁體中文。\n\n請嚴格只回應以下 JSON 格式，不要加入任何說明：\n{"japanese":"原文","chinese":"繁體中文翻譯"}' },
                            { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
                        ]
                    }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
                })
            }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ resultText: rawText });

    } catch (err) {
        console.error('Scan Translate error:', err.message);
        res.status(500).json({ error: 'AI 解析失敗，請重試' });
    }
});

// ==========================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://anliutfrettsdmiueqbs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_kQ6AjRHKIVCsPeNPGdDBiA_aNvAsBGj';

async function supabaseFetch(endpoint, method = 'GET', body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(url, options);
    if (!res.ok) {
        let err = await res.text();
        throw new Error(err || `Supabase HTTP ${res.status}`);
    }
    if (res.status === 204) return [];
    return res.json();
}

console.log('✅ 雲端金庫已連接 (Supabase Remote Sync)');

// ==========================================
// API: Settings (設定)
// ==========================================
app.get('/api/settings', async (req, res) => {
    try {
        const rows = await supabaseFetch('settings?select=*');
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', async (req, res) => {
    try {
        const { total_budget, voyage_date, notion_url } = req.body;
        if(total_budget) await supabaseFetch('settings?key=eq.total_budget', 'PATCH', { value: String(total_budget) });
        if(voyage_date) await supabaseFetch('settings?key=eq.voyage_date', 'PATCH', { value: String(voyage_date) });
        
        // 支援新增的 Notion URL 儲存 (使用 Upsert 機制)
        if(notion_url !== undefined) {
            const getRes = await supabaseFetch('settings?key=eq.notion_url');
            if (getRes.length > 0) {
                await supabaseFetch('settings?key=eq.notion_url', 'PATCH', { value: String(notion_url) });
            } else {
                await supabaseFetch('settings', 'POST', { key: 'notion_url', value: String(notion_url) });
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/voyage-status', async (req, res) => {
    try {
        const rows = await supabaseFetch('settings?key=eq.voyage_date&select=value');
        const voyageDateStr = rows.length > 0 ? rows[0].value : '2026-07-16T00:00:00+08:00';
        const voyageDate = new Date(voyageDateStr);
        const today = new Date();
        const diffDays = Math.ceil((voyageDate - today) / (1000 * 60 * 60 * 24)); 
        res.json({ days_left: diffDays > 0 ? diffDays : 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: EXPENSES (金庫記帳系統)
// ==========================================
app.get('/api/expenses', async (req, res) => {
    try {
        const rows = await supabaseFetch('expenses?select=*&order=id.desc');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { title, amount } = req.body;
        if (!title || !amount) return res.status(400).json({ error: '名稱與金額必填！' });
        const result = await supabaseFetch('expenses', 'POST', { title, amount });
        res.json(result[0] || { id: Date.now(), title, amount });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/expenses/:id', async (req, res) => {
    try {
        const { title, amount } = req.body;
        await supabaseFetch(`expenses?id=eq.${req.params.id}`, 'PATCH', { title, amount });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await supabaseFetch(`expenses?id=eq.${req.params.id}`, 'DELETE');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: ITINERARY (航海日誌系統)
// ==========================================
app.get('/api/itinerary/:day', async (req, res) => {
    try {
        const day = req.params.day || 1;
        const rows = await supabaseFetch(`itinerary?day_num=eq.${day}&select=*&order=time_str.asc`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/itinerary', async (req, res) => {
    try {
        const { day_num, time_str, category, title, description, image_url } = req.body;
        if (!day_num || !title) return res.status(400).json({ error: '天數與景點為必填項目' });
        const finalImage = image_url || 'https://images.unsplash.com/photo-1542051812871-34f21505bB8b?w=800';
        
        const result = await supabaseFetch('itinerary', 'POST', {
            day_num, time_str, category: category || '探險', title, description: description || '', image_url: finalImage
        });
        res.json(result[0] || { id: Date.now() });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/itinerary/:id', async (req, res) => {
    try {
        await supabaseFetch(`itinerary?id=eq.${req.params.id}`, 'DELETE');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: CHECKLIST (裝備清單系統)
// ==========================================
app.get('/api/checklist', async (req, res) => {
    try {
        const rows = await supabaseFetch('checklist?select=*&order=id.asc');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checklist', async (req, res) => {
    try {
        const { item_name } = req.body;
        if (!item_name) return res.status(400).json({ error: '裝備名稱必填' });
        const result = await supabaseFetch('checklist', 'POST', { item_name, is_packed: false });
        res.json(result[0] || { id: Date.now(), item_name, is_packed: 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/checklist/:id', async (req, res) => {
    try {
        const { is_packed } = req.body;
        await supabaseFetch(`checklist?id=eq.${req.params.id}`, 'PATCH', { is_packed: is_packed ? true : false });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/checklist/:id', async (req, res) => {
    try {
        await supabaseFetch(`checklist?id=eq.${req.params.id}`, 'DELETE');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checklist/reset', async (req, res) => {
    try {
        await supabaseFetch('checklist', 'PATCH', { is_packed: false });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`🚀 千陽號大結局伺服器已啟動 (支援所有航線與清單): http://localhost:${port}`);
});
