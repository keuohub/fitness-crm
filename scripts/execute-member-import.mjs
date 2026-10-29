import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryNames = {
  1: '精品普拉提',
  2: '高定大器械',
  3: '维密超模班',
  4: '私教',
  5: '瑜伽'
};

function parseCompanionDate(raw, seq, name) {
  if (!raw) return { date: null, note: '保持原有默认日期' };
  raw = raw.trim();
  if (['无', '没有时间', '没时间', '未查到', '不知道时间', '没写时间'].includes(raw)) {
    return { date: null, note: '保持原有默认日期' };
  }
  if (raw === '教练') {
    return { date: null, note: '教练账号(不设会员天数)' };
  }
  if (raw === '已写') {
    if (seq === 88) return { date: '2021-01-26', note: '引用M00030入会日 2021-01-26' };
    if (seq === 215) return { date: null, note: '独立会员，保持默认日期' };
    return { date: null, note: '保持默认' };
  }
  if (raw === '任学凤已写') {
    return { date: '2026-03-13', note: '引用任学凤入会日 2026-03-13' };
  }
  if (/^\d{4}$/.test(raw)) {
    return { date: `${raw}-06-01`, note: `年无月日 -> 按6月1日计 (${raw}-06-01)` };
  }
  if (/^(\d{1,2})[\.\-\/](\d{1,2})$/.test(raw)) {
    const m = raw.match(/^(\d{1,2})[\.\-\/](\d{1,2})$/);
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    return { date: `2026-${mm}-${dd}`, note: `无年 -> 按今年计 (2026-${mm}-${dd})` };
  }
  if (/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/.test(raw)) {
    const m = raw.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/);
    const yyyy = m[1];
    const mm = m[2].padStart(2, '0');
    const dd = m[3].padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, note: `标准转换 (${yyyy}-${mm}-${dd})` };
  }
  return { date: null, note: `未识别 -> 保持默认` };
}

function getCourseCategoryIds(cardName) {
  const ids = new Set();
  const lower = cardName;

  const isAllInclusive = lower.includes('一卡通') || lower.includes('辣妹卡') || lower.includes('198') || lower.includes('199') || (lower.includes('年卡') && !lower.includes('瑜伽') && !lower.includes('维密') && !lower.includes('普拉提'));

  if (isAllInclusive) {
    ids.add(1); ids.add(2); ids.add(3); ids.add(5);
  }

  if (lower.includes('普拉提') || lower.includes('普')) ids.add(1);
  if (lower.includes('大器械') || lower.includes('+大')) ids.add(2);
  if (lower.includes('维密') || lower.includes('+维')) ids.add(3);
  if (lower.includes('私教')) ids.add(4);
  if (lower.includes('瑜伽')) ids.add(5);

  if (ids.size === 0) {
    if (lower.includes('教培')) {
      ids.add(1); ids.add(2); ids.add(3); ids.add(5);
    } else {
      ids.add(1);
    }
  }

  return Array.from(ids).sort();
}

const DEFAULT_198_SESSIONS = parseInt(process.env.SESSIONS_198 || '2', 10);

async function executeImport() {
  const data = JSON.parse(fs.readFileSync('/tmp/excel_members.json', 'utf8'));
  console.log(`[Import] 开始执行真实数据库导入，总会员行数: ${data.length}`);

  const client = await pool.connect();

  try {
    // 1. 备份当前数据状态到本地 JSON 文件
    console.log('[Import] 步骤 1: 备份现有数据库状态...');
    const membersBefore = await client.query('SELECT id, member_code, name, phone, portal_code, joined_at, login_pin FROM members ORDER BY id');
    const cardsBefore = await client.query('SELECT * FROM member_cards ORDER BY id');
    const cardTypesBefore = await client.query('SELECT * FROM card_types ORDER BY id');
    const cardCoursesBefore = await client.query('SELECT * FROM card_type_courses ORDER BY id');

    const backupDir = '/Users/qiao/Documents/徕舞工作/fitness-crm/backups';
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = `${backupDir}/backup_before_member_import_${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      members: membersBefore.rows,
      member_cards: cardsBefore.rows,
      card_types: cardTypesBefore.rows,
      card_type_courses: cardCoursesBefore.rows
    }, null, 2));
    console.log(`[Import] 备份完成 -> ${backupFile}`);

    await client.query('BEGIN');

    // 缓存现有会员、卡种与课种权限
    const dbRes = await client.query('SELECT id, member_code, name, phone, portal_code, joined_at FROM members');
    const dbByCode = new Map(dbRes.rows.map(m => [m.member_code, m]));
    const dbByPortal = new Map(dbRes.rows.map(m => [m.portal_code, m]));

    // 辅助函数：根据名称与分类获取或创建 card_types 并绑定 card_type_courses
    const cardTypeCache = new Map();
    const existingCtRes = await client.query('SELECT id, name, category FROM card_types');
    for (const ct of existingCtRes.rows) {
      cardTypeCache.set(`${ct.name}_${ct.category}`, ct.id);
    }

    async function getOrCreateCardTypeId(name, category, courseCategoryIds, validityDays = 365, totalCount = null) {
      const key = `${name}_${category}`;
      if (cardTypeCache.has(key)) {
        const ctId = cardTypeCache.get(key);
        for (const ccId of courseCategoryIds) {
          await client.query(`
            INSERT INTO card_type_courses (card_type_id, course_category_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [ctId, ccId]);
        }
        return ctId;
      }

      // 创建新的 card_types 记录
      const insRes = await client.query(`
        INSERT INTO card_types (tenant_id, name, category, price_cents, validity_days, weekly_limit, total_count, freeze_allowed, transfer_allowed, is_active, sort_order)
        VALUES (1, $1, $2, 0, $3, null, $4, 0, 0, 1, 99)
        RETURNING id
      `, [name, category, category === 'period' ? validityDays : null, category === 'count' ? totalCount : null]);

      const newId = insRes.rows[0].id;
      cardTypeCache.set(key, newId);
      console.log(`[CardType] 新增卡种: id=${newId}, name="${name}", category="${category}"`);

      for (const ccId of courseCategoryIds) {
        await client.query(`
          INSERT INTO card_type_courses (card_type_id, course_category_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [newId, ccId]);
      }
      return newId;
    }

    // 2. 批量更新相伴天数 (joined_at)
    console.log('[Import] 步骤 2: 批量更新相伴天数 (joined_at)...');
    const updateItems = [];
    for (const r of data) {
      const member = dbByCode.get(r.member_code) || dbByPortal.get(r.portal_code);
      if (!member) continue;

      const parsedComp = parseCompanionDate(r.companion_raw, r.seq, r.name);
      if (parsedComp.date) {
        updateItems.push({ id: member.id, date: parsedComp.date });
      }
    }

    if (updateItems.length > 0) {
      // 批量更新提高速度
      for (const item of updateItems) {
        await client.query(`
          UPDATE members
          SET joined_at = $1, updated_at = NOW()
          WHERE id = $2
        `, [item.date, item.id]);
      }
    }
    console.log(`[Import] 相伴天数更新成功，共更新 ${updateItems.length} 位会员。`);

    // 3. 构建待入库会员卡列表
    console.log('[Import] 步骤 3: 构建会员卡列表并入库...');
    const cardInserts = [];

    for (const r of data) {
      const member = dbByCode.get(r.member_code) || dbByPortal.get(r.portal_code);
      if (!member) continue;

      const cardName = r.card_name.trim();
      const remCount = r.remaining_count.trim();
      const totalCount = r.total_count.trim();
      const comp = r.companion_raw.trim();
      const parsedComp = parseCompanionDate(r.companion_raw, r.seq, r.name);

      if (comp === '教练' || ['曹老师', '左左', '汪红莲'].includes(r.name)) continue;
      if (!cardName) continue;
      if (['已完结', '已上完'].includes(remCount) || ['已完结', '已上完'].includes(r.valid_until.trim())) continue;
      if (cardName === '没查到' || cardName.includes('过期')) continue;

      // Special: 198 / 199 / 辣妹卡198 (49 人)
      if (['198卡', '199卡', '辣妹卡198', '198'].includes(cardName)) {
        const joinDate = parsedComp.date || member.joined_at || '2026-10-17';
        const fromParts = String(joinDate).slice(0, 10).split('-').map(Number);
        const untilDate = `${fromParts[0] + 1}-${String(fromParts[1]).padStart(2, '0')}-${String(fromParts[2]).padStart(2, '0')}`;
        
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: cardName === '198' ? '198卡' : cardName,
          category: 'count',
          totalCount: DEFAULT_198_SESSIONS,
          remCount: DEFAULT_198_SESSIONS,
          validFrom: String(joinDate).slice(0, 10),
          validUntil: untilDate,
          courses: getCourseCategoryIds(cardName),
          seq: r.seq
        });
        continue;
      }

      // Special: 刘伟 (seq 236)
      if (r.seq === 236) {
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: '维密年卡',
          category: 'period',
          totalCount: null,
          remCount: null,
          validFrom: '2025-11-19',
          validUntil: '2026-11-19',
          courses: getCourseCategoryIds('维密年卡'),
          seq: r.seq + '_1'
        });
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: '普拉提次卡',
          category: 'count',
          totalCount: 23,
          remCount: 23,
          validFrom: null,
          validUntil: null,
          courses: getCourseCategoryIds('普拉提'),
          seq: r.seq + '_2'
        });
        continue;
      }

      // Special: 龚雪芬 (seq 157)
      if (r.seq === 157) {
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: '普拉提年卡',
          category: 'period',
          totalCount: null,
          remCount: null,
          validFrom: '2026-03-12',
          validUntil: '2027-03-12',
          courses: getCourseCategoryIds('普拉提'),
          seq: r.seq
        });
        continue;
      }

      // Special: 付雯 (seq 222)
      if (r.seq === 222) {
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: '普拉提+维密一卡通',
          category: 'period',
          totalCount: null,
          remCount: null,
          validFrom: '2026-06-30',
          validUntil: '2027-06-30',
          courses: getCourseCategoryIds('普拉提+维密一卡通'),
          seq: r.seq
        });
        continue;
      }

      // Special: 周定会 (seq 226)
      if (r.seq === 226) {
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: '维密年卡',
          category: 'period',
          totalCount: null,
          remCount: null,
          validFrom: '2025-11-09',
          validUntil: '2026-11-09',
          courses: getCourseCategoryIds('维密年卡'),
          seq: r.seq
        });
        continue;
      }

      // Special: 祝小燕 (177) & 李兰芳 (178) 瑜伽终身卡
      if (cardName === '瑜伽终身卡') {
        cardInserts.push({
          memberId: member.id,
          memberCode: member.member_code,
          name: member.name,
          cardName: '瑜伽终身卡',
          category: 'period',
          totalCount: null,
          remCount: null,
          validFrom: '2026-01-01',
          validUntil: '2099-12-31',
          courses: getCourseCategoryIds('瑜伽终身卡'),
          seq: r.seq
        });
        continue;
      }

      // 常规卡种
      let category = r.category.trim();
      if (category.includes('年') || cardName.includes('年卡') || cardName.includes('月卡') || cardName.includes('终身')) {
        category = 'period';
      } else {
        category = 'count';
      }

      let parsedTotal = null;
      let parsedRem = null;
      let validFrom = r.valid_from ? r.valid_from.replace(/\./g, '-') : null;
      let validUntil = r.valid_until ? r.valid_until.replace(/\./g, '-') : null;

      if (category === 'count') {
        if (/^\d+$/.test(remCount)) {
          parsedRem = parseInt(remCount, 10);
        } else if (remCount.includes('节') && /^\d+/.test(remCount)) {
          parsedRem = parseInt(remCount, 10);
        } else if (remCount === '未开卡' || remCount === '未上') {
          parsedRem = /^\d+$/.test(totalCount) ? parseInt(totalCount, 10) : 60;
        } else if (remCount === '2期') {
          parsedRem = 20;
        } else if (remCount === '剩下一期') {
          parsedRem = 10;
        } else {
          const m = cardName.match(/(\d+)节/);
          if (m) {
            parsedRem = parseInt(m[1], 10);
          } else {
            parsedRem = 10;
          }
        }

        if (/^\d+$/.test(totalCount)) {
          parsedTotal = parseInt(totalCount, 10);
        } else {
          parsedTotal = parsedRem;
        }
      } else {
        if (!validFrom) validFrom = '2026-06-01';
        if (!validUntil) validUntil = '2027-06-01';
      }

      cardInserts.push({
        memberId: member.id,
        memberCode: member.member_code,
        name: member.name,
        cardName: cardName,
        category: category,
        totalCount: parsedTotal,
        remCount: parsedRem,
        validFrom: validFrom,
        validUntil: validUntil,
        courses: getCourseCategoryIds(cardName),
        seq: r.seq
      });
    }

    console.log(`[Import] 共准备插入 ${cardInserts.length} 张会员卡...`);

    let insertedCardCount = 0;
    for (const card of cardInserts) {
      const cardTypeId = await getOrCreateCardTypeId(card.cardName, card.category, card.courses, 365, card.totalCount);
      const idempotencyKey = `import_20261029_${card.memberId}_${card.seq}`;
      const purchasedAt = card.validFrom || '2026-10-29';

      await client.query(`
        INSERT INTO member_cards (
          tenant_id, member_id, card_type_id, status, total_count, remaining_count,
          valid_from, valid_until, purchased_at, price_cents, created_at, updated_at, idempotency_key
        )
        VALUES (
          1, $1, $2, 'active', $3, $4,
          $5, $6, $7, 0, NOW(), NOW(), $8
        )
        ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE
        SET remaining_count = EXCLUDED.remaining_count,
            total_count = EXCLUDED.total_count,
            valid_from = EXCLUDED.valid_from,
            valid_until = EXCLUDED.valid_until,
            status = 'active',
            updated_at = NOW()
      `, [
        card.memberId,
        cardTypeId,
        card.totalCount,
        card.remCount,
        card.validFrom,
        card.validUntil,
        purchasedAt,
        idempotencyKey
      ]);

      insertedCardCount++;
    }

    console.log(`[Import] 会员卡入库成功，共写入 ${insertedCardCount} 张会员卡。`);

    await client.query('COMMIT');
    console.log('[Import] 事务提交完成 (COMMIT SUCCESSFUL)!');

    // 4. 数据回归校验
    console.log('\n[Verify] 步骤 4: 数据库回归校验...');
    const memberTotalRes = await client.query('SELECT count(*) FROM members');
    const memberWithJoinDate = await client.query('SELECT count(*) FROM members WHERE joined_at IS NOT NULL');
    const cardTotalRes = await client.query('SELECT count(*) FROM member_cards');
    const cardTypesTotalRes = await client.query('SELECT count(*) FROM card_types');

    console.log(`总会员数: ${memberTotalRes.rows[0].count}`);
    console.log(`带相伴入会日会员数: ${memberWithJoinDate.rows[0].count}`);
    console.log(`总有效会员卡数: ${cardTotalRes.rows[0].count}`);
    console.log(`系统卡种数: ${cardTypesTotalRes.rows[0].count}`);

    // 抽样验证 4 位典型会员
    console.log('\n[Verify] 抽样验证典型会员状态:');
    const sampleCodes = ['5BC82C2B', 'LW9021', 'N9GFVJ5P', 'LW8962'];
    for (const code of sampleCodes) {
      const mRes = await client.query(`
        SELECT m.name, m.member_code, m.joined_at, mc.id AS card_id, ct.name AS card_name, ct.category, mc.remaining_count, mc.valid_until
        FROM members m
        LEFT JOIN member_cards mc ON mc.member_id = m.id
        LEFT JOIN card_types ct ON ct.id = mc.card_type_id
        WHERE m.member_code = $1
      `, [code]);
      console.log(`会员 [${code}]:`, mRes.rows);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Import] 发生错误，已回滚事务 (ROLLBACK)!', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

executeImport().catch(console.error);
