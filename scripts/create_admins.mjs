import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '/Users/qiao/Documents/徕舞工作/fitness-crm/.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const accounts = [
  {
    name: '店面前台',
    username: 'reception',
    pcPassword: 'LaiWu@8888',
    portalCode: '1001',
    virtualPhone: '10000001001',
    mpPin: '888888',
    role: 'owner'
  },
  {
    name: '店长运营',
    username: 'manager',
    pcPassword: 'LaiWu@6666',
    portalCode: '1002',
    virtualPhone: '10000001002',
    mpPin: '666666',
    role: 'owner'
  },
  {
    name: '备用管理',
    username: 'admin2',
    pcPassword: 'LaiWu@2026',
    portalCode: '1003',
    virtualPhone: '10000001003',
    mpPin: '202600',
    role: 'owner'
  }
];

async function createAccounts() {
  for (const acc of accounts) {
    const hash = bcrypt.hashSync(acc.pcPassword, 10);
    
    // 1. users 表
    let userRes = await pool.query('SELECT id FROM users WHERE email = $1', [acc.username]);
    let userId;
    if (userRes.rows.length === 0) {
      const ins = await pool.query(`
        INSERT INTO users (tenant_id, name, email, password_hash, role, is_coach, status, created_at, updated_at)
        VALUES (1, $1, $2, $3, $4, 0, 'active', NOW(), NOW())
        RETURNING id
      `, [acc.name, acc.username, hash, acc.role]);
      userId = ins.rows[0].id;
      console.log('Created user:', acc.name, 'id =', userId);
    } else {
      userId = userRes.rows[0].id;
      await pool.query('UPDATE users SET password_hash = $1, role = $2, status = $3, updated_at = NOW() WHERE id = $4', [hash, acc.role, 'active', userId]);
      console.log('Updated user:', acc.name, 'id =', userId);
    }

    // 2. members 表
    let memRes = await pool.query('SELECT id FROM members WHERE portal_code = $1 OR phone = $2', [acc.portalCode, acc.virtualPhone]);
    let memberId;
    if (memRes.rows.length === 0) {
      const insM = await pool.query(`
        INSERT INTO members (tenant_id, name, phone, portal_code, login_pin, portal_enabled, status, created_at, updated_at)
        VALUES (1, $1, $2, $3, $4, 1, 'active', NOW(), NOW())
        RETURNING id
      `, [acc.name, acc.virtualPhone, acc.portalCode, acc.mpPin]);
      memberId = insM.rows[0].id;
      console.log('Created member:', acc.name, 'id =', memberId);
    } else {
      memberId = memRes.rows[0].id;
      await pool.query(`
        UPDATE members 
        SET name = $1, phone = $2, portal_code = $3, login_pin = $4, portal_enabled = 1, status = 'active', updated_at = NOW()
        WHERE id = $5
      `, [acc.name, acc.virtualPhone, acc.portalCode, acc.mpPin, memberId]);
      console.log('Updated member:', acc.name, 'id =', memberId);
    }

    // 3. manager_accounts 表
    let mgrRes = await pool.query('SELECT id FROM manager_accounts WHERE member_id = $1', [memberId]);
    if (mgrRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO manager_accounts (member_id, user_id, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, 1, NOW(), NOW())
      `, [memberId, userId, acc.role]);
      console.log('Created manager_accounts record for member:', memberId);
    } else {
      await pool.query(`
        UPDATE manager_accounts
        SET user_id = $1, role = $2, is_active = 1, updated_at = NOW()
        WHERE member_id = $3
      `, [userId, acc.role, memberId]);
      console.log('Updated manager_accounts record for member:', memberId);
    }
  }

  await pool.end();
  console.log('All accounts created/updated successfully!');
}

createAccounts().catch(e => { console.error(e); process.exit(1); });
