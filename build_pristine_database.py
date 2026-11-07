import os
import re
import json

CACHE_DIR = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/ocr_cache'
LAYOUT_DIR = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/ocr_layout'
OUTPUT_DATA = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/data/tests_data.js'
OUTPUT_ROOT = '/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/tests_data.js'
MOCKTESTS_DATA_PATH = '/Users/nguyetpham/Desktop/WEBSITE/mocktests/data.js'

os.makedirs(os.path.dirname(OUTPUT_DATA), exist_ok=True)

from build_complete_database import ANSWER_KEYS, TEST_CONFIG, TEST_TITLES as BASE_TEST_TITLES, clean_ocr
from curated_pretest_vocab import get_passage_pretest_vocab

TEST_TITLES = dict(BASE_TEST_TITLES)
TEST_TITLES[8] = ("VSTEP READING MOCK TEST 08", [
    ("Passage 1: The Commercial Space Exploration Era", "Kỷ nguyên khám phá không gian tư nhân: SpaceX và khai khoáng tiểu hành tinh"),
    ("Passage 2: Procrastination & Working Memory", "Tâm lý học về sự trì hoãn (Procrastination) và trí nhớ làm việc"),
    ("Passage 3: Noun Classes & Grammatical Gender", "Hệ thống phân loại danh từ và giống ngữ pháp trong các ngôn ngữ"),
    ("Passage 4: Super-alloys & Nickel Refining", "Hợp kim siêu bền (Super-alloys) và công nghệ tinh luyện quặng Niken")
])
TEST_TITLES[9] = ("VSTEP READING MOCK TEST 09", [
    ("Passage 1: Failure: The Secret Ingredient of Success", "Thất bại như một đòn bẩy tất yếu cho sự đổi mới và thành công"),
    ("Passage 2: Peru's Transoceanic Highway", "Xa lộ Xuyên Đại Dương tại Peru: Cơ hội kinh tế và thách thức môi trường Amazon"),
    ("Passage 3: The Cockayne Project of 1614", "Dự án Cockayne năm 1614 và cuộc khủng hoảng ngành dệt nhuộm nước Anh"),
    ("Passage 4: Sustainable Fishing & Marine Conservation", "Đánh bắt thủy sản bền vững và Hội đồng Quản lý Biển (MSC)")
])
TEST_TITLES[10] = ("VSTEP READING MOCK TEST 10", [
    ("Passage 1: Pigments & Cultural Meaning of Colors", "Nguồn gốc sắc tố tự nhiên và biểu tượng văn hóa của các gam màu"),
    ("Passage 2: The 1908 Olympic Marathon & Dorando Pietri", "Kịch tính cuộc đua Marathon Olympic 1908 và câu chuyện của Dorando Pietri"),
    ("Passage 3: Kübler-Ross & The Five Stages of Grief", "Mô hình 5 giai đoạn tâm lý đau buồn của Elisabeth Kübler-Ross"),
    ("Passage 4: Compressed Natural Gas (CNG) Vehicles", "Công nghệ phương tiện chạy bằng khí thiên nhiên nén (CNG)")
])

# Load pre-parsed tests 8, 9, 10 from mocktests/data.js
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

CURATED_VOCAB = {
    1: [
        {"word": "discreetly", "pos": "adv", "ipa": "/dɪˈskriːt.li/", "mean": "kín đáo, cẩn trọng"},
        {"word": "appalling", "pos": "adj", "ipa": "/əˈpɔː.lɪŋ/", "mean": "kinh khủng, tồi tệ"},
        {"word": "coincidence", "pos": "n", "ipa": "/kəʊˈɪn.sɪ.dəns/", "mean": "sự trùng hợp"},
        {"word": "differentiate", "pos": "v", "ipa": "/ˌdɪf.əˈren.ʃi.eɪt/", "mean": "phân biệt"},
        {"word": "fast-twitch", "pos": "adj", "ipa": "/ˌfɑːst ˈtwɪtʃ/", "mean": "co giật nhanh (sợi cơ)"},
        {"word": "fatigue", "pos": "n", "ipa": "/fəˈtiːɡ/", "mean": "sự mệt mỏi suy kiệt"},
        {"word": "incandescent", "pos": "adj", "ipa": "/ˌɪn.kænˈdes.ənt/", "mean": "sợi đốt, phát sáng khi nóng"},
        {"word": "flicker", "pos": "v", "ipa": "/ˈflɪk.ər/", "mean": "nhấp nháy, chập chờn"},
        {"word": "kerosene", "pos": "n", "ipa": "/ˈker.ə.siːn/", "mean": "dầu hỏa thắp sáng"},
        {"word": "perceived value", "pos": "n", "ipa": "/pəˈsiːvd ˈvæl.juː/", "mean": "giá trị cảm nhận của khách hàng"}
    ],
    2: [
        {"word": "inhospitable", "pos": "adj", "ipa": "/ˌɪn.hɒsˈpɪt.ə.bəl/", "mean": "khắc nghiệt, khó sinh sống"},
        {"word": "depression", "pos": "n", "ipa": "/dɪˈpreʃ.ən/", "mean": "vùng trũng sụt lún địa chất"},
        {"word": "dormant", "pos": "adj", "ipa": "/ˈdɔː.mənt/", "mean": "ngủ yên, tạm ngừng hoạt động"},
        {"word": "sacred", "pos": "adj", "ipa": "/ˈseɪ.krɪd/", "mean": "thiêng liêng, tôn kính"},
        {"word": "caffeine", "pos": "n", "ipa": "/ˈkæf.iːn/", "mean": "chất kích thích cafein"},
        {"word": "adenosine", "pos": "n", "ipa": "/əˈden.ə.siːn/", "mean": "chất dẫn truyền thần kinh gây buồn ngủ"},
        {"word": "tolerance", "pos": "n", "ipa": "/ˈtɒl.ər.əns/", "mean": "sự dung nạp, nhờn thuốc"},
        {"word": "physiology", "pos": "n", "ipa": "/ˌfɪz.iˈɒl.ə.dʒi/", "mean": "sinh lý học cơ thể"},
        {"word": "myoglobin", "pos": "n", "ipa": "/ˌmaɪ.əʊˈɡləʊ.bɪn/", "mean": "protein liên kết oxy trong cơ bắp"},
        {"word": "endurance", "pos": "n", "ipa": "/ɪnˈdʒʊə.rəns/", "mean": "sức bền, tính dẻo dai"}
    ],
    3: [
        {"word": "post-impressionism", "pos": "n", "ipa": "/ˌpəʊst ɪmˈpreʃ.ən.ɪ.zəm/", "mean": "trường phái Hậu Ấn tượng"},
        {"word": "cliff dwelling", "pos": "n", "ipa": "/klɪf ˈdwel.ɪŋ/", "mean": "nhà ở vách đá dựng đứng"},
        {"word": "abandonment", "pos": "n", "ipa": "/əˈbæn.dən.mənt/", "mean": "sự rời bỏ hoang phế"},
        {"word": "canvas", "pos": "n", "ipa": "/ˈkæn.vəs/", "mean": "toan tranh, vải vẽ sơn dầu"},
        {"word": "avant-garde", "pos": "adj", "ipa": "/ˌæv.ɑ̃ːˈɡɑːd/", "mean": "tiên phong, đột phá nghệ thuật"},
        {"word": "factoring", "pos": "n", "ipa": "/ˈfæk.tər.ɪŋ/", "mean": "bao thanh toán hoá đơn tài chính"},
        {"word": "liquidity", "pos": "n", "ipa": "/lɪˈkwɪd.ə.ti/", "mean": "tính thanh khoản nguồn vốn"},
        {"word": "supplier", "pos": "n", "ipa": "/səˈplaɪ.ər/", "mean": "nhà cung cấp trong chuỗi"},
        {"word": "arbitrage", "pos": "n", "ipa": "/ˈɑː.bɪ.trɑːʒ/", "mean": "kinh doanh chênh lệch giá"},
        {"word": "receivables", "pos": "n", "ipa": "/rɪˈsiː.və.bəlz/", "mean": "các khoản phải thu khách hàng"}
    ],
    4: [
        {"word": "seismology", "pos": "n", "ipa": "/saɪzˈmɒl.ə.dʒi/", "mean": "địa chấn học, nghiên cứu động đất"},
        {"word": "tectonic plate", "pos": "n", "ipa": "/tekˈtɒn.ɪk pleɪt/", "mean": "mảng kiến tạo thạch quyển"},
        {"word": "fluctuation", "pos": "n", "ipa": "/ˌflʌk.tʃuˈeɪ.ʃən/", "mean": "sự dao động, biến động tỷ giá"},
        {"word": "hedging", "pos": "n", "ipa": "/ˈhedʒ.ɪŋ/", "mean": "nghiệp vụ phòng hộ rủi ro"},
        {"word": "turbine", "pos": "n", "ipa": "/ˈtɜː.baɪn/", "mean": "tua-bin gió quay phát điện"},
        {"word": "renewable", "pos": "adj", "ipa": "/rɪˈnjuː.ə.bəl/", "mean": "tái tạo (năng lượng sạch)"},
        {"word": "nanotechnology", "pos": "n", "ipa": "/ˌnæn.əʊ.tekˈnɒl.ə.dʒi/", "mean": "công nghệ nano siêu vi"},
        {"word": "targeted therapy", "pos": "n", "ipa": "/ˈtɑː.ɡɪ.tɪd ˈθer.ə.pi/", "mean": "liệu pháp điều trị trúng đích"},
        {"word": "biocompatible", "pos": "adj", "ipa": "/ˌbaɪ.əʊ.kəmˈpæt.ə.bəl/", "mean": "tương thích sinh học cao"},
        {"word": "toxicity", "pos": "n", "ipa": "/tɒkˈsɪs.ə.ti/", "mean": "độc tính đối với cơ thể"}
    ],
    5: [
        {"word": "afro-brazilian", "pos": "adj", "ipa": "/ˌæf.rəʊ brəˈzɪl.jən/", "mean": "văn hóa gốc Phi tại Brazil"},
        {"word": "syncretism", "pos": "n", "ipa": "/ˈsɪŋ.krə.tɪ.zəm/", "mean": "sự dung hợp tín ngưỡng tôn giáo"},
        {"word": "zoonotic", "pos": "adj", "ipa": "/ˌzəʊ.əˈnɒt.ɪk/", "mean": "bệnh truyền lây từ động vật sang người"},
        {"word": "reservoir", "pos": "n", "ipa": "/ˈrez.ə.vwɑːr/", "mean": "vật chủ mang trùng tự nhiên"},
        {"word": "neuroimaging", "pos": "n", "ipa": "/ˌnjʊə.rəʊˈɪm.ɪ.dʒɪŋ/", "mean": "chụp ảnh cộng hưởng từ chức năng não"},
        {"word": "cognitive", "pos": "adj", "ipa": "/ˈkɒɡ.nə.tɪv/", "mean": "thuộc về nhận thức, tư duy"},
        {"word": "thermal gradient", "pos": "n", "ipa": "/ˈθɜː.məl ˈɡreɪ.di.ənt/", "mean": "chênh lệch nhiệt độ theo độ sâu"},
        {"word": "evaporator", "pos": "n", "ipa": "/ɪˈvæp.ər.eɪ.tər/", "mean": "thiết bị làm bay hơi môi chất"},
        {"word": "desalination", "pos": "n", "ipa": "/diːˌsæl.ɪˈneɪ.ʃən/", "mean": "quá trình khử muối nước biển"},
        {"word": "condenser", "pos": "n", "ipa": "/kənˈden.sər/", "mean": "bộ phận ngưng tụ làm nguội"}
    ],
    6: [
        {"word": "neurotransmitter", "pos": "n", "ipa": "/ˌnjʊə.rəʊ.trænzˈmɪt.ər/", "mean": "chất dẫn truyền xung thần kinh"},
        {"word": "circadian rhythm", "pos": "n", "ipa": "/sɜːˈkeɪ.di.ən ˈrɪð.əm/", "mean": "nhịp sinh học ngày đêm"},
        {"word": "melatonin", "pos": "n", "ipa": "/ˌmel.əˈtəʊ.nɪn/", "mean": "hormone tạo giấc ngủ tự nhiên"},
        {"word": "cognition", "pos": "n", "ipa": "/kɒɡˈnɪʃ.ən/", "mean": "năng lực nhận thức, xử lý thông tin"},
        {"word": "vocalization", "pos": "n", "ipa": "/ˌvəʊ.kəl.aɪˈzeɪ.ʃən/", "mean": "sự phát âm, bắt chước giọng nói"},
        {"word": "antibiotic", "pos": "n", "ipa": "/ˌæn.ti.baɪˈɒt.ɪk/", "mean": "thuốc kháng sinh diệt khuẩn"},
        {"word": "serendipity", "pos": "n", "ipa": "/ˌser.ənˈdɪp.ə.ti/", "mean": "sự tình cờ may mắn phát minh"},
        {"word": "bacteriophage", "pos": "n", "ipa": "/bækˈtɪə.ri.ə.feɪdʒ/", "mean": "thực khuẩn thể diệt vi khuẩn"},
        {"word": "penicillin", "pos": "n", "ipa": "/ˌpen.əˈsɪl.ɪn/", "mean": "kháng sinh Penicillin chiết xuất từ mốc"},
        {"word": "mutation", "pos": "n", "ipa": "/mjuːˈteɪ.ʃən/", "mean": "đột biến kháng thuốc của vi sinh vật"}
    ],
    7: [
        {"word": "asylum", "pos": "n", "ipa": "/əˈsaɪ.ləm/", "mean": "viện tâm thần, nơi an dưỡng"},
        {"word": "humanitarian", "pos": "adj", "ipa": "/hjuːˌmæn.ɪˈteə.ri.ən/", "mean": "mang tính nhân đạo sâu sắc"},
        {"word": "inland waterway", "pos": "n", "ipa": "/ˈɪn.lənd ˈwɔː.tə.weɪ/", "mean": "tuyến đường thủy nội địa"},
        {"word": "decibel", "pos": "n", "ipa": "/ˈdes.ɪ.bel/", "mean": "đơn vị đo cường độ âm thanh (dB)"},
        {"word": "cardiovascular", "pos": "adj", "ipa": "/ˌkɑː.di.əʊˈvæs.kjə.lər/", "mean": "thuộc tim mạch hệ tuần hoàn"},
        {"word": "theropod", "pos": "n", "ipa": "/ˈθer.ə.pɒd/", "mean": "khủng long chân thú đi bằng hai chân"},
        {"word": "feathered", "pos": "adj", "ipa": "/ˈfeð.əd/", "mean": "có lông vũ bao phủ cơ thể"},
        {"word": "wishbone", "pos": "n", "ipa": "/ˈwɪʃ.bəʊn/", "mean": "xương chạc ba nối cánh loài chim"},
        {"word": "fossilization", "pos": "n", "ipa": "/ˌfɒs.əl.aɪˈzeɪ.ʃən/", "mean": "quá trình hóa thạch địa chất"},
        {"word": "anatomical", "pos": "adj", "ipa": "/ˌæn.əˈtɒm.ɪ.kəl/", "mean": "thuộc về cấu trúc giải phẫu học"}
    ],
    8: [
        {"word": "commercialization", "pos": "n", "ipa": "/kəˌmɜː.ʃəl.aɪˈzeɪ.ʃən/", "mean": "thương mại hóa dịch vụ vũ trụ"},
        {"word": "orbital", "pos": "adj", "ipa": "/ˈɔː.bɪ.təl/", "mean": "thuộc quỹ đạo bay quanh Trái Đất"},
        {"word": "procrastination", "pos": "n", "ipa": "/prəˌkræs.tɪˈneɪ.ʃən/", "mean": "sự trì hoãn công việc"},
        {"word": "working memory", "pos": "n", "ipa": "/ˌwɜː.kɪŋ ˈmem.ər.i/", "mean": "trí nhớ làm việc ngắn hạn"},
        {"word": "grammatical gender", "pos": "n", "ipa": "/ɡrəˌmæt.ɪ.kəl ˈdʒen.dər/", "mean": "giống ngữ pháp của danh từ"},
        {"word": "arbitrary", "pos": "adj", "ipa": "/ˈɑː.bɪ.trər.i/", "mean": "tùy ý, không theo quy luật cố định"},
        {"word": "metallurgy", "pos": "n", "ipa": "/məˈtæl.ə.dʒi/", "mean": "ngành luyện kim và chiết xuất khoáng sản"},
        {"word": "corrosion-resistant", "pos": "adj", "ipa": "/kəˈrəʊ.ʒən rɪˈzɪs.tənt/", "mean": "chống gỉ sét ăn mòn hóa học"},
        {"word": "smelting", "pos": "n", "ipa": "/ˈsmel.tɪŋ/", "mean": "quá trình nấu luyện quặng kim loại"},
        {"word": "super-alloy", "pos": "n", "ipa": "/ˈsuː.pər ˈæl.ɔɪ/", "mean": "hợp kim siêu bền chịu nhiệt cao"}
    ],
    9: [
        {"word": "resilience", "pos": "n", "ipa": "/rɪˈzɪl.jəns/", "mean": "khả năng phục hồi, kiên cường vượt khó"},
        {"word": "perseverance", "pos": "n", "ipa": "/ˌpɜː.sɪˈvɪə.rəns/", "mean": "sự kiên trì theo đuổi mục tiêu"},
        {"word": "transoceanic", "pos": "adj", "ipa": "/ˌtrænz.əʊ.ʃiˈæn.ɪk/", "mean": "xuyên đại dương"},
        {"word": "biodiversity", "pos": "n", "ipa": "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/", "mean": "đa dạng sinh học tự nhiên"},
        {"word": "monopoly", "pos": "n", "ipa": "/məˈnɒp.əl.i/", "mean": "sự độc quyền kinh doanh thương mại"},
        {"word": "unmanufactured", "pos": "adj", "ipa": "/ˌʌn.mæn.jʊˈfæk.tʃəd/", "mean": "chưa qua chế biến thành phẩm"},
        {"word": "stewardship", "pos": "n", "ipa": "/ˈstjuː.əd.ʃɪp/", "mean": "sự quản lý và bảo tồn bền vững"},
        {"word": "overfishing", "pos": "n", "ipa": "/ˌəʊ.vəˈfɪʃ.ɪŋ/", "mean": "đánh bắt cá quá mức"},
        {"word": "subsidy", "pos": "n", "ipa": "/ˈsʌb.sɪ.di/", "mean": "khoản trợ cấp tài chính"},
        {"word": "depletion", "pos": "n", "ipa": "/dɪˈpliː.ʃən/", "mean": "sự cạn kiệt nguồn tài nguyên"}
    ],
    10: [
        {"word": "pigment", "pos": "n", "ipa": "/ˈpɪɡ.mənt/", "mean": "sắc tố màu hữu cơ và vô cơ"},
        {"word": "symbolism", "pos": "n", "ipa": "/ˈsɪm.bəl.ɪ.zəm/", "mean": "tính biểu tượng văn hóa"},
        {"word": "ochre", "pos": "n", "ipa": "/ˈəʊ.kər/", "mean": "khoáng vật đất son màu đỏ vàng"},
        {"word": "marathon", "pos": "n", "ipa": "/ˈmær.ə.θən/", "mean": "cuộc đua chạy đường dài"},
        {"word": "exhaustion", "pos": "n", "ipa": "/ɪɡˈzɔːs.tʃən/", "mean": "sự kiệt sức hoàn toàn"},
        {"word": "disqualify", "pos": "v", "ipa": "/dɪsˈkwɒl.ɪ.faɪ/", "mean": "loại khỏi cuộc thi vì phạm quy"},
        {"word": "grief", "pos": "n", "ipa": "/ɡriːf/", "mean": "nỗi đau buồn, mất mát sâu sắc"},
        {"word": "acceptance", "pos": "n", "ipa": "/əkˈsep.təns/", "mean": "giai đoạn chấp nhận thực tại"},
        {"word": "compressed natural gas", "pos": "n", "ipa": "/kəmˈprest ˈnætʃ.ər.əl ɡæs/", "mean": "khí thiên nhiên nén (CNG)"},
        {"word": "emission", "pos": "n", "ipa": "/iˈmɪʃ.ən/", "mean": "khí thải ra môi trường"}
    ]
}

VI_DIACRITIC = r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]"
STOPWORDS = {"the", "to", "of", "in", "for", "is", "are", "and", "or", "on", "at", "by", "with", "from", "that", "this", "it", "as", "be", "an"}

QUESTION_START_RE = re.compile(
    r"^(?:\d+[\.\)\s]+)?(?:What|Why|How|Where|Which|The word|The phrase|According to|In paragraph|It can be|In which|Who|All of the|When|From the)",
    re.I
)

def word_set(s):
    ws = set(re.findall(r"[a-z0-9]{2,}", s.lower())) - STOPWORDS
    return ws if ws else set(re.findall(r"[a-z0-9]{2,}", s.lower()))

def clean_option_text(text):
    if not text:
        return ""
    text = re.sub(r"^(?:[A-D][\.\,\)\:\•\s]+|[38][\.\)]\s+|Coa\s+|\)+[\.\s]*|\. ?)+", "", text).strip()
    text = re.sub(r'\s*\d*\s*(?:10\s*Bộ\s*đ[ềể].*|VIVIAN.*|DIVIAN.*|•?IVIAN.*|Chính\s*phục.*|Chinh\s*phục.*|HỌC\s*T[ỪƯ].*|Sach-.*|Scan\s*me).*$', '', text, flags=re.IGNORECASE).strip()
    text = re.sub(r'\s+\d{2,3}\s*$', '', text).strip()
    return text

def clean_vi_ocr(text):
    if not text:
        return ""
    text = re.sub(r'\s*(?:\b\d{1,3}\s+)?(?:VIVIAN|DIVIAN|•?IVIAN|WIVIAN)\s*(?:ENGLISH(?:\s*C[A-Z]*)?|ENGLE[A-Z]*)?\s*', ' ', text, flags=re.I)
    text = re.sub(r'\s*(?:10\s*Bộ\s*đ[ềể].*|VIVIAN\s*ENGLISH.*|DIVIAN\s*ENGLISH.*|WIVIAN\s*ENGLISH.*|ENGLISH\s*C[A-Z]*|Chính\s*phục.*|Chinh\s*phục.*)', '', text, flags=re.I)
    text = text.replace("→>", "→").replace("->", "→").replace(" = Suy", " → Suy")
    text = re.sub(r"[\(\[]Đoạn\s*(\d+)[\)\]]", r"[Đoạn \1]", text)
    replacements = [
        (r"\bfìm\b", "tìm"),
        (r"\bgia đinh\b", "gia đình"),
        (r"\bđinh núi\b", "đỉnh núi"),
        (r"\bcàn thiết\b", "cần thiết"),
        (r"\bcàn\b", "cần"),
        (r"\bmim cười\b", "mỉm cười"),
        (r"\bkỳ nghi\b", "kỳ nghỉ"),
        (r"\bnghi ngơi\b", "nghỉ ngơi"),
        (r"\bphòngở\b", "phòng ở"),
        (r"'see tó", "'see to'"),
        (r"\bkhen ngọi\b", "khen ngợi"),
        (r"\bphố biến\b", "phổ biến"),
        (r"\bđơn gián\b", "đơn giản"),
        (r"\bsán xuất\b", "sản xuất"),
        (r"\bsán phẩm\b", "sản phẩm"),
        (r"\btác giá\b", "tác giả"),
        (r"\bkhán giá\b", "khán giả"),
        (r"\bđộc giá\b", "độc giả"),
        (r"\btràm trọng\b", "trầm trọng"),
        (r"\bô nhiềm\b", "ô nhiễm"),
        (r"\bô nhiêm\b", "ô nhiễm"),
        (r"\btiếng n\b", "tiếng ồn"),
        (r"\bkỳ lưỡng\b", "kỹ lưỡng"),
        (r"\btuyển nối\b", "tuyển nổi"),
        (r"\btuyến nối\b", "tuyển nổi"),
        (r"\bthúy sản\b", "thủy sản"),
        (r"\bchủ thuyền nhó\b", "chủ thuyền nhỏ"),
        (r"\bkhó hiếu\b", "khó hiểu"),
        (r"\bKHONG\b", "KHÔNG"),
        (r"\bNGOẠI TRU\b", "NGOẠI TRỪ"),
        (r"\b(?:Tu|Tù)\s+'", "Từ '"),
        (r"\bđè bài\b", "đề bài"),
        (r"\btriển lăm\b", "triển lãm"),
        (r"\bthuật ngữ chi\b", "thuật ngữ chỉ"),
        (r"\btrường phái n\s+tượng\b", "trường phái Ấn tượng"),
        (r"\btrong đoạn van\b", "trong đoạn văn"),
        (r"\br[úử]i ro\b", "rủi ro"),
        (r"\bR[úử]i ro\b", "Rủi ro"),
        (r"\bthóa thuận\b", "thỏa thuận"),
        (r"\bphải trá\b", "phải trả"),
        (r"\bxáy ra\b", "xảy ra"),
        (r"\btý giá\b", "tỷ giá"),
        (r"\bTy giá\b", "Tỷ giá"),
        (r"\bảnh hướng\b", "ảnh hưởng"),
        (r"\bđòi hói\b", "đòi hỏi"),
        (r"\btãm pin\b", "tấm pin"),
        (r"\bbất ngơ\b", "bất ngờ"),
        (r"\bmóm đá\b", "mỏm đá"),
        (r"\bkhoáng (\d)", r"khoảng \1"),
        (r"eo đon văn, kias", "Theo đoạn văn, kivas"),
    ]
    for pat, rep in replacements:
        text = re.sub(pat, rep, text)
    return re.sub(r"\s+", " ", text).strip()

def parse_vi_options_from_lines(opt_lines, is_insertion=False):
    if is_insertion:
        return {
            "A": "Vị trí [A] trong đoạn văn",
            "B": "Vị trí [B] trong đoạn văn",
            "C": "Vị trí [C] trong đoạn văn",
            "D": "Vị trí [D] trong đoạn văn",
        }
    opts = {"A": "", "B": "", "C": "", "D": ""}
    cur = None
    expanded_lines = []
    for raw_l in opt_lines:
        parts = re.split(r"\s+(?=[B-D][\.\)]\s+)", raw_l.strip())
        expanded_lines.extend(parts)

    for raw_l in expanded_lines:
        l = raw_l.strip()
        if not l:
            continue
        # Normalize Cyrillic в or leading dot
        if re.match(r"^в[\.\,\)\s]*", l):
            l = "B. " + re.sub(r"^в[\.\,\)\s]*", "", l)
        elif l.startswith(". ") and opts["A"] and not opts["B"]:
            l = "B. " + l[2:].strip()

        m_empty = re.match(r"^([A-D])[\.\,\)]?$", l)
        if m_empty:
            letter = m_empty.group(1)
            if letter == "B" and opts["B"] and not opts["C"]:
                letter = "C"
            cur = letter
            continue

        m = re.match(r"^([A-D])[\.\,\)\s]+(.+)$", l)
        if m:
            letter = m.group(1)
            val = m.group(2).strip()
            # Handle duplicate B. in Test 7 Q22
            if letter == "B" and opts["B"] and not opts["C"]:
                letter = "C"
            cur = letter
            opts[cur] = val
        else:
            # Handle unmarked option lines in OCR
            if cur == "A" and not opts["B"] and (
                l.startswith("bởi vì ông ấy nghĩ rằng tất cả")
                or l.startswith("tiêu của mình.")
                or l.startswith("Ông tin rằng những thay đổi")
            ):
                cur = "B"
                if l.startswith("tiêu của mình."):
                    opts["B"] = "Bà ấy có khả năng thuyết phục những người giàu có giúp đỡ đạt được mục " + l
                else:
                    opts["B"] = l
            elif cur == "C" and not opts["D"] and l.startswith("Quy trình Sherritt-Gordon"):
                cur = "D"
                opts["D"] = l
            elif cur is None and l.startswith("Ông ấy muốn cải thiện nền kinh tế"):
                cur = "A"
                opts["A"] = l
            elif cur:
                opts[cur] = (opts[cur] + " " + l).strip()

    for k in opts:
        opts[k] = clean_vi_ocr(re.sub(r"^[A-D][\.\,\)\s]+", "", opts[k]))
    return opts

def parse_all_40_explanations(test_num):
    exp_pages = TEST_CONFIG[test_num]["exp"]
    full_exp = ""
    for p in exp_pages:
        path = f"{CACHE_DIR}/page_{p}.txt"
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                full_exp += f.read() + "\n"
    full_exp = clean_ocr(full_exp)
    blocks = re.split(
        r"(?:→>?|•|=|->)?\s*Đáp\s*[aá]n\s*([A-D])\s*là\s*đáp\s*[aá]n\s*đúng",
        full_exp,
        flags=re.IGNORECASE,
    )
    explanations = {}
    for i in range(1, len(blocks), 2):
        q_num = (i + 1) // 2
        ans = blocks[i].strip().upper()
        content = blocks[i - 1].strip()
        
        q_en = ""
        q_vi = ""
        m_q = re.search(rf"([\s\S]+?)\s*\(([^()]*{VI_DIACRITIC}[^()]*(?:\([^()]*\)[^()]*)*)\)", content, re.I)
        if m_q:
            q_en = re.sub(r"\s+", " ", m_q.group(1)).strip()
            q_vi = clean_vi_ocr(m_q.group(2))
            q_en = re.sub(r"^.*?(?:GIẢI THÍCH ĐÁP ÁN|PASSAGE\s*\d+)\s*", "", q_en, flags=re.I).strip()
            q_en = re.sub(rf"^.*?(?:[•\*\.\~×]\s*)?\b{q_num}[\.\)]?\s+(?=[A-Z])", "", q_en).strip()
            q_en = re.sub(r"^(?:[^A-Za-z]*\d+[\.\)]?\s*)+", "", q_en).strip()
            after = content[m_q.end():].strip()
            if ("in which space" in q_en.lower() or "paraphrase" in q_en.lower()) and not ('"' in q_en and len(q_en) > 85):
                en_quote = []
                for line in after.split("\n"):
                    l = line.strip()
                    if not l or re.match(r"^\d+$", l) or "VIVIAN" in l or "DIVIAN" in l:
                        continue
                    if re.search(VI_DIACRITIC, l, re.I) or re.match(r"^[A-D][\.\s]", l):
                        break
                    en_quote.append(l)
                if en_quote:
                    q_en = q_en + ' "' + " ".join(en_quote) + '"'
        else:
            m_q2 = re.search(r"(The word \'virtually\' in the passage is closest in meaning to the word)\s+(Từ[\s\S]+?)\)", content)
            if m_q2:
                q_en = m_q2.group(1).strip()
                q_vi = clean_vi_ocr(m_q2.group(2))
            else:
                m_q3 = re.search(r"(The artist Zhu Bingren would probably most like to see that)\s*\(([^\n]+)", content)
                if m_q3:
                    q_en = m_q3.group(1).strip()
                    q_vi = clean_vi_ocr(m_q3.group(2))

        if q_en.endswith("%"):
            q_en = q_en[:-1] + "?"
        q_en = re.sub(r"\b(paragraph\s+[1-9])[237]\b", r"\1?", q_en, flags=re.I)
        q_en = re.sub(r"\bto\s+to\b", "to", q_en, flags=re.I)

        after_q = content[m_q.end():].strip() if m_q else content
        en_segments = []
        cur_en_seg = []
        vi_lines = []
        opt_lines = []
        in_vi = False
        in_opts = False
        is_ins = ("in which space" in q_en.lower() or "which space" in q_en.lower())
        is_ins_or_para = is_ins or ("paraphrase" in q_en.lower())
        skipped_target_quote = False

        for line in after_q.split("\n"):
            l = line.strip()
            if not l or re.match(r"^\d+$", l) or any(k in l for k in ["VIVIAN", "DIVIAN", "ENGLISH C", "10 Bộ"]):
                continue
            if not is_ins and (
                re.match(r"^[A-Dв][\.\,\)\s]", l)
                or (in_vi and l.startswith("Ông ấy muốn cải thiện nền kinh tế Anh"))
            ):
                in_opts = True
            if in_opts:
                opt_lines.append(l)
                continue
            has_vi = bool(re.search(VI_DIACRITIC, l, re.I))
            if not has_vi and not (is_ins_or_para and skipped_target_quote):
                cur_en_seg.append(l)
            else:
                if cur_en_seg:
                    en_segments.append(" ".join(cur_en_seg))
                    cur_en_seg = []
                if is_ins_or_para and not skipped_target_quote and en_segments:
                    skipped_target_quote = True
                in_vi = True
                vi_lines.append(l)
        if cur_en_seg:
            en_segments.append(" ".join(cur_en_seg))

        ev_en = " ... ".join(en_segments).strip()
        if not ev_en:
            m_ev_multi = re.findall(r"([A-Z][^\n]+?(?:\n[A-Za-z0-9,\'\"\-\–\s\.]+?)*\[(?:Paragraph|Đoạn)\s*\d+\])", after_q)
            if m_ev_multi:
                ev_en = re.sub(r"\s+", " ", " ... ".join(m_ev_multi)).strip()
            else:
                m_q_quote = re.search(r'\"([A-Z][^\"]{20,})\"', after_q)
                if m_q_quote:
                    ev_en = m_q_quote.group(1).strip()

        ev_vi = clean_vi_ocr(" ".join(vi_lines))
        opts_vi_dict = parse_vi_options_from_lines(opt_lines, is_insertion=is_ins)
        if test_num == 8 and q_num == 24 and not opts_vi_dict.get("C"):
            opts_vi_dict["C"] = "chúng là những danh từ không chỉ người nhưng lại có giống ngữ pháp"
        if not ev_vi and opts_vi_dict.get(ans):
            ev_vi = f"Đối chiếu nội dung toàn bài đọc với các phương án trên, phương án {ans} ({opts_vi_dict[ans]}) là đáp án chính xác."

        explanations[q_num] = {
            "ans": ans,
            "q_en": q_en,
            "q_vi": q_vi,
            "ev_en": ev_en,
            "ev_vi": ev_vi,
            "opts_vi": opts_vi_dict,
            "raw": clean_vi_ocr(content),
        }
    return explanations

def load_page_tsv(p_num):
    path = f"{LAYOUT_DIR}/page_{p_num}.tsv"
    if not os.path.exists(path):
        return []
    raw_rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t", 4)
            if len(parts) == 5:
                x, y, w, h, txt = float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]), parts[4].strip()
                if txt:
                    raw_rows.append({"page": p_num, "x": x, "y": y, "w": w, "h": h, "text": txt})
    filtered = []
    for r in raw_rows:
        txt = r["text"]
        if r["y"] > 0.895 and any(k in txt for k in ["10 Bộ", "VIVIAN", "DIVIAN", "IVIAN", "Chính phục", "Chinh phục", "ENGLISH"]):
            continue
        if r["y"] < 0.068 and re.match(r"^\d+$", txt):
            continue
        if any(k in txt for k in ["10 Bộ đề", "10 Bộ để", "10 Bộ thí", "Chính phục kỳ thi", "Chinh phục kỳ thi", "ENGLISH CENTER", "VIVIAN", "DIVIAN", "•IVIAN", "WIVIAN"]):
            continue
        if re.match(r"^Đ[ỀỂ]\s*THI$", txt, re.I):
            continue
        filtered.append(r)

    filtered.sort(key=lambda r: -r["y"])
    lines = []
    for r in filtered:
        if lines and abs(lines[-1][0]["y"] - r["y"]) < 0.010:
            lines[-1].append(r)
        else:
            lines.append([r])
    
    merged = []
    for line_boxes in lines:
        line_boxes.sort(key=lambda r: r["x"])
        cur = dict(line_boxes[0])
        for b in line_boxes[1:]:
            gap = b["x"] - (cur["x"] + cur["w"])
            if b["x"] > 0.44 and (re.match(r"^[B-D\)\.\,\:\•38]\s*", b["text"]) or gap > 0.05):
                merged.append(cur)
                cur = dict(b)
            elif re.match(r"^(?:\d+[\.\)]?|[A-D][\.\)]?)$", cur["text"]):
                cur["text"] = cur["text"].rstrip(".)") + ". " + b["text"].lstrip(". ")
                cur["w"] = (b["x"] + b["w"]) - cur["x"]
            else:
                cur["text"] = cur["text"] + " " + b["text"]
                cur["w"] = (b["x"] + b["w"]) - cur["x"]
        merged.append(cur)
    return merged

def extract_options_from_q_slice(q_slice, q_en, is_insertion):
    if is_insertion:
        return ["[A]", "[B]", "[C]", "[D]"]
    if not q_slice:
        return ["Option A", "Option B", "Option C", "Option D"]
    
    texts = [r["text"].strip() for r in q_slice]
    prompt_end = 1
    target_w = word_set(q_en)
    while prompt_end < len(texts) - 4:
        nxt = texts[prompt_end]
        if re.match(r"^[A-D][\.\,\)\:\•]\s*\S", nxt):
            break
        if len(word_set(nxt) & target_w) >= 2 or not re.search(r"[\?\:\.\"]$", texts[prompt_end - 1]):
            prompt_end += 1
        else:
            break

    opt_rows = texts[prompt_end:]
    if len(opt_rows) == 4:
        res = []
        for r_txt in opt_rows:
            if r_txt.startswith("Coa "):
                res.append("a " + r_txt[4:].strip())
            else:
                res.append(clean_option_text(r_txt))
        return res

    opts = {"A": "", "B": "", "C": "", "D": ""}
    cur = "A"
    for idx, t in enumerate(opt_rows):
        m_b = re.match(r"^(?:B[\.\,\)\:\•\s]|[38][\.\)]\s)\s*(.+)$", t)
        m_c = re.match(r"^(?:C[\.\,\)\:\•\s]|Coa\s|\.\.\s)\s*(.+)$", t)
        m_d = re.match(r"^(?:D[\.\,\)\:\•\s]|\)\.\s)\s*(.+)$", t)

        if idx == 0:
            opts["A"] = clean_option_text(t)
            cur = "A"
        elif m_b and not opts["B"]:
            cur = "B"
            opts["B"] = clean_option_text(t)
        elif m_c and not opts["C"]:
            cur = "C"
            opts["C"] = ("a " + m_c.group(1).strip()) if t.startswith("Coa ") else clean_option_text(t)
        elif m_d and not opts["D"]:
            cur = "D"
            opts["D"] = clean_option_text(t)
        else:
            if cur == "A" and not opts["B"] and idx + 1 < len(opt_rows) and re.match(r"^C[\.\,\)\:\•\s]", opt_rows[idx + 1]):
                cur = "B"
                opts["B"] = clean_option_text(t)
            elif cur == "B" and not opts["C"] and idx + 1 < len(opt_rows) and re.match(r"^D[\.\,\)\:\•\s]", opt_rows[idx + 1]):
                cur = "C"
                opts["C"] = clean_option_text(t)
            elif cur == "C" and not opts["D"] and idx == len(opt_rows) - 1:
                cur = "D"
                opts["D"] = clean_option_text(t)
            else:
                opts[cur] = clean_option_text(opts[cur] + " " + t)
    return [opts["A"], opts["B"], opts["C"], opts["D"]]

def format_passage_paragraphs(paragraphs, test_num, p_num):
    html_parts = []
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        # Fix specific OCR insertion markers in Test 1 P4 and Test 2 P2
        if test_num == 1 and p_num == 4:
            p_clean = p_clean.replace(" _B ", " [B] ").replace(" D] ", " [D] ")
        if test_num == 2 and p_num == 2:
            p_clean = p_clean.replace("enormous amounts of rice in Indonesia.", "enormous amounts of rice in Indonesia. [D]")
        
        p_clean = re.sub(r"\[([A-D])\]", r"<strong>[\1]</strong>", p_clean)
        if len(p_clean) < 35 and not re.search(r"[\.\?\!\"\'\]]$", p_clean):
            html_parts.append(f'<p class="passage-subheading"><strong>{p_clean}</strong></p>')
        else:
            html_parts.append(f"<p>{p_clean}</p>")
    return "".join(html_parts)

def reconstruct_test_ocr(test_num, exps):
    all_rows = []
    for p in TEST_CONFIG[test_num]["exam"]:
        all_rows.extend(load_page_tsv(p))

    passage_starts = []
    for idx, r in enumerate(all_rows):
        m = re.match(r"^PASSAGE\s*([1-4])$", r["text"], re.I)
        if m:
            p_num = int(m.group(1))
            expected_q_start = (p_num - 1) * 10 + 1
            for k in range(idx + 1, min(idx + 5, len(all_rows))):
                if all_rows[k]["page"] == r["page"] and re.search(rf"Questions?\s*{expected_q_start}\s*[-–—]", all_rows[k]["text"], re.I):
                    passage_starts.append((p_num, idx))
                    break

    passages_html = {}
    questions_opts = {}

    for i, (p_num, start_idx) in enumerate(passage_starts):
        end_idx = passage_starts[i + 1][1] if i + 1 < len(passage_starts) else len(all_rows)
        chunk = all_rows[start_idx:end_idx]
        q_start_num = (p_num - 1) * 10 + 1

        body_start = 0
        for idx, r in enumerate(chunk):
            txt = r["text"]
            if idx < 12:
                if re.match(r"^PASSAGE\s*\d+$", txt, re.I) or re.search(r"^Questions?\s*\d+", txt, re.I) or re.match(r"^\d+\s*minutes$", txt, re.I):
                    body_start = idx + 1
                    continue
                if any(k in txt for k in ["GHI CH", "Các câu", "Câu hỏi", "câu hỏi", "ưu tiên", "trả lời đúng"]) or txt.startswith("*"):
                    body_start = idx + 1
                    continue

        body_rows = chunk[body_start:]

        first_opt_idx = len(body_rows)
        for idx, r in enumerate(body_rows):
            if idx < 10:
                continue
            txt = r["text"]
            if re.match(r"^(?:[A-B][\.\)]\s+|A[\.\)]?$)", txt):
                for k in range(idx + 1, min(idx + 7, len(body_rows))):
                    if re.match(r"^[B-D][\.\)]\s+", body_rows[k]["text"]):
                        first_opt_idx = idx
                        break
                if first_opt_idx < len(body_rows):
                    break
            elif re.match(r"^C[\.\)]\s+", txt):
                for k in range(idx + 1, min(idx + 4, len(body_rows))):
                    if re.match(r"^D[\.\)]\s+", body_rows[k]["text"]):
                        first_opt_idx = max(10, idx - 2)
                        break
                if first_opt_idx < len(body_rows):
                    break

        q_prompt_idx = first_opt_idx
        for back in range(1, 5):
            cand_idx = first_opt_idx - back
            if cand_idx < 8:
                break
            cand_txt = body_rows[cand_idx]["text"]
            if re.match(r"^\d+[\.\)]?$", cand_txt):
                q_prompt_idx = cand_idx
                break
            if QUESTION_START_RE.match(cand_txt):
                q_prompt_idx = cand_idx
                if cand_idx - 1 >= 8 and re.match(r"^\d+[\.\)]?$", body_rows[cand_idx - 1]["text"]):
                    q_prompt_idx = cand_idx - 1
                break

        passage_rows = body_rows[:q_prompt_idx]

        page_min_x = {}
        for r in passage_rows:
            pg = r["page"]
            if r["w"] > 0.5:
                page_min_x[pg] = min(page_min_x.get(pg, 1.0), r["x"])

        paragraphs = []
        cur_para = []
        for idx, r in enumerate(passage_rows):
            pg = r["page"]
            base_x = page_min_x.get(pg, 0.06)
            is_indented = (r["x"] - base_x) > 0.016

            prev_short_end = False
            if idx > 0:
                prev_r = passage_rows[idx - 1]
                if prev_r["page"] == pg:
                    dy = prev_r["y"] - r["y"]
                    if prev_r["w"] < 0.72 and re.search(r"[\.\?\!\"\'\]]$", prev_r["text"]):
                        prev_short_end = True
                    elif dy > 0.030 and re.search(r"[\.\?\!\"\'\]]$", prev_r["text"]):
                        prev_short_end = True

            if re.match(r"^\[[A-D]\]$", r["text"].strip()):
                cur_para.append(r["text"].strip())
            elif idx > 0 and (is_indented or prev_short_end):
                paragraphs.append(" ".join(cur_para))
                cur_para = [r["text"]]
            else:
                if cur_para and cur_para[-1].endswith("-") and not cur_para[-1].endswith(" -"):
                    cur_para[-1] = cur_para[-1][:-1] + r["text"]
                else:
                    cur_para.append(r["text"])
        if cur_para:
            paragraphs.append(" ".join(cur_para))

        passages_html[p_num] = format_passage_paragraphs(paragraphs, test_num, p_num)

        raw_q_rows = body_rows[q_prompt_idx:]
        q_rows = []
        for r in raw_q_rows:
            if any(k in r["text"] for k in ["HỌC TỪ VỰNG", "HỌC TƯ VỤNG", "tienganh", "Sach-", "Scan me", "PASSAGE"]):
                continue
            q_rows.append(r)

        q_starts = [0]
        cur_search = 1
        for offset in range(1, 10):
            q_id = q_start_num + offset
            target_en = exps.get(q_id, {}).get("q_en", "")
            target_words = word_set(target_en)
            best_idx = None
            best_score = -1
            for r_idx in range(cur_search, len(q_rows)):
                txt = q_rows[r_idx]["text"]
                if re.match(r"^[A-D][\.\,\)\:\•\s]\s*\S", txt):
                    continue
                w_this = word_set(txt)
                if len(target_words & w_this) == 0 and not re.match(rf"^(?:~\s*)?{q_id}[\.\)\s]", txt):
                    continue
                comb = txt + (" " + q_rows[r_idx + 1]["text"] if r_idx + 1 < len(q_rows) and len(target_words & w_this) >= 2 else "")
                w_comb = word_set(comb)
                overlap = len(target_words & w_comb)
                score = overlap / max(1, len(target_words))
                if re.match(rf"^(?:~\s*)?{q_id}[\.\)\s]", txt):
                    score += 0.5
                if QUESTION_START_RE.match(txt):
                    score += 0.2
                if score > best_score and score >= 0.45:
                    best_score = score
                    best_idx = r_idx
                    if score >= 0.85:
                        break
            if best_idx is None:
                best_idx = min(cur_search + 4, len(q_rows) - 1)
            q_starts.append(best_idx)
            cur_search = best_idx + 2

        q_starts.append(len(q_rows))
        for offset in range(10):
            q_id = q_start_num + offset
            q_en = exps.get(q_id, {}).get("q_en", "")
            is_ins = "in which space" in q_en.lower() or "which space" in q_en.lower()
            q_slice = q_rows[q_starts[offset]:q_starts[offset + 1]]
            questions_opts[q_id] = extract_options_from_q_slice(q_slice, q_en, is_ins)

    return passages_html, questions_opts

def clean_digitized_passage_html(raw_html):
    # Remove leading &nbsp; inside <p> tags and format [A]..[D]
    cleaned = re.sub(r"<p>\s*(?:&nbsp;|\s)+", "<p>", raw_html)
    cleaned = re.sub(r"\[([A-D])\]", r"<strong>[\1]</strong>", cleaned)
    # Fix Test 8 P2 split paragraph
    cleaned = cleaned.replace("bring people many benefits. </p><p><em>The fact is", "bring people many benefits. <em>The fact is")
    # Fix Test 8 P3 merged paragraph 4 & 5
    cleaned = cleaned.replace("Mond (moon) is masculine. In some languages, such as modern Greek", "Mond (moon) is masculine.</p><p>In some languages, such as modern Greek")
    # Fix Test 10 P4 page-break split and paragraph breaks
    cleaned = cleaned.replace("converting current vehicles</p><p>from using gasoline to using CNG.", "converting current vehicles from using gasoline to using CNG.")
    cleaned = cleaned.replace("fluctuations in the inational market", "fluctuations in the international market")
    cleaned = cleaned.replace("meeting <b>this</b> demand. Most of the market", "meeting <b>this</b> demand.</p><p>Most of the market")
    cleaned = cleaned.replace("growth in the United States. Compressed natural gas is produced", "growth in the United States.</p><p>Compressed natural gas is produced")
    cleaned = cleaned.replace("Using CNG is good for the economy. In addition, because of the political", "Using CNG is good for the economy.</p><p>In addition, because of the political")
    cleaned = cleaned.replace("CNG vehicles on the road. Converting a vehicle that currently", "CNG vehicles on the road.</p><p>Converting a vehicle that currently")
    cleaned = cleaned.replace("using the vehicles immediately. Because of the simplicity", "using the vehicles immediately.</p><p>Because of the simplicity")
    return cleaned

def find_sentence_for_question(passage_html, q_en, corr_ans, corr_opt_text=""):
    paras_raw = re.findall(r"<p[^>]*>([\s\S]*?)</p>", passage_html)
    paras_plain = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", p)).strip() for p in paras_raw]
    paras_plain = [p for p in paras_plain if len(p) > 25]

    plain = re.sub(r"<[^>]+>", " ", passage_html)
    plain = re.sub(r"\s+", " ", plain).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[\.\?\!])\s+", plain) if len(s.strip()) > 15]
    if not sentences:
        return ""

    # Check if question specifies a target paragraph number
    m_para = re.search(r"paragraph\s+(\d+)", q_en, re.I)
    target_para_sentences = []
    if m_para:
        p_idx = int(m_para.group(1)) - 1
        if 0 <= p_idx < len(paras_plain):
            target_para_sentences = [
                s.strip() for s in re.split(r"(?<=[\.\?\!])\s+", paras_plain[p_idx]) if len(s.strip()) > 15
            ]

    search_pools = [target_para_sentences, sentences] if target_para_sentences else [sentences]

    m_w = re.search(r"(?:word|phrase)\s*['\"]?([A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)['\"]?\s+(?:in\s+paragraph|is\s+closest|could\s+be|refers|mean)", q_en, re.I)
    if m_w:
        target = m_w.group(1).strip()
        words_t = target.split()
        alt_target = (words_t[0] + "s " + " ".join(words_t[1:])) if len(words_t) > 1 else (target + "s")
        stem = words_t[0].rstrip("s")
        for pool in search_pools:
            for s in pool:
                sl = s.lower()
                if target.lower() in sl or alt_target.lower() in sl:
                    return s
            for s in pool:
                sl = s.lower()
                if len(stem) >= 3 and re.search(rf"\b{re.escape(stem.lower())}\w*\b", sl):
                    return s
    if "in which space" in q_en.lower() or "which space" in q_en.lower():
        marker = f"[{corr_ans}]"
        for idx, s in enumerate(sentences):
            if marker in s:
                prev_s = sentences[idx - 1] if idx > 0 else ""
                return (prev_s + " " + s).strip()
    m_quote = re.search(r'"([^"]{20,})"', q_en)
    if m_quote:
        return m_quote.group(1).strip()
    # Keyword overlap fallback with question + correct option
    kw = word_set(q_en + " " + corr_opt_text) - {"paragraph", "passage", "author", "writer", "mention", "mentioned", "following", "statement", "true", "not", "mainly", "about", "what", "which", "why", "how"}
    pool_to_use = target_para_sentences if target_para_sentences else sentences
    best_s = pool_to_use[0]
    best_ov = -1
    for s in pool_to_use:
        ov = len(kw & word_set(s))
        if ov > best_ov:
            best_ov = ov
            best_s = s
    return best_s

def classify_question_type(q_en):
    ql = q_en.lower()
    if "mainly about" in ql or "main idea" in ql or "best title" in ql or "purpose of the passage" in ql or "heading for" in ql:
        return "DẠNG 01: CÂU HỎI Ý CHÍNH / TIÊU ĐỀ (Main Idea)"
    if "closest in meaning" in ql or "replaced with" in ql or "replaced by" in ql or "mean by" in ql:
        return "DẠNG 02: CÂU HỎI TỪ VỰNG (Vocabulary in Context)"
    if "refers to" in ql or "refer to" in ql:
        return "DẠNG 03: CÂU HỎI THAM CHIẾU (Reference)"
    if "in which space" in ql or "which space" in ql:
        return "DẠNG 04: CÂU HỎI CHÈN CÂU (Sentence Insertion)"
    if "paraphrase" in ql:
        return "DẠNG 05: CÂU HỎI DIỄN GIẢI CÂU (Paraphrasing)"
    if "infer" in ql or "imply" in ql or "implies" in ql or "probably" in ql or "attitude" in ql or "why does the author" in ql or "why did the author" in ql:
        return "DẠNG 06: CÂU HỎI SUY LUẬN / MỤC ĐÍCH (Inference & Purpose)"
    return "DẠNG 07: CÂU HỎI THÔNG TIN CHI TIẾT (Factual Detail)"

def build_test(test_num):
    meta = TEST_TITLES[test_num]
    ans_key = ANSWER_KEYS[test_num]
    exp_dict = parse_all_40_explanations(test_num)
    
    test_obj = {
        "testId": f"TEST{test_num:02d}",
        "testNum": test_num,
        "title": meta[0],
        "description": f"Đề thi thử Đọc hiểu VSTEP số {test_num:02d} (Đầy đủ 4 Passages - 40 câu hỏi - Chuẩn B1-B2-C1)",
        "duration": 3600,
        "passages": []
    }
    
    if test_num in digitized_tests:
        parts = digitized_tests[test_num]
        q_counter = 1
        for p_idx, part in enumerate(parts):
            p_title, p_topic = meta[1][p_idx]
            p_html = clean_digitized_passage_html(part.get('passage', ''))
            p_questions = []
            for q in part.get('questions', []):
                q_id = q_counter
                q_counter += 1
                exp_info = exp_dict.get(q_id, {})
                corr_ans = exp_info.get('ans') or ans_key.get(q_id, q.get('correctAnswer', 'A'))
                corr_idx = ord(corr_ans) - ord('A')
                
                q_prompt = q.get('question', exp_info.get('q_en', f"Question {q_id}"))
                q_vi = exp_info.get('q_vi', '')
                opts_vi_dict = exp_info.get('opts_vi', {})
                raw_exp = exp_info.get('raw', '')
                opts_raw = q.get('options', [])
                opts_clean = [clean_option_text(o) for o in opts_raw]
                opts_vi = [opts_vi_dict.get(chr(65+i), '') for i in range(4)]
                corr_opt_text = opts_clean[corr_idx] if 0 <= corr_idx < len(opts_clean) else ""
                ev_en = exp_info.get('ev_en', '') or find_sentence_for_question(p_html, q_prompt, corr_ans, corr_opt_text)
                ev_vi = exp_info.get('ev_vi', '')
                
                p_questions.append({
                    "id": q_id,
                    "num": q_id,
                    "question": q_prompt,
                    "questionVi": q_vi,
                    "questionType": classify_question_type(q_prompt),
                    "options": opts_clean,
                    "optionsVi": opts_vi,
                    "correctAnswer": corr_ans,
                    "correctIdx": corr_idx,
                    "evidence": ev_en,
                    "evidenceVi": ev_vi,
                    "explanation": raw_exp if raw_exp else f"Đáp án đúng là {corr_ans} theo dẫn chứng chi tiết trong bài đọc."
                })
            
            test_obj['passages'].append({
                "partId": p_idx + 1,
                "title": p_title,
                "topic": p_topic,
                "timeAllowed": 15,
                "passage": p_html,
                "vocab": get_passage_pretest_vocab(test_num, p_idx + 1, p_title, p_html),
                "questions": p_questions
            })
        return test_obj
    
    # Tests 1-7 reconstructed from Vision OCR layout TSVs + 40 explanations
    passages_html, questions_opts = reconstruct_test_ocr(test_num, exp_dict)
    
    for p_idx in range(4):
        p_num = p_idx + 1
        p_title, p_topic = meta[1][p_idx]
        p_html = passages_html.get(p_num, f"<p>Passage content for {p_title}</p>")
        q_start = p_idx * 10 + 1
        q_end = (p_idx + 1) * 10
        
        p_questions = []
        for q_id in range(q_start, q_end + 1):
            exp_info = exp_dict.get(q_id, {})
            corr_ans = exp_info.get('ans') or ans_key.get(q_id, 'A')
            corr_idx = ord(corr_ans) - ord('A')
            
            q_en = exp_info.get('q_en', f"Question {q_id}")
            q_vi = exp_info.get('q_vi', '')
            opts_vi_dict = exp_info.get('opts_vi', {})
            raw_exp = exp_info.get('raw', '')
            is_insertion = 'in which space' in q_en.lower() or 'which space' in q_en.lower()
            if is_insertion:
                final_opts_en = ["[A]", "[B]", "[C]", "[D]"]
                opts_vi = [opts_vi_dict.get(chr(65+i), f"Vị trí [{chr(65+i)}] trong đoạn văn") for i in range(4)]
            else:
                final_opts_en = questions_opts.get(q_id, ["Option A", "Option B", "Option C", "Option D"])
                opts_vi = [opts_vi_dict.get(chr(65+i), '') for i in range(4)]

            corr_opt_text = final_opts_en[corr_idx] if 0 <= corr_idx < len(final_opts_en) else ""
            ev_en = exp_info.get('ev_en', '') or find_sentence_for_question(p_html, q_en, corr_ans, corr_opt_text)
            ev_vi = exp_info.get('ev_vi', '')
            
            p_questions.append({
                "id": q_id,
                "num": q_id,
                "question": q_en,
                "questionVi": q_vi,
                "questionType": classify_question_type(q_en),
                "options": final_opts_en,
                "optionsVi": opts_vi,
                "correctAnswer": corr_ans,
                "correctIdx": corr_idx,
                "evidence": ev_en,
                "evidenceVi": ev_vi,
                "explanation": raw_exp if raw_exp else f"Đáp án đúng là {corr_ans} theo dẫn chứng chi tiết trong bài đọc."
            })
        
        test_obj['passages'].append({
            "partId": p_num,
            "title": p_title,
            "topic": p_topic,
            "timeAllowed": 15,
            "passage": p_html,
            "vocab": get_passage_pretest_vocab(test_num, p_num, p_title, p_html),
            "questions": p_questions
        })
    
    return test_obj

if __name__ == "__main__":
    all_tests = []
    for t in range(1, 11):
        t_data = build_test(t)
        total_q = sum(len(p['questions']) for p in t_data['passages'])
        print(f"Test {t:02d} built successfully: {len(t_data['passages'])} passages, {total_q} questions.")
        all_tests.append(t_data)

    js_content = "/**\n * VSTEP READING MOCK TESTS (10 FULL TESTS)\n * Source: 10 Bo De Thi Doc Hieu VSTEP B1-B2-C1\n */\n"
    js_content += "var READING_MOCK_TESTS = " + json.dumps(all_tests, ensure_ascii=False, indent=2) + ";\n\n"
    js_content += 'if (typeof module !== "undefined" && module.exports) { module.exports = READING_MOCK_TESTS; }\n'
    js_content += 'if (typeof window !== "undefined") { window.READING_MOCK_TESTS = READING_MOCK_TESTS; }\n'
    js_content += 'if (typeof globalThis !== "undefined") { globalThis.READING_MOCK_TESTS = READING_MOCK_TESTS; }\n'

    with open(OUTPUT_DATA, 'w', encoding='utf-8') as f:
        f.write(js_content)
    with open(OUTPUT_ROOT, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"\nMaster datasets saved successfully to:\n - {OUTPUT_DATA} ({len(js_content)} bytes)\n - {OUTPUT_ROOT} ({len(js_content)} bytes)")
