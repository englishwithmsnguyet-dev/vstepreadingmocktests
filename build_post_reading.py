# -*- coding: utf-8 -*-
"""
Generate Post-Reading Key Vocabulary for Deduction and Paraphrasing
across all 10 VSTEP Reading Mock Tests (400 questions).
"""

import json
import re

def clean_str(s):
    if not s:
        return ''
    s = re.sub(r'\[Paragraph \d+\]', '', s).strip()
    s = re.sub(r'\[Đoạn \d+\]', '', s).strip()
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def extract_quotes(text):
    m = re.findall(r"['\"]([^'\"]+)['\"]", text)
    return m if m else []

def find_subphrase(sentence, words_list):
    """Find a compact subphrase containing important words from words_list."""
    sentence_words = sentence.split()
    if len(sentence_words) <= 12:
        return sentence
    # Try finding first occurrence of any keyword
    low_sent = sentence.lower()
    for w in words_list:
        w_low = w.lower().strip(',.;:')
        if len(w_low) > 3 and w_low in low_sent:
            idx = low_sent.find(w_low)
            start = max(0, idx - 30)
            end = min(len(sentence), idx + len(w_low) + 50)
            sub = sentence[start:end].strip()
            if start > 0: sub = '...' + sub
            if end < len(sentence): sub = sub + '...'
            return sub
    return ' '.join(sentence_words[:12]) + '...'

def build_post_reading_entry(q, passage, test_num):
    q_num = q.get('num', 0)
    q_text = clean_str(q.get('question', ''))
    q_vi = clean_str(q.get('questionVi', ''))
    q_type = q.get('questionType', 'DẠNG 07: CÂU HỎI THÔNG TIN CHI TIẾT (Factual Detail)')
    correct_idx = q.get('correctIdx', 0)
    correct_ans = q.get('correctAnswer', 'A')
    
    options = q.get('options', [])
    options_vi = q.get('optionsVi', [])
    correct_opt = clean_str(options[correct_idx]) if options and len(options) > correct_idx else ''
    correct_opt_vi = clean_str(options_vi[correct_idx]) if options_vi and len(options_vi) > correct_idx else ''
    
    evidence = clean_str(q.get('evidence', ''))
    evidence_vi = clean_str(q.get('evidenceVi', ''))
    explanation = clean_str(q.get('explanation', ''))
    
    quotes = extract_quotes(q_text)
    q_lower = q_text.lower()
    
    # -------------------------------------------------------------
    # Case 1: Vocabulary in Context ("closest in meaning to")
    # -------------------------------------------------------------
    if 'closest in meaning' in q_lower or 'dạng 02' in q_type.lower():
        target_w = quotes[0] if quotes else q_text.split()[-5]
        return {
            "type": "vocabulary",
            "typeLabel": "Từ vựng ngữ cảnh (Vocabulary)",
            "cluePassage": f'"{evidence}"' if evidence else f'Từ ngữ trong đoạn: "{target_w}"',
            "clueAnswer": f'"{correct_opt}"',
            "keyPassage": target_w,
            "keyAnswer": correct_opt,
            "paraphrasePair": f"{target_w} <=> {correct_opt}",
            "meaningVi": f"'{target_w}' đồng nghĩa với '{correct_opt}' ({correct_opt_vi})",
            "deductionLogic": f"Trong ngữ cảnh của bài đọc, từ/cụm từ '{target_w}' mang nghĩa tương đương trực tiếp với '{correct_opt}', giúp bạn dễ dàng khẳng định đáp án đúng là {correct_ans}."
        }

    # -------------------------------------------------------------
    # Case 2: Reference Question ("The word ... refers to")
    # -------------------------------------------------------------
    if 'refers to' in q_lower or 'dạng 03' in q_type.lower():
        target_ref = quotes[0] if quotes else 'từ đại từ'
        return {
            "type": "reference",
            "typeLabel": "Tham chiếu đại từ (Reference)",
            "cluePassage": f'"{evidence}"' if evidence else f'Câu chứa đại từ "{target_ref}"',
            "clueAnswer": f'"{correct_opt}"',
            "keyPassage": target_ref,
            "keyAnswer": correct_opt,
            "paraphrasePair": f"{target_ref} => {correct_opt}",
            "meaningVi": f"Đại từ '{target_ref}' thay thế cho danh từ '{correct_opt}' ({correct_opt_vi})",
            "deductionLogic": f"Dựa vào vị trí ngữ pháp và số ít/số nhiều của danh từ xuất hiện ngay trước đó trong bài đọc, đại từ '{target_ref}' quy chiếu chính xác đến đối tượng '{correct_opt}'."
        }

    # -------------------------------------------------------------
    # Case 3: Sentence Insertion ("will the following sentence fit")
    # -------------------------------------------------------------
    if 'fit' in q_lower and ('sentence' in q_lower or 'marked' in q_lower) or 'dạng 04' in q_type.lower():
        return {
            "type": "insertion",
            "typeLabel": "Chèn câu vào văn bản (Cohesion)",
            "cluePassage": f'"{evidence}"' if evidence else f'Vị trí [{correct_ans}] trong đoạn văn',
            "clueAnswer": f'Vị trí [{correct_ans}]',
            "keyPassage": f"Mạch phát triển ý tại vị trí [{correct_ans}]",
            "keyAnswer": f"Vị trí [{correct_ans}]",
            "paraphrasePair": f"Mạch liên kết logic <=> Vị trí [{correct_ans}]",
            "meaningVi": f"Câu cần chèn khớp với mạch ý trước và sau vị trí [{correct_ans}]",
            "deductionLogic": f"Câu cho trước có các từ nối và đại từ chỉ định liên kết chặt chẽ với câu đi trước và mở ý cho câu tiếp theo tại vị trí [{correct_ans}]."
        }

    # -------------------------------------------------------------
    # Case 4: Main Idea / Title / Summary
    # -------------------------------------------------------------
    if 'mainly about' in q_lower or 'main idea' in q_lower or 'best title' in q_lower or 'dạng 01' in q_type.lower():
        return {
            "type": "main_idea",
            "typeLabel": "Ý chính & Chủ đề (Main Idea)",
            "cluePassage": f'"{evidence[:150]}..."' if len(evidence) > 150 else f'"{evidence}"',
            "clueAnswer": f'"{correct_opt}"',
            "keyPassage": "Ý bao quát toàn bài / đoạn",
            "keyAnswer": correct_opt,
            "paraphrasePair": f"Chủ đề xuyên suốt <=> {correct_opt}",
            "meaningVi": f"Ý chính của bài đọc <=> {correct_opt_vi}",
            "deductionLogic": f"Dẫn chứng từ câu chủ đề mở đoạn và các luận điểm phát triển xuyên suốt đều tập trung vào nội dung '{correct_opt}', các đáp án còn lại quá hẹp hoặc không chính xác."
        }

    # -------------------------------------------------------------
    # Case 5: Negative / EXCEPT / NOT Mentioned
    # -------------------------------------------------------------
    if 'not mentioned' in q_lower or 'not true' in q_lower or 'except' in q_lower or 'not' in q_lower:
        return {
            "type": "negative",
            "typeLabel": "Tìm thông tin không có (Negative Detail)",
            "cluePassage": f'"{evidence[:150]}..."' if len(evidence) > 150 else f'"{evidence}"',
            "clueAnswer": f'"{correct_opt}" (Không được đề cập)',
            "keyPassage": "Thông tin bài đọc đề cập",
            "keyAnswer": f"NOT / Không có: {correct_opt}",
            "paraphrasePair": f"Các yếu tố có trong bài <=> Ngoại trừ: {correct_opt}",
            "meaningVi": f"3 phương án kia đều có dẫn chứng, riêng '{correct_opt}' không xuất hiện",
            "deductionLogic": f"Các phương án khác đều được bài đọc nhắc đến với các từ khóa tương ứng, trong khi phương án {correct_ans} ('{correct_opt}') hoàn toàn không được bài đọc nhắc tới hoặc trái ngược với bài đọc."
        }

    # -------------------------------------------------------------
    # Case 6: Factual Detail & Inference (Paraphrase Mapping)
    # -------------------------------------------------------------
    # Extract significant words from correct option (length > 3, exclude stopwords)
    stop_words = {'that', 'this', 'with', 'from', 'they', 'them', 'their', 'were', 'have', 'been', 'which', 'about', 'some', 'what', 'when', 'more', 'than'}
    opt_words = [w.strip(',.;:') for w in correct_opt.split() if len(w) > 3 and w.lower() not in stop_words]
    
    clue_snippet = find_subphrase(evidence, opt_words)
    
    # Formulate pair
    key_passage = clue_snippet if len(clue_snippet) < 60 else (clue_snippet[:55] + '...')
    key_ans = correct_opt if len(correct_opt) < 60 else (correct_opt[:55] + '...')
    clean_kp = key_passage.replace('"', '').strip()
    clean_ka = key_ans.replace('"', '').strip()

    return {
        "type": "detail",
        "typeLabel": "Suy luận chi tiết (Factual Paraphrase)",
        "cluePassage": f'"{evidence}"',
        "clueAnswer": f'"{correct_opt}"',
        "keyPassage": clean_kp,
        "keyAnswer": clean_ka,
        "paraphrasePair": f"{clean_kp} <=> {clean_ka}",
        "meaningVi": f"Dẫn chứng bài đọc ({evidence_vi[:60]}...) <=> {correct_opt_vi}",
        "deductionLogic": f"Bài đọc dùng cách diễn đạt tương đương (paraphrase) trong câu dẫn chứng để truyền tải cùng một thông điệp với đáp án {correct_ans} ('{correct_opt}'). Học viên nhận diện cụm từ tương đương này sẽ chốt được đáp án ngay lập tức."
    }

def main():
    with open('tests_data.js', 'r', encoding='utf-8') as f:
        text = f.read()

    prefix = 'var READING_MOCK_TESTS = '
    start = text.find(prefix)
    end = text.rfind(';\n\nif (typeof window')
    tests = json.loads(text[start + len(prefix):end].strip())

    total_processed = 0
    for t_idx, t in enumerate(tests):
        test_num = t.get('testNum', t_idx + 1)
        for p_idx, p in enumerate(t['passages']):
            for q_idx, q in enumerate(p['questions']):
                total_processed += 1
                q['postReading'] = build_post_reading_entry(q, p, test_num)

    print(f"Generated postReading entries for {total_processed} questions across {len(tests)} tests.")

    # Write back to tests_data.js and data/tests_data.js
    header = "/**\n * VSTEP READING MOCK TESTS (10 FULL TESTS)\n * Source: 10 Bo De Thi Doc Hieu VSTEP B1-B2-C1\n */\nvar READING_MOCK_TESTS = "
    footer = ";\n\nif (typeof window !== \"undefined\") { window.READING_MOCK_TESTS = READING_MOCK_TESTS; }\nif (typeof globalThis !== \"undefined\") { globalThis.READING_MOCK_TESTS = READING_MOCK_TESTS; }\n"
    new_code = header + json.dumps(tests, ensure_ascii=False, indent=2) + footer

    with open('tests_data.js', 'w', encoding='utf-8') as f:
        f.write(new_code)

    try:
        with open('data/tests_data.js', 'w', encoding='utf-8') as f:
            f.write(new_code)
        print("Updated data/tests_data.js as well.")
    except Exception as e:
        print("Could not update data/tests_data.js:", e)

    print("Successfully built and saved Post-Reading deduction data!")

if __name__ == '__main__':
    main()
