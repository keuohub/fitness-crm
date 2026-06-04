const Database = require('better-sqlite3');
const db = new Database('fitness.db');
db.exec("INSERT OR IGNORE INTO tenants (id, name, slug) VALUES (1, '徕舞普拉提', 'laiwu')");
console.log('租户已创建');
const rows = db.prepare('SELECT * FROM tenants').all();
console.log('tenants:', JSON.stringify(rows));
db.close();
