import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_callout_box(doc, text_paragraphs, title=""):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, "FDF2F4") # Soft warm rose
    
    # Left border only (绛红 4px)
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="single" w:sz="24" w:space="0" w:color="8E1728"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.25
    if title:
        run_t = p.add_run(f"【{title}】\n")
        run_t.font.name = "PingFang SC"
        run_t.font.size = Pt(10.5)
        run_t.font.bold = True
        run_t.font.color.rgb = RGBColor(0x8E, 0x17, 0x28)
    
    for i, line in enumerate(text_paragraphs):
        if i > 0 or title:
            p2 = cell.add_paragraph()
            p2.paragraph_format.space_before = Pt(2)
            p2.paragraph_format.space_after = Pt(2)
            p2.paragraph_format.line_spacing = 1.25
            r = p2.add_run(line)
        else:
            r = p.add_run(line)
        r.font.name = "PingFang SC"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_table(table, col_widths, headers, data_rows, header_bg="8E1728", header_color="FFFFFF"):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    # Header row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], header_bg)
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.name = "PingFang SC"
            run.font.size = Pt(10)
            run.font.bold = True
            run.font.color.rgb = RGBColor(int(header_color[:2], 16), int(header_color[2:4], 16), int(header_color[4:], 16))
            
    # Data rows
    for r_idx, row_data in enumerate(data_rows):
        row_cells = table.add_row().cells
        bg_color = "FDFBFB" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            row_cells[c_idx].width = col_widths[c_idx]
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx > 0 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.line_spacing = 1.2
            for run in p.runs:
                run.font.name = "PingFang SC"
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

def build_laiwu_word_doc(output_path):
    doc = docx.Document()
    
    # Page setup (A4 margins 1 inch)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Set default style fonts
    style = doc.styles['Normal']
    font = style.font
    font.name = 'PingFang SC'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(0x29, 0x2D, 0x35)
    
    # --- 封面与标题区 ---
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(20)
    title_p.paragraph_format.space_after = Pt(6)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_en = title_p.add_run("LAIWU PILATES · BESPOKE SCULPTING\n")
    r_en.font.size = Pt(11)
    r_en.font.bold = True
    r_en.font.color.rgb = RGBColor(0x8E, 0x17, 0x28)
    
    r_title = title_p.add_run("徕舞普拉提女子塑形\n全景操作指南与运营工作手册")
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x1A, 0x1A, 0x1A)
    
    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_p.paragraph_format.space_after = Pt(24)
    r_sub = sub_p.add_run("电脑管理后台（PC Admin）· 手机端教练管家工作台 · 会员端小程序全场景标准指引\n版本：v1.4.1 ｜ 云端服务：crm-055 ｜ 生效时间：2026年11月")
    r_sub.font.size = Pt(10)
    r_sub.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    
    # 分割线
    div_p = doc.add_paragraph()
    div_p.paragraph_format.space_after = Pt(18)
    div_run = div_p.add_run("―" * 48)
    div_run.font.color.rgb = RGBColor(0xDD, 0xDD, 0xDD)
    div_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 快捷登录凭证速查表
    doc.add_heading("核心管理入口与访问凭据速查", level=1)
    cred_table = doc.add_table(rows=1, cols=4)
    format_table(
        cred_table,
        [Inches(1.5), Inches(2.2), Inches(1.4), Inches(1.4)],
        ["平台 / 端口", "访问地址 / 小程序入口", "登录账号 / 标识", "登录密码 / 凭证"],
        [
            ["电脑端管理后台", "https://crm-330905-9-1509862887.sh.run.tcloudbase.com/admin/login", "admin@laiwu.fitness\n(或 admin)", "laiwu2025"],
            ["手机管家工作台", "微信搜索进入小程序 -> 「我的账户」顶部点击黑金卡片", "教练/店长专属绑定手机号", "微信一键免密授权登录"],
            ["会员端小程序", "微信搜「徕舞普拉提女子塑形」或扫门店葵花码", "学员专属卡号 (如 LW8801)", "6位安全PIN码\n(首期统一 888888)"],
            ["官方测试体验账号", "用于微信团队审核与主理人全流程验收体验", "卡号: AUDIT888", "PIN码: 888888\n(内含20节全课种试约课)"]
        ]
    )
    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ================= 第一篇：管理人员操作指南 =================
    doc.add_heading("第一篇：管理人员（店长 / 教练 / 运营）操作指南", level=1)
    
    # 第1章
    doc.add_heading("第一章：团课排期与课程调度管理（排课全流程）", level=2)
    doc.add_paragraph("团课排期是门店业务运转的发动机。系统采用「周循环模板 + 实时单节调整」的双轨机制，确保学员在小程序端始终能平滑浏览未来 7 到 14 天的完整课表。")
    
    create_callout_box(doc, [
        "⚠️ 排课断档预警规则：",
        "门店排课必须保持「至少向前富余 7 天」的连续性。建议主理人或排课老师在每周四 18:00 前，录入下一周的完整课表，杜绝学员进入小程序出现「近期暂无排课」的尴尬冷场。"
    ], "排课核心运营准则")

    doc.add_heading("1. 电脑端后台录入单节新课操作步骤", level=3)
    p_step1 = doc.add_paragraph()
    p_step1.add_run("第一步：登录电脑后台，点击左侧菜单【团课排期】（或进入「业务与运营」模块）；\n")
    p_step1.add_run("第二步：点击页面右上角蓝色的【＋ 新增单节排课】按钮，在右侧滑出的抽屉表单中填写：\n")
    p_step1.add_run("   • 上课日期：选择具体日期（如 2026-11-19）；\n")
    p_step1.add_run("   • 起止时间：精确定位时段（如 10:00 - 11:00，标准课时为 60 分钟）；\n")
    p_step1.add_run("   • 课程体系：从下拉框中选择核心课种（精选普拉提、高定大器械、维密减脂超模班、身心流瑜伽、一对一私教）；\n")
    p_step1.add_run("   • 授课导师：选择带课教练（小桥、何老师、翠翠、曹湘湘、左左、汪老师）；\n")
    p_step1.add_run("   • 教室场地：分配教学区域（普拉提大器械一室、二室、多功能塑形厅、1V1专属私教室）；\n")
    p_step1.add_run("   • 容纳席位：大器械班通常为 6 人（一机一人），超模/瑜伽班为 8-10 人，私教固定 1 人；\n")
    p_step1.add_run("第三步：核对无误后点击【确认发布】。系统将在 1 秒内将该课程推送到线上生产库，所有学员端打开约课列表即时可见。")

    doc.add_heading("2. 手机端教练管家快速排课（随时随地微信开课）", level=3)
    doc.add_paragraph("针对临时加课、私教约课或突发排课调整，老师无需开电脑，手机即可 10 秒开课：\n"
                      "1. 打开「徕舞普拉提女子塑形」微信小程序；\n"
                      "2. 进入第 5 个 Tab【我的账户】，点击顶部黑金卡片【进入手机端管家工作台】；\n"
                      "3. 点击【快速排课】卡片，选择日期、时间、课种与席位，点击【立即发布】即可。")

    doc.add_heading("3. 调课、停课与改期应对 SOP（带自动退课补偿机制）", level=3)
    doc.add_paragraph("若老师因身体不适或场地设备维护需要临时取消课程，操作流程如下：\n"
                      "1. 在后台或手机管家端找到该节课程，点击【取消此节课程】；\n"
                      "2. 系统启动强一致性幂等退款事务：\n"
                      "   • 自动向已预约的所有学员发送微信模版取消提醒；\n"
                      "   • 系统秒级自动将已扣减的课时退回学员的会员卡包，并生成「课程取消原路退回」正向交易流水；\n"
                      "   • 排课席位自动置为已下线，避免新学员误约。")

    doc.add_heading("4. 现场签到名册核对与电话协助退课", level=3)
    doc.add_paragraph("• 课前点名：每节课开课前 10 分钟，老师在手机管家端打开【今日预约名册】，点击对应学员名字后方的【签到】；\n"
                      "• 协助退课：若学员在开课前因突发情况（如堵车、身体不适）电话联系前台请假，老师可在名册后点击【协助取消】。系统自动释放该学员席位（让排队候补的学员约入），并将课时退回卡包。")

    # 第2章
    doc.add_heading("第二章：会员中心与开卡 / 延期 / 停卡管理（客户生命周期）", level=2)
    doc.add_paragraph("徕舞 CRM 系统目前在册管理着 275 位尊贵会员。系统的卡项设计严格遵循轻奢私域体系，一人一卡、权限严密、流水清晰。")

    doc.add_heading("1. 新会员录入建档 SOP", level=3)
    p_m1 = doc.add_paragraph()
    p_m1.add_run("第一步：进入后台【会员中心】（左侧菜单第 5 栏「我的账户 / 会员管理」）；\n")
    p_m1.add_run("第二步：点击页面右上角【＋ 录入新会员】；\n")
    p_m1.add_run("第三步：填写基础资料：真实姓名、手机号码（核心唯一身份鉴别号）、性别（默认女士）、入会日期、体态诉求标签（如圆肩驼背、产后修复、减脂雕刻）；\n")
    p_m1.add_run("第四步：点击【保存会员】。系统将自动生成全局唯一的专属会员编码（如 LW8832）。")

    doc.add_heading("2. 会员专属卡号与 6 位安全 PIN 码机制", level=3)
    doc.add_paragraph("为保障会员隐私并杜绝验证码接收繁琐的问题，系统采用高级专属凭证登录：\n"
                      "• 专属邀请码 / 卡号：即会员编码（如 LW8832）；\n"
                      "• 专属 6 位登录 PIN 码：开卡建档时系统默认设定为手机尾号后 6 位或统一初始码 888888；\n"
                      "• 若学员忘记密码，管理员在后台会员详情页中，点击【重置 PIN 码】即可重设为任意 6 位数字。")

    doc.add_heading("3. 会员开卡 SOP 与课种权限绑定", level=3)
    p_card = doc.add_paragraph()
    p_card.add_run("1. 在会员列表中搜索该学员姓名，点击进入会员详情；\n")
    p_card.add_run("2. 在卡包模块点击【开设新会员卡】；\n")
    p_card.add_run("3. 选择卡种类型：\n")
    p_card.add_run("   • 高定年卡：通常为 365 天有效期，含规定总节数，可约全课种；\n")
    p_card.add_run("   • 季度蜕变卡：通常为 90 天有效期，含 24-36 节；\n")
    p_card.add_run("   • 专项次卡：如「大器械私教10次卡」、「维密超模班20次卡」；\n")
    p_card.add_run("4. 课种权限勾选：根据所购卡项，勾选该卡允许预约的分类（普拉提 / 大器械 / 超模班 / 私教 / 瑜伽）。若未勾选某课种，学员在手机端预约该课程时，系统会温柔拦截提示「如想体验此课程可联系小桥升级卡项」，保护卡项价值！\n")
    p_card.add_run("5. 输入总课时数（如 48 次）及到期日期，点击【确认激活开卡】。")

    doc.add_heading("4. 停卡与有效期顺延处置规范（SOP）", level=3)
    create_callout_box(doc, [
        "📌 严禁直接修改数据库日期！",
        "学员因出差、伤病或产假申请暂停卡项时，必须使用系统的【停卡延期功能】。系统采用不可逆的双向审计流水，既保障学员权益，又杜绝财务与教练手工改账的混乱风险。"
    ], "停卡操作财务与运营准则")
    
    doc.add_paragraph("具体操作步骤：\n"
                      "1. 在会员详情页中找到需要暂停的卡项，点击【办理停卡】；\n"
                      "2. 输入停卡原因（如：出差赴京 14 天、产假休卡 60 天）；\n"
                      "3. 输入停卡天数（如 14 天）；\n"
                      "4. 系统自动计算出新到期日，通过原子事务将卡状态打上标记，并在后台生成一条不可篡改的停卡记录；\n"
                      "5. 学员重新复课后，到期日已自动后延 14 天，卡项自动恢复正常约课。")

    # 第3章
    doc.add_heading("第三章：小程序内容管理（5大 Tab 自由装配与视觉调性）", level=2)
    doc.add_paragraph("后台左侧「小程序内容管理」严格 1:1 对齐手机端的 5 个主要功能页面，所见即所得。")

    doc.add_heading("1. Tab 3【开始约课】首屏大片与分类管理（全新上线功能）", level=3)
    p_bl = doc.add_paragraph()
    p_bl.add_run("这是本次升级的核心重磅板块。主理人拥有对约课首屏 100% 的云端控制权：\n")
    p_bl.add_run("• 自由更换全屏实拍大片：每个课程板块（全部、私教、普拉提、超模班、大器械、瑜伽）都支持上传专属 9:16 高清实拍原图。点击卡片上的【上传新大片】，直接从电脑选取实拍图，系统直通已充值的腾讯云 COS 存储，秒级保存；\n")
    p_bl.add_run("• 自由调整排序：每个分类卡片带有【上移】【下移】按钮和序号框。想把普拉提放在第一位，点击上移即可，手机端垂直胶囊位置实时同步；\n")
    p_bl.add_run("• 自由增删与改名：点击右上角【＋ 新增课程分类】，可添加新特色课（如孕产普拉提、理疗拉伸）；可自由修改分类全称与胶囊简称（2-3字最佳）；\n")
    p_bl.add_run("• 视觉呈现与字体风格控制：\n")
    p_bl.add_run("   - 标题字体：可在「宋体雅致（古典轻奢）」、「现代黑体（极简力量）」与「经典衬线（柔美舒展）」中一键切换；\n")
    p_bl.add_run("   - 胶囊质感：可选择「毛玻璃半透光」、「高级柔白」或「极简实色」；\n")
    p_bl.add_run("   - 专属标语开关：开启后可在主按钮上方展示该课程的诗意副标题；\n")
    p_bl.add_run("• 右侧 iPhone 1:1 动态真机模拟器：改动任何图片、文字或排序，右侧的手机模拟器即刻联动，点击胶囊可直接切换背景预览。")

    doc.add_heading("2. Tab 4【我的蜕变】学员体态对比档案录入 SOP", level=3)
    p_tf = doc.add_paragraph()
    p_tf.add_run("体态对比是普拉提场馆最具说服力的交付资产。系统已彻底清空旧模拟测试图，只留存真实会员照片：\n")
    p_tf.add_run("1. 进入后台【4. 我的蜕变】模块；\n")
    p_tf.add_run("2. 在左侧会员列表中搜索或选择目标学员；\n")
    p_tf.add_run("3. 点击【＋ 录入新体态对比】，上传两张同一角度的大片：\n")
    p_tf.add_run("   • 入学初测照（Before）：选择照片并填写拍摄日期（如 2026-08-15）；\n")
    p_tf.add_run("   • 进阶蜕变照（After）：选择照片并填写定格日期（如 2026-10-25）；\n")
    p_tf.add_run("4. 选择体态角度：正面体态 / 侧面力学 / 背面脊柱；\n")
    p_tf.add_run("5. 撰写教练专业诊断评语：例如「骨盆前倾改善约 6°，肋骨外翻显著收拢，小腹自然收平，锁骨线条与直角肩舒展挺拔」；\n")
    p_tf.add_run("6. 点击保存。该会员打开微信小程序【我的蜕变】页面时，将立即可见自己的真实对比档案！")

    doc.add_heading("3. Tab 2【了解徕舞】四大美学空间与导师阵容维护", level=3)
    doc.add_paragraph("• 场馆空间实景：支持上传多个美学空间的实景照片。每个空间支持多图横向轮播展示，支持拖拽排序与图文介绍；\n"
                      "• 同行导师团队：维护 6 位常驻教练的肖像大片、主攻方向、资质背景与教学心声；\n"
                      "• 课程体系与底图：配置 5 大特色训练体系的训练理念与沉浸式实拍底图。")

    # ================= 第二篇：用户与会员端使用指南 =================
    doc.add_heading("第二篇：用户 / 会员端使用指南（可直接打印或转发学员）", level=1)
    
    doc.add_heading("第一章：微信小程序使用全流程（学员体验篇）", level=2)
    doc.add_paragraph("欢迎来到徕舞普拉提女子塑形专属自律空间。小程序采用极简轻奢美学设计，无需繁琐下载，微信内随时可查、随时可约。")

    doc.add_heading("1. 首次打开与免密漫游体验", level=3)
    doc.add_paragraph("• 微信搜索「徕舞普拉提女子塑形」小程序，或直接扫描门店专属葵花码；\n"
                      "• 首次进入无需强制注册或登录，您可以自由浏览场馆优雅空间大片、了解导师团队资质、查阅未来 7 天公开课程表。")

    doc.add_heading("2. 专属会员档案开启（卡号 + PIN 码一键激活）", level=3)
    p_u_login = doc.add_paragraph()
    p_u_login.add_run("当您准备预约席位或查看个人档案时：\n")
    p_u_login.add_run("1. 点击底部【我的蜕变】或【我的账户】；\n")
    p_u_login.add_run("2. 在专属认证窗口中输入：\n")
    p_u_login.add_run("   • 会员卡号 / 专属邀请码：门店顾问分配给您的专属编码（如 LW8801）；\n")
    p_u_login.add_run("   • 专属 6 位 PIN 码：开卡时绑定的安全码（初始通常为手机尾号后6位或 888888）；\n")
    p_u_login.add_run("3. 点击【开启专属成长手札】。系统将自动记住您的设备，30 天内打开均保持免密登录状态。")

    doc.add_heading("3. 7 天在线约课标准四步法", level=3)
    p_u_book = doc.add_paragraph()
    p_u_book.add_run("第一步【挑分类】：点击底部中间【开始约课】。在全屏实拍画报中，点击竖排胶囊选择您想练的课种（全部、私教、普拉提、超模班、大器械、瑜伽）；\n")
    p_u_book.add_run("第二步【选日期】：在顶部横向日历条上，选择今天至未来 7 天内适合您的训练日程；\n")
    p_u_book.add_run("第三步【查席位】：查看该堂课的授课导师、时段（如 10:00-11:00）、教室与剩余名额（如 6人满班当前剩余2席）；\n")
    p_u_book.add_run("第四步【定席位】：点击【立即预约】。系统自动核销卡包权限，弹出「预约成功」精致通知卡。")

    doc.add_heading("4. 一键写入手机系统日历（智能上课提醒）", level=3)
    doc.add_paragraph("预约成功后，页面将弹出「添加到手机日历」提示：\n"
                      "• 点击【确认添加】，小程序将通过系统级接口，自动将课程时间、教室地点与导师姓名写入您手机的「日历」应用；\n"
                      "• 开课前 2 小时，手机系统日历会自动弹出提醒，防止遗忘缺席。")

    doc.add_heading("5. 预约取消规则与无忧退课说明", level=3)
    create_callout_box(doc, [
        "⏰ 2小时无忧取消机制：",
        "• 开课前 2 小时以上：进入【我的账户】->【我的预约】，点击【取消预约】。席位将瞬间释放给候补会员，您的会员卡课时将由系统秒级自动原路全额回补，无任何扣次惩罚！",
        "• 开课前 2 小时以内：因场地与导师席位已锁定，系统将关闭自助取消通道。如有特殊紧急原因，请直接联系专属顾问小桥协助。"
    ], "约课与退课守则")

    doc.add_heading("6.「我的蜕变」成长档案与体态复盘查阅", level=3)
    p_u_tf = doc.add_paragraph()
    p_u_tf.add_run("点击底部第 4 个 Tab【我的蜕变】，您将拥有专属于自己的数字塑形手札：\n")
    p_u_tf.add_run("• 相伴自律里程碑：记录您与徕舞相伴的真实天数与累计上课总时长；\n")
    p_u_tf.add_run("• 细分课种大盘：清晰查看大器械、超模班、私教各自上了多少节，每一次坚持都可度量；\n")
    p_u_tf.add_run("• 体态高清对比图：点击「正面」「侧面」「背面」标签，查看导师为您拍摄上传的高清体态对比大片，肉眼可见直角肩、马甲线与骨盆中立回正的优雅蜕变；\n")
    p_u_tf.add_run("• 教练专属手记：查阅导师每堂课后留给您的发力点点评与日常生活体态建议。")

    doc.add_heading("7.「我的账户」个人中心管理", level=3)
    doc.add_paragraph("• 会员卡包：查看您的专属绛红质感会员卡、剩余总课时数与到期日期；\n"
                      "• 自主换头像：点击左上角的头像圆圈，可直接从手机相册挑选一张喜爱的照片上传，即刻生成专属个性化自律档案；\n"
                      "• 一键呼叫客服：遇到任何训练疑问，点击【联系客服】直拨主理人电话或扫码加微信。")

    # ================= 第三篇：SOP 与常见问题 FAQ =================
    doc.add_heading("第三篇：门店日常运营标准化时间表与常见问题（FAQ）", level=1)
    
    doc.add_heading("1. 门店管理标准化运营节奏表", level=2)
    sop_table = doc.add_table(rows=1, cols=3)
    format_table(
        sop_table,
        [Inches(1.2), Inches(1.8), Inches(3.5)],
        ["时间节点", "责任岗位", "标准化工作动作（SOP）"],
        [
            ["每日 09:00 前", "早班教练 / 店长", "打开手机管家端，查看今日预约名册，清点各班次席位并准备教室器械。"],
            ["每节课前 10分", "带课导师", "引导学员进场，在管家端完成到课名册点名签到；遇突发请假点击协助取消。"],
            ["每堂课后 30分", "带课导师", "在学员档案中留存课后训练要点笔记；达阶段性课时（如满10次）拍摄体态记录。"],
            ["每周四 18:00 前", "主理人 / 排课老师", "登录电脑管理后台，录入下周完整排课课表，杜绝约课断档。"],
            ["每月 1 日", "店长 / 运营人员", "登录后台「4. 我的蜕变」更新优秀学员体态大片；在「1. 徕舞之星」发布月度心声。"],
            ["每月最后一天", "店长 / 顾问", "进入后台【会员中心】筛选未来 30 天内即将到期的学员名单，开启温馨续卡关怀。"]
        ]
    )
    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    doc.add_heading("2. 常见问题排查与解答（FAQ）", level=2)
    
    faq_items = [
        ("Q1：学员忘记自己的登录 PIN 码怎么办？", 
         "A1：非常简单。店长登录电脑后台【会员中心】，搜索该学员姓名进入详情页，点击卡片上的【重置 PIN 码】，输入新的 6 位数字（如 888888 或学员生日尾号）并保存即可告知学员重新登录。"),
        
        ("Q2：学员预约某门课程时，提示「暂无该课种权限」是怎么回事？", 
         "A2：说明该学员持有的会员卡中，没有勾选此课种的预约权限（例如持有纯瑜伽卡的学员去预约大器械私教课）。如果学员确实办理了全课种通用卡，管理员在后台【会员卡管理】中编辑该卡，勾选对应课种权限后保存即可。"),
        
        ("Q3：为什么后台换了大片图片，手机端有时候没有立刻变？", 
         "A3：请确认手机小程序是否处于最新版。待 1.4.1 正式发布后，小程序已全面接入全动态云端驱动，在手机端顶部下拉刷新即可强制拉取最新配置。若手机断网，系统会自动展示包内高清兜底实拍图。"),
        
        ("Q4：体态对比照片上传有尺寸和大小限制吗？", 
         "A4：支持 JPG / PNG / WEBP 格式，单张图片建议在 5MB 以内。上传时系统会自动进行轻奢调色与微损压缩（保持 9:16 或 3:4 原片质感），同时自动接入腾讯云 COS 对象存储，长期安全保存。"),
        
        ("Q5：学员更换了手机，登录信息会丢失吗？", 
         "A5：不会。所有卡包数据、课时记录、体态档案和约课信息均安全保存在云端数据库中。学员在新手机打开小程序，重新输入卡号和 6 位 PIN 码即可完整恢复所有历史档案。")
    ]
    
    for q, a in faq_items:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(6)
        p_q.paragraph_format.space_after = Pt(2)
        r_q = p_q.add_run(q)
        r_q.font.bold = True
        r_q.font.color.rgb = RGBColor(0x8E, 0x17, 0x28)
        
        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_before = Pt(0)
        p_a.paragraph_format.space_after = Pt(6)
        p_a.paragraph_format.line_spacing = 1.25
        r_a = p_a.add_run(a)
        r_a.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # 底部署名与版权
    fin_p = doc.add_paragraph()
    fin_p.paragraph_format.space_before = Pt(30)
    fin_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_fin = fin_p.add_run("― LAIWU PILATES · 每一个呼吸都是新生的开始 ―\n© 2026 徕舞女子塑形 版权所有 · 数字化赋能团队编制")
    r_fin.font.size = Pt(9)
    r_fin.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    desktop_file = "/Users/qiao/Desktop/徕舞普拉提_小程序与管理后台操作指南_20261109.docx"
    project_file = "/Users/qiao/Documents/徕舞工作/fitness-crm/徕舞普拉提_全景操作指南与运营工作指南.docx"
    build_laiwu_word_doc(desktop_file)
    build_laiwu_word_doc(project_file)
