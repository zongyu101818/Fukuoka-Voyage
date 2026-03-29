const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 將靜態網頁交給 public 資料夾處理
app.use(express.static(path.join(__dirname, 'public')));

// 建立或連線 SQLite 資料庫
const db = new sqlite3.Database('./voyage.sqlite', (err) => {
    if (err) {
        console.error('金庫開啟失敗: ', err.message);
    } else {
        console.log('✅ 金庫已連接 (SQLite Voyage Database v3)');
        
        // Settings 船長設定表
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`, (err) => {
            if(!err) {
                db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('total_budget', '150000')`);
                db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('voyage_date', '2026-07-16')`);
            }
        });

        // 費用資料庫
        db.run(`CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            amount DECIMAL(10, 2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 航海日誌 (行程) 資料庫
        db.run(`CREATE TABLE IF NOT EXISTS itinerary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_num INTEGER,
            time_str TEXT,
            category TEXT,
            title TEXT,
            description TEXT,
            image_url TEXT
        )`, (err) => {
            if (!err) {
                db.get("SELECT COUNT(*) as count FROM itinerary", (err, row) => {
                    if (row && row.count === 0) {
                        const sql = 'INSERT INTO itinerary (day_num, time_str, category, title, description, image_url) VALUES (?, ?, ?, ?, ?, ?)';
                        // DAY 1
                        db.run(sql, [1, '10:00', '準備', '福岡機場入境', '抵達福岡機場，領取行李並前往博多市區。', 'https://images.unsplash.com/photo-1542051812871-34f21505bB8b?w=800']); 
                        db.run(sql, [1, '14:00', '探險', '櫛田神社', '博多總鎮守，欣賞壯觀的裝飾山笠。', 'https://images.unsplash.com/photo-1627993079075-816d2b59ecfd?w=800']); 
                        db.run(sql, [1, '18:00', '補給', '中洲屋台街', '體驗福岡道地的路邊攤美食文化。', 'https://images.unsplash.com/photo-1616428414594-5262deee92ea?w=800']); 
                        // DAY 2
                        db.run(sql, [2, '09:00', '探險', '太宰府天滿宮', '參拜學問之神並品嚐梅枝餅。', 'https://images.unsplash.com/photo-1624028373200-cba190f845ee?w=800']); 
                        db.run(sql, [2, '15:00', '市區', '大濠公園', '在絕美的湖畔散步，享受午後陽光。', 'https://images.unsplash.com/photo-1562916186-5d2ee7762635?w=800']); 
                        db.run(sql, [2, '20:00', '夜景', '福岡塔', '登高俯瞰百道海濱公園與福岡市璀璨夜景。', 'https://plus.unsplash.com/premium_photo-1661962323385-e11232840acb?w=800']); 
                        // DAY 3
                        db.run(sql, [3, '09:30', '移動', '別府特急列車', '展開溫泉縣的大冒險', 'https://images.unsplash.com/photo-1549448888-29ef8b0870c9?w=800']); 
                        db.run(sql, [3, '13:00', '探險', '別府地獄溫泉', '參觀海地獄、血池地獄等奇特自然景觀。', 'https://images.unsplash.com/photo-1574676527582-73010b4deee4?w=800']); 
                        // DAY 4
                        db.run(sql, [4, '10:00', '漫步', '由布院 湯之坪', '品嚐 B-Speak 蛋糕卷與各種特色小吃。', 'https://images.unsplash.com/photo-1582239330104-ff2ca1bf743e?w=800']); 
                        db.run(sql, [4, '16:00', '風景', '夢幻金鱗湖', '觀賞夕照與晨霧美景。', 'https://images.unsplash.com/photo-1510257321689-0ae280eb4c8a?w=800']); 
                        // DAY 5
                        db.run(sql, [5, '11:00', '歷史', '熊本城', '日本三大名城之一，見證其龐大規模與復甦。', 'https://images.unsplash.com/photo-1596483582121-50e560f7e41d?w=800']); 
                        db.run(sql, [5, '15:00', '探險', '水前寺成趣園', '風景如畫的日式庭園。', 'https://images.unsplash.com/photo-1560965380-4d402f068222?w=800']); 
                        // DAY 6
                        db.run(sql, [6, '10:00', '壯闊', '阿蘇火山草千里', '近距離感受活火山魄力與無盡草原。', 'https://images.unsplash.com/photo-1591873155700-1c31f4961d15?w=800']); 
                        // DAY 7
                        db.run(sql, [7, '10:00', '補給', '天神地下街', '最後採買與伴手禮準備。', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800']); 
                    }
                });
            }
        });

        // 裝備清單 資料庫
        db.run(`CREATE TABLE IF NOT EXISTS checklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT,
            is_packed BOOLEAN DEFAULT 0
        )`, (err) => {
            if(!err) {
                db.get("SELECT COUNT(*) as count FROM checklist", (err, row) => {
                    if (row && row.count === 0) {
                        const items = ['機票與護照', '日幣現金與信用卡', '西瓜卡 (SUICA/NIMOCA)', '行動電源與充電線', '換洗衣物 7 套', '個人常備藥品', '萬用旅行轉接頭', '相機'];
                        items.forEach(item => db.run('INSERT INTO checklist (item_name) VALUES (?)', [item]));
                    }
                });
            }
        });
    }
});

// ==========================================
// API: Settings (設定)
// ==========================================
app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.put('/api/settings', (req, res) => {
    const { total_budget, voyage_date } = req.body;
    db.run('UPDATE settings SET value = ? WHERE key = "total_budget"', [total_budget]);
    db.run('UPDATE settings SET value = ? WHERE key = "voyage_date"', [voyage_date], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

app.get('/api/voyage-status', (req, res) => {
    db.get('SELECT value FROM settings WHERE key="voyage_date"', [], (err, row) => {
        const voyageDate = new Date(row ? row.value : '2026-07-16T00:00:00+08:00');
        const today = new Date();
        const diffDays = Math.ceil((voyageDate - today) / (1000 * 60 * 60 * 24)); 
        res.json({ days_left: diffDays > 0 ? diffDays : 0 });
    });
});

// ==========================================
// API: EXPENSES (金庫記帳系統)
// ==========================================
app.get('/api/expenses', (req, res) => {
    db.all('SELECT * FROM expenses ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/expenses', (req, res) => {
    const { title, amount } = req.body;
    if (!title || !amount) return res.status(400).json({ error: '名稱與金額必填！' });
    db.run('INSERT INTO expenses (title, amount) VALUES (?, ?)', [title, amount], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, amount });
    });
});
app.put('/api/expenses/:id', (req, res) => {
    const { title, amount } = req.body;
    db.run('UPDATE expenses SET title = ?, amount = ? WHERE id = ?', [title, amount, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});
app.delete('/api/expenses/:id', (req, res) => {
    db.run('DELETE FROM expenses WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// API: ITINERARY (航海日誌系統)
// ==========================================
app.get('/api/itinerary/:day', (req, res) => {
    const day = req.params.day || 1;
    db.all('SELECT * FROM itinerary WHERE day_num = ? ORDER BY time_str ASC', [day], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/itinerary', (req, res) => {
    const { day_num, time_str, category, title, description, image_url } = req.body;
    if (!day_num || !title) return res.status(400).json({ error: '天數與景點為必填項目' });
    
    // 如果沒有圖片，給一張預設日本風景相片 (Unsplash Placeholder)
    const finalImage = image_url || 'https://images.unsplash.com/photo-1542051812871-34f21505bB8b?w=800';

    db.run('INSERT INTO itinerary (day_num, time_str, category, title, description, image_url) VALUES (?, ?, ?, ?, ?, ?)', 
        [day_num, time_str, category || '探險', title, description || '', finalImage], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});
app.delete('/api/itinerary/:id', (req, res) => {
    db.run('DELETE FROM itinerary WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// API: CHECKLIST (裝備清單系統)
// ==========================================
app.get('/api/checklist', (req, res) => {
    db.all('SELECT * FROM checklist', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/checklist', (req, res) => {
    const { item_name } = req.body;
    if (!item_name) return res.status(400).json({ error: '裝備名稱必填' });
    db.run('INSERT INTO checklist (item_name) VALUES (?)', [item_name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, item_name, is_packed: 0 });
    });
});
app.put('/api/checklist/:id', (req, res) => {
    const { is_packed } = req.body;
    db.run('UPDATE checklist SET is_packed = ? WHERE id = ?', [is_packed ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});
app.delete('/api/checklist/:id', (req, res) => {
    db.run('DELETE FROM checklist WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`🚀 千陽號大結局伺服器已啟動 (支援所有航線與清單): http://localhost:${port}`);
});
