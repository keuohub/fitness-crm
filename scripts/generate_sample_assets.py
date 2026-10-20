import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient_image(width, height, color_top, color_bottom, accent_color=None, noise=True):
    base = Image.new("RGB", (width, height), color_top)
    draw = ImageDraw.Draw(base)
    
    # Linear vertical gradient
    for y in range(height):
        ratio = y / float(height)
        r = int(color_top[0] * (1 - ratio) + color_bottom[0] * ratio)
        g = int(color_top[1] * (1 - ratio) + color_bottom[1] * ratio)
        b = int(color_top[2] * (1 - ratio) + color_bottom[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # Optional soft radial highlight
    if accent_color:
        radial = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        rdraw = ImageDraw.Draw(radial)
        cx, cy = width // 2, int(height * 0.42)
        radius = int(width * 0.65)
        for r_dist in range(radius, 0, -8):
            alpha = int(35 * (1 - r_dist / radius))
            rdraw.ellipse([cx - r_dist, cy - r_dist, cx + r_dist, cy + r_dist], fill=(*accent_color, alpha))
        base = Image.alpha_composite(base.convert("RGBA"), radial).convert("RGB")
        
    return base

def draw_luxury_star_card(output_path, name, tag, quote, index_str, theme_colors):
    W, H = 750, 1000
    c_top, c_bot, c_acc = theme_colors
    img = create_gradient_image(W, H, c_top, c_bot, c_acc)
    
    # Decorative subtle frame
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    # Thin gold leaf inner border
    d.rectangle([28, 28, W - 28, H - 28], outline=(212, 175, 55, 60), width=1)
    d.rectangle([34, 34, W - 34, H - 34], outline=(255, 245, 235, 30), width=1)
    
    # Corner ornaments
    corner_size = 18
    for (cx, cy) in [(34, 34), (W - 34, 34), (34, H - 34), (W - 34, H - 34)]:
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(212, 175, 55, 140))
        
    # Silhouette & Organic curve representing serene human movement / poise
    for step in range(25):
        alpha = int(12 + step * 1.5)
        curve_y = int(H * 0.48)
        d.arc([int(W*0.15) - step*2, int(H*0.18) - step*2, int(W*0.85) + step*2, int(H*0.78) + step*2], 
              start=20, end=160, fill=(240, 220, 200, alpha), width=3)
        d.arc([int(W*0.22) + step, int(H*0.25) + step, int(W*0.78) - step, int(H*0.72) - step], 
              start=190, end=330, fill=(212, 175, 55, alpha), width=2)
    
    # Center artistic seal / emblem
    emblem_y = int(H * 0.38)
    d.ellipse([W//2 - 90, emblem_y - 90, W//2 + 90, emblem_y + 90], outline=(212, 175, 55, 70), width=1)
    d.ellipse([W//2 - 76, emblem_y - 76, W//2 + 76, emblem_y + 76], outline=(255, 255, 255, 40), width=1)
    
    # Subtle geometric core / flower of movement
    d.line([W//2, emblem_y - 45, W//2, emblem_y + 45], fill=(212, 175, 55, 120), width=2)
    d.line([W//2 - 45, emblem_y, W//2 + 45, emblem_y], fill=(212, 175, 55, 120), width=2)
    d.ellipse([W//2 - 12, emblem_y - 12, W//2 + 12, emblem_y + 12], fill=(212, 175, 55, 180))

    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    
    # Save optimized JPEG
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "JPEG", quality=92)
    print(f"Generated: {output_path}")

def draw_venue_card(output_path, title, theme_colors):
    W, H = 800, 500
    c_top, c_bot, c_acc = theme_colors
    img = create_gradient_image(W, H, c_top, c_bot, c_acc)
    
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    # Architectural linear perspective representing serene studio space
    d.rectangle([24, 24, W - 24, H - 24], outline=(255, 245, 235, 45), width=1)
    
    # Perspective beams / wood slat texture lines
    for i in range(12):
        x = 60 + i * 58
        d.line([(x, 60), (int(W * 0.3) + i * 16, H - 60)], fill=(255, 235, 215, 18), width=1)
        
    # Light beam across the floor
    d.polygon([(int(W*0.45), 24), (int(W*0.75), 24), (W - 24, H - 24), (int(W*0.2), H - 24)], fill=(255, 245, 230, 20))

    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "JPEG", quality=92)
    print(f"Generated: {output_path}")

def draw_team_card(output_path, name, role, theme_colors):
    W, H = 600, 750
    c_top, c_bot, c_acc = theme_colors
    img = create_gradient_image(W, H, c_top, c_bot, c_acc)
    
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    d.rectangle([20, 20, W - 20, H - 20], outline=(212, 175, 55, 50), width=1)
    
    # Soft portrait circular spotlight
    cx, cy = W // 2, int(H * 0.42)
    for r in range(160, 40, -10):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 240, 225, int(15 * (1 - r/160))))
        
    # Elegant bust silhouette
    d.ellipse([cx - 55, cy - 110, cx + 55, cy], fill=(45, 30, 32, 160)) # Head
    d.arc([cx - 130, cy - 20, cx + 130, cy + 220], 190, 350, fill=(45, 30, 32, 180), width=35) # Shoulders

    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "JPEG", quality=92)
    print(f"Generated: {output_path}")

def main():
    base_dirs = [
        "/Users/qiao/Documents/徕舞工作/fitness-crm/public/brand",
        "/Users/qiao/Documents/徕舞工作/fitness-crm/miniprogram/images"
    ]
    
    # 6 Monthly stars
    stars = [
        ("star-1.jpg", "苏晴", "从容", "在呼吸的节律里，重新找回身体原本的力量。", "01", ((46, 24, 25), (28, 14, 15), (212, 175, 55))),
        ("star-2.jpg", "念安", "深耕", "每一次对抗与拉伸，都是与自己最真实的对话。", "02", ((52, 28, 26), (32, 16, 17), (230, 195, 95))),
        ("star-3.jpg", "黛萌", "专注", "心神定下来，身体自会给出优雅的回应。", "03", ((42, 22, 24), (24, 12, 14), (200, 165, 80))),
        ("star-4.jpg", "语晨", "觉知", "卸下外界的喧嚣，在这里只专注向内的深邃。", "04", ((58, 30, 28), (35, 18, 19), (220, 180, 85))),
        ("star-5.jpg", "若薇", "自在", "不执着于速度，每一步坚持都在沉淀笃定。", "05", ((48, 25, 27), (29, 15, 16), (215, 170, 75))),
        ("star-6.jpg", "听澜", "恒温", "舒展的不仅是脊柱线条，更是内在的从容与热爱。", "06", ((54, 27, 28), (31, 16, 18), (225, 185, 90)))
    ]
    
    # 4 Venues
    venues = [
        ("venue-1.jpg", "01 / 核心床私密舱", ((40, 25, 26), (25, 15, 16), (220, 190, 120))),
        ("venue-2.jpg", "02 / 凯迪拉克重力空间", ((48, 28, 27), (28, 16, 17), (210, 175, 90))),
        ("venue-3.jpg", "03 / 普拉提舒展净室", ((38, 22, 24), (22, 12, 14), (225, 180, 100))),
        ("venue-4.jpg", "04 / 私享茶饮休憩区", ((45, 27, 28), (27, 16, 17), (215, 185, 110)))
    ]
    
    # 3 Team members
    team = [
        ("team-1.jpg", "小桥", "徕舞主理人", ((45, 22, 24), (25, 12, 14), (212, 175, 55))),
        ("team-2.jpg", "嘉敏", "普拉提导师", ((50, 26, 27), (28, 14, 16), (215, 180, 80))),
        ("team-3.jpg", "若琳", "普拉提导师", ((42, 24, 25), (24, 13, 15), (205, 170, 75)))
    ]
    
    for base in base_dirs:
        # Stars
        for filename, name, tag, quote, idx, colors in stars:
            out = os.path.join(base, "stars", filename)
            draw_luxury_star_card(out, name, tag, quote, idx, colors)
            
        # Venues
        for filename, title, colors in venues:
            out = os.path.join(base, "venue", filename)
            draw_venue_card(out, title, colors)
            
        # Team
        for filename, name, role, colors in team:
            out = os.path.join(base, "team", filename)
            draw_team_card(out, name, role, colors)

if __name__ == "__main__":
    main()
