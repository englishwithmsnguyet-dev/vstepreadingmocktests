import os
import re
import json

CACHE_DIR = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/ocr_cache'
OUTPUT_FILE = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/data/tests_data.js'
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

from build_complete_database import ANSWER_KEYS, TEST_CONFIG, TEST_TITLES, clean_ocr, parse_explanations_for_test

# Load pre-parsed tests 8, 9, 10 from mocktests/data.js
MOCKTESTS_DATA_PATH = '/Users/nguyetpham/Desktop/WEBSITE/mocktests/data.js'
digitized_tests = {}
if os.path.exists(MOCKTESTS_DATA_PATH):
    try:
        with open(MOCKTESTS_DATA_PATH, 'r', encoding='utf-8') as f:
            d_content = f.read()
        
        for tid, t_idx in [('VSTEPTEST01', 8), ('VSTEPTEST02', 9), ('VSTEPTEST03', 10)]:
            m = re.search(r'\"' + tid + r'\":\s*\{.*?\"reading\":\s*\{\s*\"duration\":\s*(\d+),\s*\"parts\":\s*(\[.*?\])\s*\}\s*,\s*\"writing\"', d_content, re.DOTALL)
            if m:
                digitized_tests[t_idx] = json.loads(m.group(2))
                print(f"Loaded digitized test {t_idx} from data.js: {len(digitized_tests[t_idx])} parts")
    except Exception as e:
        print("Error loading data.js:", e)

# Curated academic vocabulary for each test
CURATED_VOCAB = {
    1: [
        {"word": "discreetly", "pos": "adv", "ipa": "/dɪˈskriːt.li/", "mean": "kín đáo, cẩn trọng"},
        {"word": "appalling", "pos": "adj", "ipa": "/əˈpɔː.lɪŋ/", "mean": "kinh khủng, tồi tệ"},
        {"word": "coincidence", "pos": "n", "ipa": "/kəʊˈɪn.sɪ.dəns/", "mean": "sự trùng hợp"},
        {"word": "differentiate", "pos": "v", "ipa": "/ˌdɪf.əˈren.ʃi.eɪt/", "mean": "phân biệt"},
        {"word": "hemoglobin", "pos": "n", "ipa": "/ˌhiː.məˈɡləʊ.bɪn/", "mean": "huyết sắc tố trong máu"},
        {"word": "incandescent", "pos": "adj", "ipa": "/ˌɪn.kænˈdes.ənt/", "mean": "sợi đốt, phát sáng trắng"},
        {"word": "fluorescent", "pos": "adj", "ipa": "/flɔːˈres.ənt/", "mean": "huỳnh quang"},
        {"word": "semiconductor", "pos": "n", "ipa": "/ˌsem.i.kənˈdʌk.tər/", "mean": "chất bán dẫn"},
        {"word": "perceived value", "pos": "n", "ipa": "/pəˈsiːvd ˈvæl.juː/", "mean": "giá trị cảm nhận của khách hàng"},
        {"word": "paraphrase", "pos": "v", "ipa": "/ˈpær.ə.freɪz/", "mean": "diễn giải lại bằng từ ngữ khác"}
    ],
    2: [
        {"word": "expedition", "pos": "n", "ipa": "/ˌek.spəˈdɪʃ.ən/", "mean": "cuộc thám hiểm"},
        {"word": "inhospitable", "pos": "adj", "ipa": "/ˌɪn.hɒsˈpɪt.ə.bəl/", "mean": "khắc nghiệt, khó sinh sống"},
        {"word": "dormant", "pos": "adj", "ipa": "/ˈdɔː.mənt/", "mean": "ngủ yên, tạm ngừng hoạt động"},
        {"word": "sacred", "pos": "adj", "ipa": "/ˈseɪ.krɪd/", "mean": "thiêng liêng, tôn kính"},
        {"word": "caffeine dependence", "pos": "n", "ipa": "/ˈkæf.iːn dɪˈpen.dəns/", "mean": "sự phụ thuộc vào caffeine"},
        {"word": "neurological", "pos": "adj", "ipa": "/ˌnjʊə.rəˈlɒdʒ.ɪ.kəl/", "mean": "thuộc về thần kinh"},
        {"word": "anaerobic", "pos": "adj", "ipa": "/ˌæn.eəˈrəʊ.bɪk/", "mean": "kỵ khí (không dùng oxy)"},
        {"word": "hypertrophy", "pos": "n", "ipa": "/haɪˈpɜː.trə.fi/", "mean": "sự phì đại cơ bắp"},
        {"word": "altitude", "pos": "n", "ipa": "/ˈæl.tɪ.tʃuːd/", "mean": "độ cao so với mặt biển"},
        {"word": "deprivation", "pos": "n", "ipa": "/ˌdep.rɪˈveɪ.ʃən/", "mean": "sự tước đoạt, thiếu thốn"}
    ],
    3: [
        {"word": "innovative", "pos": "adj", "ipa": "/ˈɪn.ə.və.tɪv/", "mean": "đột phá, đổi mới sáng tạo"},
        {"word": "domesticate", "pos": "v", "ipa": "/dəˈmes.tɪ.keɪt/", "mean": "thuần hóa (động vật, cây trồng)"},
        {"word": "cliff dwelling", "pos": "n", "ipa": "/klɪf ˈdwel.ɪŋ/", "mean": "nhà xây trong hốc vách đá"},
        {"word": "impressionism", "pos": "n", "ipa": "/ɪmˈpreʃ.ən.ɪ.zəm/", "mean": "trường phái hội họa Ấn tượng"},
        {"word": "salon", "pos": "n", "ipa": "/ˈsæl.ɒn/", "mean": "triển lãm nghệ thuật chính thống"},
        {"word": "accounts receivable", "pos": "n", "ipa": "/əˈkaʊnts rɪˈsiː.və.bəl/", "mean": "khoản phải thu khách hàng"},
        {"word": "reverse factoring", "pos": "n", "ipa": "/rɪˈvɜːs ˈfæk.tər.ɪŋ/", "mean": "bao thanh toán ngược"},
        {"word": "liquidity", "pos": "n", "ipa": "/lɪˈkwɪd.ə.ti/", "mean": "tính thanh khoản tài chính"},
        {"word": "aesthetic", "pos": "adj", "ipa": "/esˈθet.ɪk/", "mean": "mang tính thẩm mỹ"},
        {"word": "perspective", "pos": "n", "ipa": "/pəˈspek.tɪv/", "mean": "góc nhìn, luật phối cảnh"}
    ],
    4: [
        {"word": "fault line", "pos": "n", "ipa": "/ˈfɒlt ˌlaɪn/", "mean": "đường đứt gãy địa chất"},
        {"word": "seismic", "pos": "adj", "ipa": "/ˈsaɪz.mɪk/", "mean": "thuộc về địa chấn, động đất"},
        {"word": "currency exposure", "pos": "n", "ipa": "/ˈkʌr.ən.si ɪkˈspəʊ.ʒər/", "mean": "rủi ro phơi nhiễm tỷ giá"},
        {"word": "fluctuation", "pos": "n", "ipa": "/ˌflʌk.tʃuˈeɪ.ʃən/", "mean": "sự dao động, biến động"},
        {"word": "megawatt", "pos": "n", "ipa": "/ˈmeɡ.ə.wɒt/", "mean": "mê-ga-oát (đơn vị công suất điện)"},
        {"word": "nanotechnology", "pos": "n", "ipa": "/ˌnæn.əʊ.tekˈnɒl.ə.dʒi/", "mean": "công nghệ nano"},
        {"word": "targeted therapy", "pos": "n", "ipa": "/ˈtɑː.ɡɪt.ɪd ˈθer.ə.pi/", "mean": "liệu pháp điều trị nhắm trúng đích"},
        {"word": "malignant", "pos": "adj", "ipa": "/məˈlɪɡ.nənt/", "mean": "ác tính (khối u)"},
        {"word": "predictability", "pos": "n", "ipa": "/prɪˌdɪk.təˈbɪl.ə.ti/", "mean": "khả năng dự báo trước"},
        {"word": "turbine", "pos": "n", "ipa": "/ˈtɜː.baɪn/", "mean": "tuabin phát điện gió/nước"}
    ],
    5: [
        {"word": "afro-brazilian", "pos": "adj", "ipa": "/ˌæf.rəʊ brəˈzɪl.jən/", "mean": "gốc Phi tại Brazil"},
        {"word": "intermarry", "pos": "v", "ipa": "/ˌɪn.təˈmær.i/", "mean": "kết hôn giữa các sắc tộc"},
        {"word": "outbreak", "pos": "n", "ipa": "/ˈaʊt.breɪk/", "mean": "sự bùng phát dịch bệnh"},
        {"word": "zoonotic", "pos": "adj", "ipa": "/ˌzəʊ.əˈnɒt.ɪk/", "mean": "lây truyền từ động vật sang người"},
        {"word": "neuroimaging", "pos": "n", "ipa": "/ˌnjʊə.rəʊˈɪm.ɪ.dʒɪŋ/", "mean": "công nghệ chụp ảnh não"},
        {"word": "thermal energy", "pos": "n", "ipa": "/ˈθɜː.məl ˈen.ə.dʒi/", "mean": "nhiệt năng"},
        {"word": "desalination", "pos": "n", "ipa": "/diːˌsæl.ɪˈneɪ.ʃən/", "mean": "sự khử mặn nước biển"},
        {"word": "condenser", "pos": "n", "ipa": "/kənˈden.sər/", "mean": "thiết bị ngưng tụ hơi"},
        {"word": "pathogen", "pos": "n", "ipa": "/ˈpæθ.ə.dʒən/", "mean": "mầm bệnh, tác nhân gây bệnh"},
        {"word": "cognitive", "pos": "adj", "ipa": "/ˈkɒɡ.nə.tɪv/", "mean": "thuộc về nhận thức"}
    ],
    6: [
        {"word": "dopamine", "pos": "n", "ipa": "/ˈdəʊ.pə.miːn/", "mean": "chất dẫn truyền thần kinh hưng phấn"},
        {"word": "compelling", "pos": "adj", "ipa": "/kəmˈpel.ɪŋ/", "mean": "thôi thúc, có sức thuyết phục cao"},
        {"word": "light pollution", "pos": "n", "ipa": "/ˈlaɪt pəˌluː.ʃən/", "mean": "ô nhiễm ánh sáng nhân tạo"},
        {"word": "circadian rhythm", "pos": "n", "ipa": "/sɜːˈkeɪ.di.ən ˈrɪð.əm/", "mean": "nhịp sinh học ngày đêm"},
        {"word": "avian", "pos": "adj", "ipa": "/ˈeɪ.vi.ən/", "mean": "thuộc về loài chim"},
        {"word": "cognition", "pos": "n", "ipa": "/kɒɡˈnɪʃ.ən/", "mean": "khả năng nhận thức và tư duy"},
        {"word": "antibiotic", "pos": "n", "ipa": "/ˌæn.ti.baɪˈɒt.ɪk/", "mean": "thuốc kháng sinh"},
        {"word": "penicillin", "pos": "n", "ipa": "/ˌpen.ɪˈsɪl.ɪn/", "mean": "kháng sinh pênixilin"},
        {"word": "staphylococcus", "pos": "n", "ipa": "/ˌstæf.ɪ.ləʊˈkɒk.əs/", "mean": "tụ cầu khuẩn"},
        {"word": "accidental discovery", "pos": "n", "ipa": "/ˌæk.sɪˈden.təl dɪˈskʌv.ər.i/", "mean": "phát minh tình cờ đầy giá trị"}
    ],
    7: [
        {"word": "philanthropist", "pos": "n", "ipa": "/fɪˈlæn.θrə.pɪst/", "mean": "nhà từ thiện, nhà hảo tâm"},
        {"word": "insane asylum", "pos": "n", "ipa": "/ɪnˈseɪn əˈsaɪ.ləm/", "mean": "viện tâm thần (cũ)"},
        {"word": "canal", "pos": "n", "ipa": "/kəˈnæl/", "mean": "kênh đào nhân tạo"},
        {"word": "irrigation", "pos": "n", "ipa": "/ˌɪr.ɪˈɡeɪ.ʃən/", "mean": "hệ thống tưới tiêu nông nghiệp"},
        {"word": "pervasive", "pos": "adj", "ipa": "/pəˈveɪ.sɪv/", "mean": "lan tỏa khắp nơi, phổ biến"},
        {"word": "decibel", "pos": "n", "ipa": "/ˈdes.ɪ.bel/", "mean": "đề-xi-ben (đơn vị đo cường độ âm thanh)"},
        {"word": "furcula", "pos": "n", "ipa": "/ˈfɜː.kjʊ.lə/", "mean": "xương chạc ở ức chim/khủng long"},
        {"word": "protofeather", "pos": "n", "ipa": "/ˌprəʊ.təʊˈfeð.ər/", "mean": "lông vũ nguyên thủy của khủng long"},
        {"word": "paleontology", "pos": "n", "ipa": "/ˌpæl.i.ɒnˈtɒl.ə.dʒi/", "mean": "cổ sinh vật học"},
        {"word": "evolutionary link", "pos": "n", "ipa": "/ˌev.əˈluː.ʃən.ər.i lɪŋk/", "mean": "mắt xích tiến hóa"}
    ],
    8: [
        {"word": "commercial spaceflight", "pos": "n", "ipa": "/kəˈmɜː.ʃəl ˈspeɪs.flaɪt/", "mean": "chuyến bay vũ trụ thương mại"},
        {"word": "asteroid mining", "pos": "n", "ipa": "/ˈæs.tər.ɔɪd ˈmaɪ.nɪŋ/", "mean": "khai khoáng kim loại tiểu hành tinh"},
        {"word": "marathon", "pos": "n", "ipa": "/ˈmær.ə.θən/", "mean": "cuộc chạy đua việt dã 42.195 km"},
        {"word": "disqualification", "pos": "n", "ipa": "/dɪsˌkwɒl.ɪ.fɪˈkeɪ.ʃən/", "mean": "sự truất quyền thi đấu"},
        {"word": "monopoly", "pos": "n", "ipa": "/məˈnɒp.əl.i/", "mean": "sự độc quyền kinh doanh"},
        {"word": "flotation", "pos": "n", "ipa": "/fləʊˈteɪ.ʃən/", "mean": "tuyển nổi (tách khoáng sản quặng)"},
        {"word": "smelting", "pos": "n", "ipa": "/ˈsmelt.ɪŋ/", "mean": "nấu luyện quặng kim loại"},
        {"word": "metallurgy", "pos": "n", "ipa": "/məˈtæl.ə.dʒi/", "mean": "ngành luyện kim"},
        {"word": "platinum", "pos": "n", "ipa": "/ˈplæt.ɪ.nəm/", "mean": "bạch kim (kim loại quý)"},
        {"word": "endurance", "pos": "n", "ipa": "/ɪnˈdjʊə.rəns/", "mean": "sức chịu đựng, tính bền bỉ"}
    ],
    9: [
        {"word": "catalyst", "pos": "n", "ipa": "/ˈkæt.əl.ɪst/", "mean": "chất xúc tác, nhân tố thúc đẩy"},
        {"word": "seed vault", "pos": "n", "ipa": "/siːd vɔːlt/", "mean": "hầm bảo tồn hạt giống đông lạnh"},
        {"word": "permafrost", "pos": "n", "ipa": "/ˈpɜː.mə.frɒst/", "mean": "tầng đất đóng băng vĩnh cửu"},
        {"word": "biodiversity", "pos": "n", "ipa": "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/", "mean": "sự đa dạng sinh học"},
        {"word": "cathartic", "pos": "adj", "ipa": "/kəˈθɑː.tɪk/", "mean": "giải tỏa tâm lý, thanh lọc cảm xúc"},
        {"word": "introspective", "pos": "adj", "ipa": "/ˌɪn.trəˈspek.tɪv/", "mean": "nội tâm, tự phản chiếu bản thân"},
        {"word": "prehistoric", "pos": "adj", "ipa": "/ˌpriː.hɪˈstɒr.ɪk/", "mean": "thời tiền sử"},
        {"word": "pigment", "pos": "n", "ipa": "/ˈpɪɡ.mənt/", "mean": "sắc tố, bột màu vẽ"},
        {"word": "charcoal", "pos": "n", "ipa": "/ˈtʃɑː.kəʊl/", "mean": "than củi vẽ tranh"},
        {"word": "resilience", "pos": "n", "ipa": "/rɪˈzɪl.jəns/", "mean": "sự kiên cường, khả năng phục hồi"}
    ],
    10: [
        {"word": "ochre", "pos": "n", "ipa": "/ˈəʊ.kər/", "mean": "đất son, sắc tố vàng nâu/đỏ tự nhiên"},
        {"word": "coral bleaching", "pos": "n", "ipa": "/ˈkɒr.əl ˈbliː.tʃɪŋ/", "mean": "hiện tượng san hô bị tẩy trắng"},
        {"word": "ocean acidification", "pos": "n", "ipa": "/ˈəʊ.ʃən əˌsɪd.ɪ.fɪˈkeɪ.ʃən/", "mean": "axit hóa nước đại dương"},
        {"word": "symbiotic", "pos": "adj", "ipa": "/ˌsɪm.baɪˈɒt.ɪk/", "mean": "cộng sinh cùng có lợi"},
        {"word": "capital", "pos": "n", "ipa": "/ˈkæp.ɪ.təl/", "mean": "đầu cột (trong kiến trúc cổ điển)"},
        {"word": "fluted", "pos": "adj", "ipa": "/ˈfluː.tɪd/", "mean": "có rãnh khía dọc (thân cột)"},
        {"word": "acanthus leaf", "pos": "n", "ipa": "/əˈkæn.θəs liːf/", "mean": "lá ô rô trang trí cột Corinthian"},
        {"word": "cognitive load", "pos": "n", "ipa": "/ˈkɒɡ.nə.tɪv ləʊd/", "mean": "tải lượng nhận thức của não bộ"},
        {"word": "task switching", "pos": "n", "ipa": "/tɑːsk ˈswɪtʃ.ɪŋ/", "mean": "chuyển đổi qua lại giữa các tác vụ"},
        {"word": "working memory", "pos": "n", "ipa": "/ˈwɜː.kɪŋ ˈmem.ər.i/", "mean": "trí nhớ ngắn hạn/làm việc"}
    ]
}

def clean_lines(text):
    text = clean_ocr(text)
    return [l.strip() for l in text.split('\n') if l.strip()]

def extract_test(test_num):
    print(f"--> Extracting Test {test_num:02d}...")
    ans_key = ANSWER_KEYS[test_num]
    exp_dict = parse_explanations_for_test(test_num)
    meta = TEST_TITLES[test_num]
    
    test_obj = {
        "testId": f"TEST{test_num:02d}",
        "testNum": test_num,
        "title": meta[0],
        "description": f"Đề thi thử Đọc hiểu VSTEP số {test_num:02d} (Đầy đủ 4 Passages - 40 câu hỏi - Chuẩn B1-B2-C1)",
        "duration": 3600,
        "passages": []
    }
    
    # If test 8, 9, 10 are already digitized in data.js, we enhance them with our rich explanations!
    if test_num in digitized_tests:
        parts = digitized_tests[test_num]
        q_counter = 1
        for p_idx, part in enumerate(parts):
            p_title, p_topic = meta[1][p_idx]
            p_questions = []
            for q in part.get('questions', []):
                q_id = q_counter
                q_counter += 1
                corr_ans = ans_key.get(q_id, q.get('correctAnswer', 'A'))
                corr_idx = ord(corr_ans) - ord('A')
                
                exp_info = exp_dict.get(q_id, {})
                q_vi = exp_info.get('q_vi', '')
                ev_en = exp_info.get('ev_en', '')
                opts_vi_dict = exp_info.get('opts_vi', {})
                raw_exp = exp_info.get('raw', '')
                
                opts = q.get('options', [])
                opts_vi = [opts_vi_dict.get(chr(65+i), '') for i in range(4)]
                
                p_questions.append({
                    "id": q_id,
                    "num": q_id,
                    "question": q.get('question', f"Question {q_id}"),
                    "questionVi": q_vi,
                    "options": opts,
                    "optionsVi": opts_vi,
                    "correctAnswer": corr_ans,
                    "correctIdx": corr_idx,
                    "evidence": ev_en,
                    "explanation": raw_exp if raw_exp else f"Đáp án đúng là {corr_ans} dựa theo dẫn chứng trong bài đọc."
                })
            
            test_obj['passages'].append({
                "partId": p_idx + 1,
                "title": p_title,
                "topic": p_topic,
                "timeAllowed": 15,
                "passage": part.get('passage', ''),
                "vocab": CURATED_VOCAB.get(test_num, []),
                "questions": p_questions
            })
        return test_obj

    # Otherwise extract from OCR exam text
    exam_pages = TEST_CONFIG[test_num]['exam']
    full_exam = ''
    for p in exam_pages:
        try:
            with open(f'{CACHE_DIR}/page_{p}.txt') as f:
                full_exam += f.read() + '\n'
        except FileNotFoundError:
            pass
    
    clean_exam = clean_ocr(full_exam)
    p_matches = list(re.finditer(r'PASSAGE\s*([1-4])\s*\n+(?:Questions|Questions:)?\s*(\d+)-(\d+)', clean_exam, re.IGNORECASE))
    
    for i in range(len(p_matches)):
        start = p_matches[i].start()
        end = p_matches[i+1].start() if i + 1 < len(p_matches) else len(clean_exam)
        p_num = int(p_matches[i].group(1))
        q_start = int(p_matches[i].group(2))
        q_end = int(p_matches[i].group(3))
        
        chunk = clean_exam[start:end]
        p_title, p_topic = meta[1][i]
        
        # Split chunk into passage text and question lines
        lines = [l.strip() for l in chunk.split('\n') if l.strip()]
        
        # Find where first option or question starts
        opt_indices = [idx for idx, l in enumerate(lines) if re.match(r'^[A-D][\.\)]\s*', l)]
        if opt_indices:
            first_opt_idx = opt_indices[0]
            q1_idx = max(0, first_opt_idx - 1)
            while q1_idx > 0 and not lines[q1_idx].endswith('?') and not any(lines[q1_idx].startswith(w) for w in ['What', 'Why', 'How', 'Where', 'Which', 'The word', 'According', 'In paragraph', 'It can', 'In which', str(q_start)]):
                q1_idx -= 1
            
            p_lines = lines[:q1_idx]
            q_lines = lines[q1_idx:]
        else:
            p_lines = lines[:len(lines)//2]
            q_lines = lines[len(lines)//2:]
        
        # Build passage HTML
        p_content_lines = []
        in_hdr = True
        for l in p_lines:
            if in_hdr:
                if any(k in l for k in ['PASSAGE', 'Questions', 'minutes', 'GHI CH', 'ưu tiên', 'Câu hỏi', 'Scan me', 'ĐỂ THI', 'Directions:']):
                    continue
                else:
                    in_hdr = False
            p_content_lines.append(l)
        
        raw_passage_text = '\n'.join(p_content_lines)
        
        # Wrap into HTML paragraphs
        paras = re.split(r'\n{2,}|\s{4,}', raw_passage_text)
        if len(paras) <= 1:
            paras = [raw_passage_text[i:i+600] for i in range(0, len(raw_passage_text), 600)]
        
        passage_html = ''
        for para in paras:
            p_clean = para.strip().replace('\n', ' ')
            if not p_clean: continue
            p_clean = re.sub(r'\[([A-D])\]', r'<strong>[\1]</strong>', p_clean)
            passage_html += f'<p>&nbsp;&nbsp;&nbsp;&nbsp;{p_clean}</p>'
        
        # Build questions for this passage
        p_questions = []
        for q_id in range(q_start, q_end + 1):
            corr_ans = ans_key.get(q_id, 'A')
            corr_idx = ord(corr_ans) - ord('A')
            
            exp_info = exp_dict.get(q_id, {})
            q_en = exp_info.get('q_en', '')
            q_vi = exp_info.get('q_vi', '')
            ev_en = exp_info.get('ev_en', '')
            opts_vi_dict = exp_info.get('opts_vi', {})
            raw_exp = exp_info.get('raw', '')
            
            # Find English question prompt from exam lines if available
            exam_q_prompt = ""
            for l in q_lines:
                if (q_en and q_en[:20].lower() in l.lower()) or l.startswith(f"{q_id}.") or (f" {q_id}. " in l):
                    exam_q_prompt = re.sub(r'^\d+[\.\s]+', '', l).strip()
                    break
            
            # Options
            opt_a = opts_vi_dict.get('A', 'Lựa chọn A')
            opt_b = opts_vi_dict.get('B', 'Lựa chọn B')
            opt_c = opts_vi_dict.get('C', 'Lựa chọn C')
            opt_d = opts_vi_dict.get('D', 'Lựa chọn D')
            
            p_questions.append({
                "id": q_id,
                "num": q_id,
                "question": exam_q_prompt if exam_q_prompt else (q_en if q_en else f"Question {q_id}"),
                "questionVi": q_vi,
                "options": [
                    f"A. {opt_a}",
                    f"B. {opt_b}",
                    f"C. {opt_c}",
                    f"D. {opt_d}"
                ],
                "optionsVi": [opt_a, opt_b, opt_c, opt_d],
                "correctAnswer": corr_ans,
                "correctIdx": corr_idx,
                "evidence": ev_en,
                "explanation": raw_exp if raw_exp else f"Đáp án đúng là {corr_ans} theo dẫn chứng chi tiết trong bài đọc."
            })
        
        test_obj['passages'].append({
            "partId": i + 1,
            "title": p_title,
            "topic": p_topic,
            "timeAllowed": 15,
            "passage": passage_html if passage_html else f"<p>{raw_passage_text}</p>",
            "vocab": CURATED_VOCAB.get(test_num, []),
            "questions": p_questions
        })
    
    return test_obj

all_tests = []
for t in range(1, 11):
    t_obj = extract_test(t)
    total_q = sum(len(p['questions']) for p in t_obj['passages'])
    print(f"Test {t:02d} completed: {len(t_obj['passages'])} passages, {total_q} questions")
    all_tests.append(t_obj)

# Write to data/tests_data.js
js_content = "/**\n * VSTEP READING MOCK TESTS (10 TESTS DATA)\n * Source: 10 Bo De Thi Doc Hieu VSTEP B1-B2-C1\n */\n"
js_content += "const READING_MOCK_TESTS = " + json.dumps(all_tests, ensure_ascii=False, indent=2) + ";\n"

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"\n Master dataset successfully written to {OUTPUT_FILE} ({len(js_content)} bytes)")
