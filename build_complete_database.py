import os
import re
import json

CACHE_DIR = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/ocr_cache'
OUTPUT_DIR = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/data'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 10 Tests Answer Keys
ANSWER_KEYS = {
    1: {1:'B',2:'A',3:'D',4:'A',5:'C',6:'C',7:'C',8:'A',9:'D',10:'A',
        11:'A',12:'B',13:'D',14:'D',15:'D',16:'B',17:'D',18:'D',19:'C',20:'C',
        21:'A',22:'A',23:'A',24:'D',25:'B',26:'C',27:'A',28:'B',29:'A',30:'C',
        31:'C',32:'C',33:'A',34:'C',35:'B',36:'B',37:'A',38:'B',39:'B',40:'D'},
    2: {1:'B',2:'C',3:'A',4:'D',5:'C',6:'B',7:'C',8:'D',9:'D',10:'B',
        11:'C',12:'D',13:'C',14:'C',15:'B',16:'A',17:'C',18:'A',19:'D',20:'C',
        21:'B',22:'D',23:'D',24:'B',25:'B',26:'D',27:'A',28:'A',29:'B',30:'B',
        31:'C',32:'A',33:'D',34:'A',35:'C',36:'D',37:'B',38:'C',39:'B',40:'D'},
    3: {1:'C',2:'B',3:'B',4:'A',5:'B',6:'D',7:'B',8:'C',9:'A',10:'D',
        11:'B',12:'A',13:'A',14:'C',15:'D',16:'D',17:'C',18:'D',19:'B',20:'C',
        21:'A',22:'D',23:'B',24:'B',25:'C',26:'C',27:'D',28:'C',29:'B',30:'D',
        31:'C',32:'A',33:'C',34:'A',35:'B',36:'A',37:'B',38:'D',39:'C',40:'A'},
    4: {1:'C',2:'D',3:'C',4:'B',5:'D',6:'C',7:'D',8:'C',9:'D',10:'B',
        11:'D',12:'C',13:'C',14:'A',15:'D',16:'B',17:'B',18:'C',19:'D',20:'D',
        21:'A',22:'C',23:'C',24:'C',25:'C',26:'D',27:'B',28:'C',29:'A',30:'A',
        31:'B',32:'D',33:'A',34:'A',35:'C',36:'D',37:'D',38:'C',39:'B',40:'A'},
    5: {1:'C',2:'A',3:'D',4:'D',5:'C',6:'C',7:'B',8:'B',9:'D',10:'B',
        11:'D',12:'B',13:'B',14:'D',15:'D',16:'C',17:'C',18:'C',19:'D',20:'C',
        21:'B',22:'C',23:'C',24:'C',25:'C',26:'C',27:'D',28:'B',29:'D',30:'A',
        31:'B',32:'C',33:'B',34:'D',35:'A',36:'A',37:'C',38:'B',39:'B',40:'C'},
    6: {1:'A',2:'A',3:'C',4:'B',5:'C',6:'A',7:'D',8:'D',9:'D',10:'B',
        11:'D',12:'A',13:'A',14:'C',15:'B',16:'C',17:'A',18:'C',19:'B',20:'B',
        21:'A',22:'A',23:'D',24:'A',25:'C',26:'B',27:'B',28:'B',29:'B',30:'A',
        31:'C',32:'C',33:'B',34:'D',35:'A',36:'A',37:'A',38:'A',39:'D',40:'B'},
    7: {1:'A',2:'C',3:'D',4:'B',5:'C',6:'A',7:'A',8:'B',9:'D',10:'B',
        11:'B',12:'D',13:'B',14:'B',15:'A',16:'D',17:'D',18:'A',19:'A',20:'C',
        21:'A',22:'B',23:'D',24:'A',25:'C',26:'C',27:'C',28:'B',29:'D',30:'C',
        31:'A',32:'D',33:'A',34:'B',35:'B',36:'B',37:'D',38:'A',39:'C',40:'C'},
    8: {1:'B',2:'D',3:'B',4:'C',5:'C',6:'A',7:'D',8:'C',9:'C',10:'A',
        11:'B',12:'A',13:'A',14:'C',15:'C',16:'B',17:'D',18:'B',19:'D',20:'D',
        21:'B',22:'C',23:'C',24:'A',25:'C',26:'D',27:'A',28:'B',29:'C',30:'C',
        31:'D',32:'A',33:'D',34:'A',35:'B',36:'B',37:'D',38:'C',39:'A',40:'D'},
    9: {1:'C',2:'A',3:'B',4:'D',5:'D',6:'D',7:'B',8:'D',9:'C',10:'A',
        11:'A',12:'B',13:'B',14:'C',15:'C',16:'C',17:'D',18:'A',19:'B',20:'C',
        21:'B',22:'D',23:'C',24:'C',25:'B',26:'A',27:'B',28:'D',29:'C',30:'C',
        31:'B',32:'C',33:'A',34:'C',35:'D',36:'A',37:'A',38:'D',39:'A',40:'A'},
    10:{1:'A',2:'B',3:'C',4:'D',5:'B',6:'A',7:'B',8:'C',9:'A',10:'B',
        11:'A',12:'D',13:'B',14:'C',15:'B',16:'A',17:'B',18:'C',19:'A',20:'C',
        21:'A',22:'B',23:'B',24:'C',25:'C',26:'A',27:'A',28:'D',29:'C',30:'D',
        31:'C',32:'C',33:'A',34:'D',35:'A',36:'D',37:'D',38:'B',39:'B',40:'B'}
}

# Page ranges for Exam and Explanation
TEST_CONFIG = {
    1: {'exam': range(10, 23), 'exp': range(24, 41)},
    2: {'exam': range(41, 55), 'exp': range(56, 74)},
    3: {'exam': range(74, 88), 'exp': range(89, 107)},
    4: {'exam': range(107, 121), 'exp': range(122, 140)},
    5: {'exam': range(140, 154), 'exp': range(155, 172)},
    6: {'exam': range(172, 185), 'exp': range(186, 203)},
    7: {'exam': range(203, 217), 'exp': range(218, 236)},
    8: {'exam': range(236, 250), 'exp': range(251, 269)},
    9: {'exam': range(269, 284), 'exp': range(285, 304)},
    10:{'exam': range(304, 318), 'exp': range(319, 337)},
}

TEST_TITLES = {
    1: ("VSTEP READING MOCK TEST 01", [
        ("Passage 1: Glencorn Lodge", "Du lịch & Kỳ nghỉ hè tại Glencorn Lodge (Bắc Ireland)"),
        ("Passage 2: What Makes an Olympic Champion?", "Các yếu tố sinh học, di truyền và rèn luyện tạo nên siêu vận động viên"),
        ("Passage 3: The Evolution of Lighting & WLEDs", "Lịch sử công nghệ chiếu sáng: Sợi đốt, huỳnh quang và đèn diode trắng WLED"),
        ("Passage 4: Business Pricing Strategies", "Các chiến lược định giá sản phẩm: Chi phí, Cạnh tranh và Giá trị cảm nhận")
    ]),
    2: ("VSTEP READING MOCK TEST 02", [
        ("Passage 1: Danakil Depression Expedition", "Hành trình thám hiểm vùng lòng chảo Danakil khắc nghiệt ở Ethiopia"),
        ("Passage 2: Mount Fuji: Sacred Peak & Active Volcano", "Núi Phú Sĩ - Biểu tượng văn hóa tâm linh và núi lửa hoạt động của Nhật Bản"),
        ("Passage 3: The Effects of Caffeine on the Human Body", "Tác động kích thích thần kinh và hiện tượng phụ thuộc caffeine"),
        ("Passage 4: Muscle Physiology & Fiber Types", "Cơ chế sinh lý học cơ bắp: Sợi cơ co giật nhanh Type II và hiệu suất thể thao")
    ]),
    3: ("VSTEP READING MOCK TEST 03", [
        ("Passage 1: Vincent Van Gogh's Artistic Vision", "Triết lý nghệ thuật và phong cách phối màu đột phá của Vincent Van Gogh"),
        ("Passage 2: The Ancient Anasazi of Mesa Verde", "Nền văn minh cổ đại Anasazi tại các vách đá Mesa Verde"),
        ("Passage 3: The Birth of Impressionism in France", "Sự trỗi dậy của trường phái Ấn tượng và triển lãm Le Salon thế kỷ 19"),
        ("Passage 4: Reverse Factoring in Modern Supply Chains", "Giải pháp tài chính bao thanh toán ngược (Reverse Factoring) trong chuỗi cung ứng")
    ]),
    4: ("VSTEP READING MOCK TEST 04", [
        ("Passage 1: Can Science Predict Earthquakes?", "Nghiên cứu dự báo động đất dọc các khe đứt gãy vỏ Trái đất"),
        ("Passage 2: Foreign Exchange Rates & Currency Risk", "Tỷ giá hối đoái và 3 loại rủi ro tiền tệ trong kinh doanh quốc tế"),
        ("Passage 3: Wind Power Revolution in Europe", "Cuộc cách mạng năng lượng gió và năng lượng tái tạo tại châu Âu"),
        ("Passage 4: Nanotechnology & Targeted Cancer Treatment", "Ứng dụng công nghệ hạt nano trong điều trị nhắm trúng đích tế bào ung thư")
    ]),
    5: ("VSTEP READING MOCK TEST 05", [
        ("Passage 1: Salvador da Bahia & Afro-Brazilian Culture", "Văn hóa Afro-Brazil đặc sắc tại thành phố duyên hải Salvador da Bahia"),
        ("Passage 2: The Mysterious Hendra Virus Outbreak", "Đợt bùng phát virus Hendra bí ẩn ở đàn ngựa đua tại Úc"),
        ("Passage 3: Brain Imaging & the Science of Mind", "Công nghệ chụp ảnh não bộ hiện đại và giải mã hoạt động tư duy con người"),
        ("Passage 4: Ocean Thermal Energy Conversion (OTEC)", "Công nghệ chuyển đổi nhiệt năng đại dương thành nguồn điện sạch liên tục")
    ]),
    6: ("VSTEP READING MOCK TEST 06", [
        ("Passage 1: Dopamine & the Biology of Human Ambition", "Dopamine, cơ chế sinh học của động lực và bản năng mạo hiểm"),
        ("Passage 2: Light Pollution & the Loss of Darkness", "Ô nhiễm ánh sáng ban đêm và tác hại khôn lường tới sức khỏe, hệ sinh thái"),
        ("Passage 3: Animal Cognition: Alex the Parrot", "Trí thông minh loài vật: Nghiên cứu khả năng ngôn ngữ và tư duy của vẹt Alex"),
        ("Passage 4: Alexander Fleming & the Discovery of Penicillin", "Alexander Fleming và bước ngoặt vĩ đại phát minh ra kháng sinh Penicillin")
    ]),
    7: ("VSTEP READING MOCK TEST 07", [
        ("Passage 1: Dorothea Dix & Mental Health Reform", "Dorothea Dix và cuộc cách mạng nhân đạo chăm sóc bệnh nhân tâm thần"),
        ("Passage 2: The Grand Canal of China", "Đại Vận Hà Trung Quốc - Công trình thủy lợi vĩ đại kết nối giao thương Bắc - Nam"),
        ("Passage 3: Noise Pollution: The Invisible Threat", "Ô nhiễm tiếng ồn đô thị và tác động tiêu cực đến sức khỏe cộng đồng"),
        ("Passage 4: Evolutionary Link: Dinosaurs to Modern Birds", "Bằng chứng tiến hóa: Mối liên kết giải phẫu giữa khủng long và loài chim")
    ]),
    8: ("VSTEP READING MOCK TEST 08", [
        ("Passage 1: The Commercial Space Exploration Era", "Kỷ nguyên khám phá không gian tư nhân: SpaceX và khai khoáng tiểu hành tinh"),
        ("Passage 2: The 1908 Olympic Marathon Drama", "Kịch tính cuộc đua Marathon Olympic 1908 và bài học ý chí của Dorando Pietri"),
        ("Passage 3: The Cockayne Project of 1614", "Dự án Cockayne năm 1614 và cuộc khủng hoảng ngành dệt may nước Anh"),
        ("Passage 4: Nickel Refining & Metallurgical Innovations", "Quy trình luyện kim và công nghệ tinh chế quặng niken hiện đại")
    ]),
    9: ("VSTEP READING MOCK TEST 09", [
        ("Passage 1: Failure: The Secret Ingredient of Success", "Thất bại như một đòn bẩy tất yếu cho sự đổi mới và thành công"),
        ("Passage 2: The Svalbard Global Seed Vault", "Hầm hạt giống toàn cầu Svalbard và sứ mệnh bảo vệ an ninh lương thực nhân loại"),
        ("Passage 3: The Tradition of Keeping a Personal Diary", "Lịch sử và lợi ích tâm lý sâu sắc của thói quen viết nhật ký cá nhân"),
        ("Passage 4: Prehistoric Art & Cave Painting Pigments", "Nghệ thuật tranh khắc hang động thời tiền sử và sắc tố màu tự nhiên")
    ]),
    10: ("VSTEP READING MOCK TEST 10", [
        ("Passage 1: Pigments & Cultural Meaning of Colors", "Nguồn gốc sắc tố tự nhiên và biểu tượng văn hóa của các gam màu"),
        ("Passage 2: Coral Reefs Under Climate Threat", "Rạn san hô nhiệt đới trước thảm họa ấm lên và axit hóa đại dương"),
        ("Passage 3: Classical Architecture: The Greek Column Orders", "Kiến trúc Hy Lạp cổ đại: Ba thức cột kinh điển Doric, Ionic và Corinthian"),
        ("Passage 4: Multitasking & Cognitive Load in the Digital Age", "Tải lượng nhận thức và ảo tưởng đa nhiệm trong môi trường kỹ thuật số")
    ])
}

def clean_ocr(text):
    text = re.sub(r'10 Bộ đề thi Đọc hiểu Vstep B1-B2-C1', '', text)
    text = re.sub(r'10 Bộ đề thí Đọc hiếu Vstep B1-B2-C1', '', text)
    text = re.sub(r'10 Bộ đề thi Đọc hiếu Vstep B1-B2-CI', '', text)
    text = re.sub(r'DIVIAN\s+Chính phục kỳ thi VSTEP', '', text)
    text = re.sub(r'VIVIAN\s+Chinh phục kỳ thi VSTEP', '', text)
    text = re.sub(r'IVIAN\s+Chinh phục kỳ thi VSTEP', '', text)
    text = re.sub(r'WIVIAN\s+Chinh phục kỳ thi VSTEP', '', text)
    text = re.sub(r'DIVIAN\s+ENGLISH CENTER.*', '', text)
    text = re.sub(r'VIVIAN\s+ENGLISH CENTER.*', '', text)
    text = re.sub(r'IVIAN\s+ENGLISH CENTER.*', '', text)
    text = re.sub(r'•IVIAN.*', '', text)
    text = re.sub(r'HỌC TỪ VỰNG.*?(?=PASSAGE|\Z)', '', text, flags=re.DOTALL)
    text = re.sub(r'HỌC TƯ VỤNG.*?(?=PASSAGE|\Z)', '', text, flags=re.DOTALL)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'Scan me', '', text)
    return text

def parse_explanations_for_test(test_num):
    exp_pages = TEST_CONFIG[test_num]['exp']
    full_exp = ''
    for p in exp_pages:
        try:
            with open(f'{CACHE_DIR}/page_{p}.txt') as f:
                full_exp += f.read() + '\n'
        except FileNotFoundError:
            pass
    
    full_exp = clean_ocr(full_exp)
    blocks = re.split(r'→\s*Đáp\s*án\s*([A-D])\s*là\s*đáp\s*án\s*đúng', full_exp, flags=re.IGNORECASE)
    
    explanations = {}
    for i in range(1, len(blocks), 2):
        q_num = (i + 1) // 2
        ans = blocks[i].strip().upper()
        content = blocks[i-1].strip()
        
        # English question + Vietnamese translation
        m_q = re.search(r'([A-Za-z0-9\s,\'\"\-\–\?]+?)\s*\(([^\)]+)\)', content)
        q_en = ''
        q_vi = ''
        if m_q:
            q_en = m_q.group(1).strip()
            q_en = re.sub(r'^(?:GIẢI THÍCH ĐÁP ÁN|PASSAGE\s*\d+|\d+)\s*', '', q_en).strip()
            q_vi = m_q.group(2).strip()
        
        # Evidence quote
        m_ev = re.search(r'([^\n]+?\[(?:Paragraph|Đoạn)\s*\d+\])', content)
        ev_en = m_ev.group(1).strip() if m_ev else ''
        
        # Extract Vietnamese options
        opts_vi = re.findall(r'([A-D])[\.\s]+([^\n]+)', content)
        opts_vi_dict = {letter: val.strip() for letter, val in opts_vi}
        
        # Detailed explanation text
        explanation_body = content
        # remove q_en and q_vi from explanation body for cleanliness
        if q_en and q_en in explanation_body:
            explanation_body = explanation_body.split(q_en)[-1]
        
        explanations[q_num] = {
            'ans': ans,
            'q_en': q_en,
            'q_vi': q_vi,
            'ev_en': ev_en,
            'opts_vi': opts_vi_dict,
            'raw': content
        }
    return explanations

print("Ready to build master dataset")
