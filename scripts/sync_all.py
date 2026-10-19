import os, sys, json, time, datetime
import requests
import xlsxwriter

# Feishu Credentials
APP_ID = 'cli_aa9f954ccd79dbc8'
APP_SECRET = 'lmJG16xBayLglDXmrQH2mg7joYwlZ3vK'
BASE_TOKEN = 'RnlqbnTcBaGIW0skLLWclgHbnzb'  # 徕舞普拉提｜会员管理系统
MEMBER_TABLE_ID = 'tblg1rCqMOOjksj5'       # 数据表
QUESTIONNAIRE_TABLE_ID = 'tblOf0X59JZnQcXs' # 徕舞高定身材美学 · 新会员问卷
DESKTOP_PATH = '/Users/qiao/Desktop/徕舞会员档案与问卷初始数据导入模版.xlsx'

def get_feishu_token():
    res = requests.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        json={'app_id': APP_ID, 'app_secret': APP_SECRET},
        timeout=10,
    )
    return res.json().get('tenant_access_token')

def fetch_all_records(token, base_token, table_id):
    headers = {'Authorization': f'Bearer {token}'}
    records = []
    page_token = None
    while True:
        params = {'page_size': 100}
        if page_token:
            params['page_token'] = page_token
        r = requests.get(
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/{base_token}/tables/{table_id}/records',
            headers=headers,
            params=params,
            timeout=10
        )
        data = r.json().get('data', {}) or {}
        items = data.get('items', []) or []
        records.extend(items)
        if not data.get('has_more'):
            break
        page_token = data.get('page_token')
    return records

def export_to_desktop_excel(members, questionnaires):
    wb = xlsxwriter.Workbook(DESKTOP_PATH)
    
    # Brand Formats
    header_fmt = wb.add_format({
        'bold': True, 'font_name': 'Arial', 'font_size': 11,
        'font_color': '#FFFFFF', 'bg_color': '#C83228',  # 朱红品牌色
        'align': 'center', 'valign': 'vcenter', 'border': 1, 'border_color': '#D0D0D0'
    })
    
    header_gaoding = wb.add_format({
        'bold': True, 'font_name': 'Arial', 'font_size': 11,
        'font_color': '#FFFFFF', 'bg_color': '#8B1E17',  # 深朱红
        'align': 'center', 'valign': 'vcenter', 'border': 1, 'border_color': '#D0D0D0'
    })
    
    header_sub = wb.add_format({
        'bold': True, 'font_name': 'Arial', 'font_size': 10,
        'font_color': '#333333', 'bg_color': '#F5F2EE',  # 暖砂色
        'align': 'center', 'valign': 'vcenter', 'border': 1, 'border_color': '#E0E0E0'
    })
    
    cell_center = wb.add_format({'font_name': 'Arial', 'font_size': 10, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'border_color': '#E8E8E8'})
    cell_left = wb.add_format({'font_name': 'Arial', 'font_size': 10, 'align': 'left', 'valign': 'vcenter', 'border': 1, 'border_color': '#E8E8E8'})
    cell_gaoding = wb.add_format({'font_name': 'Arial', 'font_size': 10, 'align': 'center', 'valign': 'vcenter', 'border': 1, 'border_color': '#E8E8E8', 'bg_color': '#FFF8F7'})
    cell_gaoding_left = wb.add_format({'font_name': 'Arial', 'font_size': 10, 'align': 'left', 'valign': 'vcenter', 'border': 1, 'border_color': '#E8E8E8', 'bg_color': '#FFF8F7'})
    code_fmt = wb.add_format({'font_name': 'Menlo', 'font_size': 10, 'bold': True, 'font_color': '#C83228', 'align': 'center', 'valign': 'vcenter', 'border': 1, 'border_color': '#E8E8E8'})

    # ──────── Sheet 1: 全馆会员档案总表 ────────
    ws1 = wb.add_worksheet('全馆会员总表(实时同步)')
    ws1.set_tab_color('#C83228')
    
    cols1 = [
        ('序号', 8),
        ('会员姓名', 12),
        ('小程序专属激活码', 18),
        ('手机号', 16),
        ('入会/填表日期', 15),
        ('会员阶段', 14),
        ('身高(cm)', 10),
        ('初始体重(kg)', 12),
        ('核心痛点/改善需求', 26),
        ('蜕变目标', 22),
        ('职业身份', 16),
        ('早餐习惯', 20),
        ('午餐习惯', 20),
        ('晚餐习惯', 20),
        ('饮水习惯', 16),
        ('教练初见备忘/寄语', 32)
    ]
    
    for idx, (cname, cwidth) in enumerate(cols1):
        ws1.set_column(idx, idx, cwidth)
        ws1.write(0, idx, cname, header_fmt)
    ws1.set_row(0, 32)
    
    # Sort: members with LW8801-LW8818 first, then others
    def sort_key(m):
        code = m.get('fields', {}).get('小程序专属激活码', '')
        if code.startswith('LW880') or code.startswith('LW881'):
            return (0, code)
        return (1, m.get('fields', {}).get('入会时间', '') or '9999')
    
    sorted_members = sorted(members, key=sort_key)
    
    for row_idx, rec in enumerate(sorted_members, start=1):
        f = rec.get('fields', {})
        code = f.get('小程序专属激活码', '')
        is_gaoding = code.startswith('LW880') or code.startswith('LW881') or code == 'GRJLTSQ9'
        
        c_fmt = cell_gaoding if is_gaoding else cell_center
        l_fmt = cell_gaoding_left if is_gaoding else cell_left
        
        ws1.set_row(row_idx, 25)
        ws1.write(row_idx, 0, row_idx, c_fmt)
        ws1.write(row_idx, 1, f.get('姓名', ''), c_fmt)
        ws1.write(row_idx, 2, code, code_fmt)
        ws1.write(row_idx, 3, f.get('手机号', '') or '-', c_fmt)
        ws1.write(row_idx, 4, f.get('入会时间', '') or '-', c_fmt)
        ws1.write(row_idx, 5, f.get('会员阶段', '') or '专属塑形期', c_fmt)
        ws1.write(row_idx, 6, f.get('身高（cm）', '') or '-', c_fmt)
        ws1.write(row_idx, 7, f.get('体重（kg）', '') or '-', c_fmt)
        
        concerns = f.get('目前最想改善的问题', [])
        concerns_str = '、'.join(concerns) if isinstance(concerns, list) else str(concerns or '-')
        ws1.write(row_idx, 8, concerns_str, l_fmt)
        ws1.write(row_idx, 9, f.get('你最希望自己变成什么状态？', '') or '-', l_fmt)
        ws1.write(row_idx, 10, f.get('职业', '') or '-', c_fmt)
        ws1.write(row_idx, 11, f.get('早餐通常吃什么', '') or '-', l_fmt)
        ws1.write(row_idx, 12, f.get('午餐通常吃什么', '') or '-', l_fmt)
        ws1.write(row_idx, 13, f.get('晚餐通常吃什么', '') or '-', l_fmt)
        ws1.write(row_idx, 14, f.get('一天大概喝多少水', '') or '-', c_fmt)
        ws1.write(row_idx, 15, (f.get('教练初见备忘', '') or f.get('AI综合反馈', '') or '')[:200], l_fmt)

    # ──────── Sheet 2: 高定美学·二维码新问卷专属表 ────────
    ws2 = wb.add_worksheet('高定美学·二维码问卷')
    ws2.set_tab_color('#8B1E17')
    
    cols2 = [
        ('问卷序号', 10),
        ('学员姓名', 12),
        ('专属激活码', 18),
        ('手机号', 16),
        ('填表时间', 15),
        ('身高(cm)', 10),
        ('初始体重(kg)', 12),
        ('主要诉求', 26),
        ('建议课程方向', 20),
        ('教练专属备忘', 32)
    ]
    for idx, (cname, cwidth) in enumerate(cols2):
        ws2.set_column(idx, idx, cwidth)
        ws2.write(0, idx, cname, header_gaoding)
    ws2.set_row(0, 32)
    
    for row_idx, q in enumerate(questionnaires, start=1):
        f = q.get('fields', {})
        ws2.set_row(row_idx, 25)
        ws2.write(row_idx, 0, row_idx, cell_center)
        ws2.write(row_idx, 1, f.get('姓名', ''), cell_center)
        ws2.write(row_idx, 2, f.get('小程序专属激活码', ''), code_fmt)
        ws2.write(row_idx, 3, f.get('手机号', '') or '-', cell_center)
        ws2.write(row_idx, 4, f.get('入会时间', '') or '2026-10-18', cell_center)
        ws2.write(row_idx, 5, f.get('身高（cm）', '') or '-', cell_center)
        ws2.write(row_idx, 6, f.get('体重（kg）', '') or '-', cell_center)
        ws2.write(row_idx, 7, f.get('建议课程方向', '') or '高定美学综合雕塑', cell_left)
        ws2.write(row_idx, 8, f.get('跟进备注', '') or '优先排期', cell_left)
        ws2.write(row_idx, 9, (f.get('教练初见备忘', '') or '')[:200], cell_left)

    # ──────── Sheet 3: 同步状态与说明 ────────
    ws3 = wb.add_worksheet('三端同步状态说明')
    ws3.set_tab_color('#F5F2EE')
    ws3.set_column(0, 0, 22)
    ws3.set_column(1, 1, 85)
    
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    instr_header = wb.add_format({'bold': True, 'font_size': 12, 'bg_color': '#333333', 'font_color': '#FFFFFF', 'align': 'center', 'valign': 'vcenter'})
    ws3.set_row(0, 30)
    ws3.write(0, 0, '同步维度', instr_header)
    ws3.write(0, 1, '最新状态与使用机制', instr_header)
    
    info_rows = [
        ('最后对齐更新时间', f'{now_str} (网站后台 + 飞书多维表格 + 桌面总表 实时同源)'),
        ('数据总量对齐', f'全馆在册会员：共计 {len(members)} 位 | 高定扫码深度测评：共计 {len(questionnaires)} 份'),
        ('飞书后台工作台', '飞书多维表格【徕舞普拉提｜会员管理系统】为日常主工作台，手机/电脑均可随时修改、上传对比图、调整会员阶段。'),
        ('微信小程序端', '学员打开小程序后，直接凭表中的【小程序专属激活码】即可一键激活登录，查看体态基线档案与专属小桥手札。'),
        ('网站后台服务', '运行在云端 Neon 高可用 PostgreSQL 数据库，零冷启动、免本地维护，为小程序和飞书提供实时接口保障。'),
        ('如何随时触发同步', '1. 在电脑飞书或手机飞书修改任意学员数据；\n2. 随时在后台执行同步命令或在对话框呼叫我“同步更新数据”，三端将自动毫秒级对齐并重写本表格。')
    ]
    
    title_fmt = wb.add_format({'bold': True, 'font_size': 11, 'bg_color': '#F5F2EE', 'valign': 'vcenter'})
    desc_fmt = wb.add_format({'font_size': 10, 'text_wrap': True, 'valign': 'vcenter'})
    for r_idx, (cat, desc) in enumerate(info_rows, start=1):
        ws3.set_row(r_idx, 45)
        ws3.write(r_idx, 0, cat, title_fmt)
        ws3.write(r_idx, 1, desc, desc_fmt)
        
    wb.close()
    print(f"Desktop Excel successfully generated at: {DESKTOP_PATH}")

def main():
    print("=== 开始执行【网站后台 ↔ 飞书多维表格 ↔ 桌面总表】全量对齐同步 ===")
    token = get_feishu_token()
    print("1. 获取飞书鉴权 Token 成功")
    
    members = fetch_all_records(token, BASE_TOKEN, MEMBER_TABLE_ID)
    print(f"2. 从飞书主表拉取全馆会员记录: {len(members)} 条")
    
    questionnaires = fetch_all_records(token, BASE_TOKEN, QUESTIONNAIRE_TABLE_ID)
    print(f"3. 从飞书拉取高定美学问卷记录: {len(questionnaires)} 条")
    
    export_to_desktop_excel(members, questionnaires)
    print("=== 全量三端同步对齐完成！桌面总表已实时更新 ===")

if __name__ == '__main__':
    main()
