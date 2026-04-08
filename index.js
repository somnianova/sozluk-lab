/**
 * @description Ortam değişkenlerini yükler, Express, MySQL ve session modüllerini tanımlar.
 */
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const app = express();

// URL encoded ve JSON verileri ayrıştırılır; public klasöründeki dosyalar sunulur.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

/**
 * @description Session yapılandırması; oturumun gizliliği için secret belirlenir.
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'some-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

/**
 * @description MySQL veritabanına bağlantı oluşturulur.
 */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) console.error('MySQL bağlantısı başarısız:', err);
  else console.log('MySQL bağlantısı başarılı!');
});

/**
 * @description Admin şifresi; ortam değişkeninden alınır veya varsayılan değer kullanılır.
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * @description Admin giriş sayfasını gösterir.
 */
app.get('/admin/login', (req, res) => {
  res.send(`
    <h2>Admin Giriş</h2>
    <form method="POST" action="/admin/login">
      <label>Kullanıcı Adı:</label>
      <input type="text" name="username" /><br><br>
      <label>Şifre:</label>
      <input type="password" name="password" /><br><br>
      <button type="submit">Giriş</button>
    </form>
  `);
});

/**
 * @description Admin giriş bilgilerini kontrol eder; doğru ise oturuma admin bayrağı ekler.
 */
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.send('Başarılı giriş! <a href="/admin.html">Admin Paneline Git</a>');
  } else {
    res.status(401).send('Hatalı kullanıcı adı veya şifre');
  }
});

/**
 * @description Admin doğrulama middleware; oturumda isAdmin varsa devam eder, yoksa hata döner.
 */
function checkAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(403).send('Yetkisiz erişim. Admin girişi yapmalısınız.');
}

/**
 * @description Admin çıkış yapma; oturumu sonlandırır.
 */
app.get('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.send('Çıkış yapıldı! <a href="/admin/login">Admin Giriş</a>');
  });
});

/* ===============================
   Kelime Yönetimi
=============================== */

/**
 * @description /admin/add-word: Admin yetkisi kontrol edildikten sonra kelime verilerini "words" tablosuna ekler.
 */
app.post('/admin/add-word', checkAdmin, (req, res) => {
  const { word, origin, frequency_tags, audio_url } = req.body;
  if (!word) {
    return res.status(400).send('Kelime zorunlu!');
  }
  const insertWord = `
    INSERT INTO words (word, origin, frequency_tags, audio_url)
    VALUES (?,?,?,?)
  `;
  db.query(insertWord, [word, origin, frequency_tags, audio_url], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Kelime eklerken hata oluştu!');
    }
    res.send('Kelime eklendi! <a href="/admin.html">Admin Panel</a>');
  });
});

/* ===============================
   Full-Text Arama
=============================== */

/**
 * @description /search: Kelime ve definition alanlarında full-text arama yapar, sonuçları HTML olarak döner.
 */
app.get('/search', (req, res) => {
  const q = req.query.kelime || '';
  if (!q) return res.send('Arama ifadesi boş!');

  const sql = `
    SELECT w.id AS word_id, w.word, w.origin,
           d.id AS def_id, d.definition_text, d.example_sentence,
           MATCH(w.word) AGAINST(? IN NATURAL LANGUAGE MODE) AS scoreW,
           MATCH(d.definition_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS scoreD
    FROM words w
    JOIN definitions d ON w.id = d.word_id
    WHERE MATCH(w.word) AGAINST(? IN NATURAL LANGUAGE MODE)
       OR MATCH(d.definition_text) AGAINST(? IN NATURAL LANGUAGE MODE)
    ORDER BY (scoreW + scoreD) DESC
  `;

  db.query(sql, [q, q, q, q], (err, rows) => {
    if (err) {
      console.error(err);
      return res.send('Arama hatası: ' + err.message);
    }
    if (!rows.length) return res.send(`"${q}" için sonuç yok.`);

    let html = `<h2>Arama Sonuçları: "${q}"</h2>`;
    rows.forEach(r => {
      const score = (r.scoreW + r.scoreD).toFixed(2);
      html += `
        <p>
          <strong>${r.word}</strong> (köken: ${r.origin || '---'})
          <br>${r.definition_text || ''}
          ${
            r.example_sentence
              ? `<div style="white-space: pre-line; margin-left:20px; font-style:italic;">
                  ${r.example_sentence}
                 </div>`
              : ''
          }
          <br>Skor: ${score}
        </p><hr>
      `;
    });
    res.send(html);
  });
});

/* ===============================
   Dashboard & Sayfalama
=============================== */

/**
 * @description /admin/last-words: Admin dashboard için son 10 kelime ve ilgili definition'ları döner.
 */
app.get('/admin/last-words', checkAdmin, (req, res) => {
  const q = `
    SELECT w.id, w.word, d.definition_text
    FROM words w
    JOIN definitions d ON w.id = d.word_id
    ORDER BY w.id DESC
    LIMIT 10
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB hata last-words' });
    res.json(rows);
  });
});

/**
 * @description /admin/words: Kelimeleri sayfalama ve sıralama seçenekleriyle döner.
 */
app.get('/admin/words', checkAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const sortParam = req.query.sort || 'id_desc';

  let orderBy = 'id DESC';
  if (sortParam === 'id_asc') orderBy = 'id ASC';
  else if (sortParam === 'word_asc') orderBy = 'word ASC';
  else if (sortParam === 'word_desc') orderBy = 'word DESC';

  const offset = (page - 1) * limit;

  const countQ = 'SELECT COUNT(*) as totalCount FROM words';
  db.query(countQ, (errCount, cRows) => {
    if (errCount) {
      console.error(errCount);
      return res.status(500).json({ error: 'DB hata (count words)' });
    }
    const totalCount = cRows[0].totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    const mainQ = `
      SELECT id, word, origin, frequency_tags, audio_url
      FROM words
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    db.query(mainQ, [limit, offset], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB hata (paging words)' });
      }
      res.json({
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        data: rows
      });
    });
  });
});

/**
 * @description /admin/words/:id: Belirtilen kelime verilerini ve (varsa) ilk definition bilgisini döner.
 */
app.get('/admin/words/:id', checkAdmin, (req, res) => {
  const wId = req.params.id;
  db.query('SELECT * FROM words WHERE id=?', [wId], (err, wRows) => {
    if (err) return res.status(500).json({ error: 'words hata' });
    if (!wRows.length) return res.status(404).json({ error: 'Kelime yok' });

    db.query('SELECT id AS definition_id, word_id, definition_text, example_sentence, part_of_speech, sense_number, sub_letter, sense_label FROM definitions WHERE word_id=? ORDER BY sense_number, sense_label', [wId], (err2, dRows) => {
      if (err2) return res.status(500).json({ error: 'defs hata' });

      const result = {
        id: wRows[0].id,
        word: wRows[0].word,
        origin: wRows[0].origin,
        frequency_tags: wRows[0].frequency_tags,
        audio_url: wRows[0].audio_url,
        definitions: dRows
      };
      res.json(result);
    });
  });
});

/**
 * @description /admin/words/:id (PUT): Belirtilen kelimenin genel bilgilerini günceller.
 */
app.put('/admin/words/:id', checkAdmin, (req, res) => {
  const wId = req.params.id;
  const { word, origin, frequency_tags, audio_url } = req.body;

  const updateWord = `
    UPDATE words
    SET word=?, origin=?, frequency_tags=?, audio_url=?
    WHERE id=?
  `;
  db.query(updateWord, [word, origin, frequency_tags, audio_url, wId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'kelime update hata' });
    }
    res.json({ success: true });
  });
});

/* ===============================
   Definition Yönetimi
=============================== */

/**
 * @description /admin/definitions: Definition kayıtlarını sayfalama ve sıralama seçenekleriyle döner.
 */
app.get('/admin/definitions', checkAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const sortParam = req.query.sort || 'definition_id_desc';

  let orderBy = 'd.id DESC';
  if (sortParam === 'definition_id_asc') orderBy = 'd.id ASC';
  else if (sortParam === 'word_asc') orderBy = 'w.word ASC';
  else if (sortParam === 'word_desc') orderBy = 'w.word DESC';

  const offset = (page - 1) * limit;

  const countQ = 'SELECT COUNT(*) as totalCount FROM definitions';
  db.query(countQ, (errCount, cRows) => {
    if (errCount) {
      console.error(errCount);
      return res.status(500).json({ error: 'DB hata (count defs)' });
    }
    const totalCount = cRows[0].totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    const mainQ = `
      SELECT d.id AS definition_id,
             w.id AS word_id,
             w.word,
             d.definition_text,
             d.example_sentence,
             d.part_of_speech,
             d.sense_label
      FROM definitions d
      JOIN words w ON d.word_id = w.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    db.query(mainQ, [limit, offset], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB hata (paging defs)' });
      }
      res.json({
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        data: rows
      });
    });
  });
});

/**
 * @description /admin/definitions/:id (DELETE): Belirtilen definition kaydını siler.
 */
app.delete('/admin/definitions/:id', checkAdmin, (req, res) => {
  const defId = req.params.id;
  db.query('DELETE FROM definitions WHERE id=?', [defId], (err, result) => {
    if (err) return res.status(500).json({ error: 'def silme hata' });
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Definition yok' });
    }
    res.json({ success: true });
  });
});

/**
 * @description /admin/add-definition: Yeni bir definition ekler. Önce, belirtilen kelimenin varlığını kontrol eder.
 */
app.post('/admin/add-definition', checkAdmin, (req, res) => {
  const { word_name, definition_text, example_sentence, part_of_speech, sense_label } = req.body;
  if (!word_name || !definition_text) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  db.query('SELECT id FROM words WHERE word=?', [word_name], (err, wRows) => {
    if (err) return res.status(500).json({ error: 'DB error (word)' });
    if (!wRows.length) {
      return res.status(400).json({ error: `Kelime yok: ${word_name}` });
    }
    const wId = wRows[0].id;
    const insertQ = `
      INSERT INTO definitions
      (word_id, definition_text, example_sentence, part_of_speech, sense_label)
      VALUES (?,?,?,?,?)
    `;
    db.query(insertQ, [wId, definition_text, example_sentence, part_of_speech, sense_label], (err2, result) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ error: 'Definition eklenemedi' });
      }
      res.json({ success: true, insertedId: result.insertId });
    });
  });
});

/**
 * @description /admin/definitions/:id (PUT): Belirtilen definition kaydını günceller.
 */
app.put('/admin/definitions/:id', checkAdmin, (req, res) => {
  const defId = req.params.id;
  const { definition_text, example_sentence, part_of_speech, sense_label } = req.body;

  const updQ = `
    UPDATE definitions
    SET definition_text=?, example_sentence=?, part_of_speech=?, sense_label=?
    WHERE id=?
  `;
  db.query(updQ, [definition_text, example_sentence, part_of_speech, sense_label, defId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Definition update hata' });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Definition yok' });
    }
    res.json({ success: true });
  });
});

/* ===============================
   İlişki Yönetimi
=============================== */

/**
 * @description /admin/relations: Tüm ilişki kayıtlarını azalan ID sırası ile döner.
 */
app.get('/admin/relations', checkAdmin, (req, res) => {
  db.query('SELECT * FROM relations ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'İlişkiler hata' });
    res.json(rows);
  });
});

/**
 * @description /admin/relations/:id (DELETE): Belirtilen ilişki kaydını siler.
 */
app.delete('/admin/relations/:id', checkAdmin, (req, res) => {
  const relId = req.params.id;
  db.query('DELETE FROM relations WHERE id=?', [relId], (err, result) => {
    if (err) return res.status(500).json({ error: 'İlişki silme hata' });
    if (!result.affectedRows) return res.status(404).json({ error: 'İlişki yok' });
    res.json({ success: true });
  });
});

/**
 * @description /admin/relations (POST): Yeni ilişki kaydı ekler. İki kelimenin varlığını kontrol eder.
 */
app.post('/admin/relations', checkAdmin, (req, res) => {
  const { left_word_name, right_word_name, relation_type } = req.body;
  if (!left_word_name || !right_word_name || !relation_type) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  db.query('SELECT id FROM words WHERE word=?', [left_word_name], (err, lr) => {
    if (err) return res.status(500).json({ error: 'DB left hata' });
    if (!lr.length) return res.status(400).json({ error: `Kelime yok: ${left_word_name}` });
    const leftId = lr[0].id;

    db.query('SELECT id FROM words WHERE word=?', [right_word_name], (err2, rr) => {
      if (err2) return res.status(500).json({ error: 'DB right hata' });
      if (!rr.length) return res.status(400).json({ error: `Kelime yok: ${right_word_name}` });
      const rightId = rr[0].id;

      const insQ = 'INSERT INTO relations (left_word_id, right_word_id, relation_type) VALUES (?,?,?)';
      db.query(insQ, [leftId, rightId, relation_type], (err3, result) => {
        if (err3) return res.status(500).json({ error: 'İlişki eklenemedi' });
        res.json({ success: true, insertedId: result.insertId });
      });
    });
  });
});

/* ===============================
   Basit Arama ve API İşlemleri
=============================== */

/**
 * @description /search-like: Kelime ve definition alanlarında LIKE tabanlı arama yapar ve sonuçları JSON olarak döner.
 */
app.get('/search-like', (req, res) => {
  const q = req.query.kelime || '';
  if (!q) return res.json({ results: [] });

  const sql = `
    SELECT w.id AS word_id, w.word, w.origin,
           d.id AS def_id, d.definition_text, d.example_sentence, d.sense_label
    FROM words w
    JOIN definitions d ON w.id = d.word_id
    WHERE w.word LIKE ? OR d.definition_text LIKE ?
    ORDER BY w.word ASC
  `;
  db.query(sql, [`%${q}%`, `%${q}%`], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata (search-like)' });
    }
    res.json({ results: rows });
  });
});

/**
 * @description /api/synonyms: Belirtilen kelime için eş anlamlı (synonym) ilişkilerini döner.
 */
app.get('/api/synonyms', (req, res) => {
  const wordParam = req.query.word;
  if (!wordParam) return res.status(400).json({ error: 'word param yok' });

  db.query('SELECT id FROM words WHERE word=?', [wordParam], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB hata getWordId' });
    if (!rows.length) {
      return res.json({ synonyms: [] });
    }
    const foundId = rows[0].id;

    const rQ = `
      SELECT r.id, r.left_word_id, r.right_word_id,
             w.id AS word_id, w.word AS word_text
      FROM relations r
      JOIN words w
        ON (
          (r.left_word_id=? AND w.id=r.right_word_id)
          OR
          (r.right_word_id=? AND w.id=r.left_word_id)
        )
      WHERE
        (r.left_word_id=? OR r.right_word_id=?)
        AND r.relation_type='synonym'
    `;
    db.query(rQ, [foundId, foundId, foundId, foundId], (err2, relRows) => {
      if (err2) return res.status(500).json({ error: 'DB hata relations' });
      const synonyms = relRows.map(rr => ({
        relation_id: rr.id,
        word_id: rr.word_id,
        word: rr.word_text
      }));
      res.json({ synonyms });
    });
  });
});

/**
 * @description getRelations: Belirtilen kelime ve ilişki türüne göre ilişkili kayıtları döner.
 */
function getRelations(word, relationType, callback) {
  db.query('SELECT id FROM words WHERE word=?', [word], (err, wRows) => {
    if (err) return callback(err);
    if (!wRows.length) return callback(null, []);

    const foundId = wRows[0].id;
    const rQ = `
      SELECT r.id, r.left_word_id, r.right_word_id,
             w.id AS word_id, w.word AS word_text
      FROM relations r
      JOIN words w
        ON (
          (r.left_word_id=? AND w.id=r.right_word_id)
          OR
          (r.right_word_id=? AND w.id=r.left_word_id)
        )
      WHERE
        (r.left_word_id=? OR r.right_word_id=?)
        AND r.relation_type=?
    `;
    db.query(rQ, [foundId, foundId, foundId, foundId, relationType], (err2, rows) => {
      if (err2) return callback(err2);
      const items = rows.map(r => ({
        relation_id: r.id,
        word_id: r.word_id,
        word: r.word_text
      }));
      return callback(null, items);
    });
  });
}

/**
 * @description /api/antonyms: Belirtilen kelime için zıt anlamlı (antonym) ilişkilerini döner.
 */
app.get('/api/antonyms', (req, res) => {
  const w = req.query.word;
  if (!w) return res.status(400).json({ error: 'word param yok' });
  getRelations(w, 'antonym', (err, items) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata antonyms' });
    }
    res.json({ antonyms: items });
  });
});

/**
 * @description /api/idioms: Belirtilen kelime için deyim (idiom) ilişkilerini döner.
 */
app.get('/api/idioms', (req, res) => {
  const w = req.query.word;
  if (!w) return res.status(400).json({ error: 'word param yok' });
  getRelations(w, 'idiom', (err, items) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata idioms' });
    }
    res.json({ idioms: items });
  });
});

/**
 * @description /api/quotes: Belirtilen kelime için alıntı (quote) ilişkilerini döner.
 */
app.get('/api/quotes', (req, res) => {
  const w = req.query.word;
  if (!w) return res.status(400).json({ error: 'word param yok' });
  getRelations(w, 'quote', (err, items) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata quotes' });
    }
    res.json({ quotes: items });
  });
});

/**
 * @description /api/collocations: Belirtilen kelime için eşdizim (collocation) ilişkilerini döner.
 */
app.get('/api/collocations', (req, res) => {
  const w = req.query.word;
  if (!w) return res.status(400).json({ error: 'word param yok' });
  getRelations(w, 'collocation', (err, items) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata collocations' });
    }
    res.json({ collocations: items });
  });
});

/**
 * @description /api/word-family: Belirtilen kelime için kelime ailesi (word_family) ilişkilerini döner.
 */
app.get('/api/word-family', (req, res) => {
  const w = req.query.word;
  if (!w) return res.status(400).json({ error: 'word param yok' });
  getRelations(w, 'word_family', (err, items) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata word_family' });
    }
    res.json({ family: items });
  });
});

/* ===============================
   Harfe Göre Kelime Listesi
=============================== */

/**
 * @description /words-by-letter: Belirtilen harfle başlayan kelimeleri JSON formatında döner.
 */
app.get('/words-by-letter', (req, res) => {
  const letter = req.query.letter || '';
  if (!letter) {
    return res.json({ words: [] });
  }
  const sql = `
    SELECT id, word, origin, frequency_tags, audio_url
    FROM words
    WHERE word LIKE ?
    ORDER BY word ASC
  `;
  db.query(sql, [letter + '%'], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB hata (words-by-letter)' });
    }
    res.json({ words: rows });
  });
});

/* ===============================
   Sunucuyu Başlatma
=============================== */

/**
 * @description Sunucuyu belirtilen port üzerinde başlatır.
 */
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor...`);
});
