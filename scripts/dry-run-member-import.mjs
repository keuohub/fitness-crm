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

// Default sessions for 198/199 can be passed via env or argument
const DEFAULT_198_SESSIONS = parseInt(process.env.SESSIONS_198 || '2', 10);

async function dryRun() {
  const data = JSON.parse(fs.readFileSync('/tmp/excel_members.json', 'utf8'));
  console.log(`=== 徕舞老会员与会员卡 导入试运行 (Dry-Run Preview) ===`);
  console.log(`总读取行数: ${data.length}`);

  const dbRes = await pool.query('SELECT id, member_code, name, phone, portal_code, joined_at FROM members');
  const dbByCode = new Map(dbRes.rows.map(m => [m.member_code, m]));
  const dbByPortal = new Map(dbRes.rows.map(m => [m.portal_code, m]));

  const companionUpdates = [];
  const cardInserts = [];
  const skippedList = [];

  for (const r of data) {
    const member = dbByCode.get(r.member_code) || dbByPortal.get(r.portal_code);
    if (!member) {
      console.error(`FATAL: Member not found in DB: ${r.member_code} ${r.name}`);
      continue;
    }

    // 1. Companion date
    const parsedComp = parseCompanionDate(r.companion_raw, r.seq, r.name);
    if (parsedComp.date && parsedComp.date !== member.joined_at) {
      companionUpdates.push({
        memberId: member.id,
        memberCode: member.member_code,
        name: member.name,
        raw: r.companion_raw,
        newDate: parsedComp.date,
        note: parsedComp.note
      });
    }

    // 2. Card processing
    const cardName = r.card_name.trim();
    const remCount = r.remaining_count.trim();
    const totalCount = r.total_count.trim();
    const comp = r.companion_raw.trim();

    // Coaches
    if (comp === '教练' || ['曹老师', '左左', '汪红莲'].includes(r.name)) {
      skippedList.push({ seq: r.seq, name: r.name, reason: '教练账号 (不开卡)', card: cardName || '-' });
      continue;
    }

    // No card
    if (!cardName) {
      skippedList.push({ seq: r.seq, name: r.name, reason: '未填卡项 (留空不开卡，仅记相伴岁月)', card: '-' });
      continue;
    }

    // Finished / completed
    if (['已完结', '已上完'].includes(remCount) || ['已完结', '已上完'].includes(r.valid_until.trim())) {
      skippedList.push({ seq: r.seq, name: r.name, reason: `已完结/已上完 (${remCount || r.valid_until})`, card: cardName });
      continue;
    }

    // Could not find / expired note
    if (cardName === '没查到' || cardName.includes('过期')) {
      skippedList.push({ seq: r.seq, name: r.name, reason: '卡项注为已过期或未查到', card: cardName });
      continue;
    }

    // Special: 198 / 199 / 辣妹卡198 (49 members) - User requested: do NOT skip!
    if (['198卡', '199卡', '辣妹卡198', '198'].includes(cardName)) {
      const joinDate = parsedComp.date || member.joined_at || '2026-10-17';
      // Calculate 1 year validity from join date
      const fromParts = joinDate.split('-').map(Number);
      const untilDate = `${fromParts[0] + 1}-${String(fromParts[1]).padStart(2, '0')}-${String(fromParts[2]).padStart(2, '0')}`;
      
      cardInserts.push({
        memberId: member.id,
        memberCode: member.member_code,
        name: member.name,
        cardName: cardName === '198' ? '198卡' : cardName,
        category: 'count',
        totalCount: DEFAULT_198_SESSIONS,
        remCount: DEFAULT_198_SESSIONS,
        validFrom: joinDate,
        validUntil: untilDate,
        courses: getCourseCategoryIds(cardName),
        note: `1年有效(至${untilDate})，全团课通用`
      });
      continue;
    }

    // Special: 刘伟 (seq 236) dual cards
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
        courses: getCourseCategoryIds('维密年卡')
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
        courses: getCourseCategoryIds('普拉提')
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
        courses: getCourseCategoryIds('普拉提')
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
        courses: getCourseCategoryIds('普拉提+维密一卡通')
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
        courses: getCourseCategoryIds('维密年卡')
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
        courses: getCourseCategoryIds('瑜伽终身卡')
      });
      continue;
    }

    // Standard card parsing
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
      courses: getCourseCategoryIds(cardName)
    });
  }

  console.log(`\n--- 统计汇总 ---`);
  console.log(`相伴天数需更新人数: ${companionUpdates.length}`);
  console.log(`实际将创建会员卡张数: ${cardInserts.length}`);
  console.log(`跳过不开卡人数: ${skippedList.length}`);

  console.log(`\n--- 跳过不开卡原因汇总 ---`);
  const skipReasons = {};
  for (const s of skippedList) {
    const reasonKey = s.reason.split('(')[0].trim();
    skipReasons[reasonKey] = (skipReasons[reasonKey] || 0) + 1;
  }
  console.table(skipReasons);

  await pool.end();
}

dryRun().catch(console.error);
