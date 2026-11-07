# -*- coding: utf-8 -*-
"""
Build and expand full 400-word academic vocabulary database (40 words per test across 10 tests).
"""
import os
import json
import re

EXPANDED_VOCAB = {
    1: {
        1: [
            {"word": "fortnight", "pos": "n", "ipa": "/ˈfɔːt.naɪt/", "level": "B1", "mean": "hai tuần lễ (14 ngày)", "syns": ["two weeks", "fourteen days"], "ex": "They spent a relaxing fortnight by the coast during their summer holiday."},
            {"word": "discreetly", "pos": "adv", "ipa": "/dɪˈskriːt.li/", "level": "B2", "mean": "một cách kín đáo, tinh tế, khéo léo", "syns": ["tactfully", "carefully", "unobtrusively"], "ex": "The assistant discreetly reminded the speaker that his time was running out."},
            {"word": "come across", "pos": "phr.v", "ipa": "/kʌm əˈkrɒs/", "level": "B1", "mean": "tình cờ tìm thấy, bắt gặp", "syns": ["find by chance", "encounter", "discover"], "ex": "I came across some old family photographs while cleaning out the attic."},
            {"word": "appalling", "pos": "adj", "ipa": "/əˈpɔː.lɪŋ/", "level": "B2", "mean": "tồi tệ, kinh khủng", "syns": ["terrible", "dreadful", "awful"], "ex": "The rescue team had to work in appalling weather conditions all night."},
            {"word": "coincidence", "pos": "n", "ipa": "/kəʊˈɪn.sɪ.dəns/", "level": "B2", "mean": "sự trùng hợp ngẫu nhiên", "syns": ["chance occurrence", "concurrence"], "ex": "By pure coincidence, we booked seats on the exact same flight to London."},
            {"word": "see to", "pos": "phr.v", "ipa": "/siː tuː/", "level": "B2", "mean": "chăm sóc, lo liệu, giải quyết", "syns": ["take care of", "attend to", "handle"], "ex": "Don't worry about the travel arrangements; I will see to everything tomorrow."},
            {"word": "secluded", "pos": "adj", "ipa": "/sɪˈkluː.dɪd/", "level": "B2", "mean": "hẻo lánh, yên tĩnh, tách biệt ồn ào", "syns": ["isolated", "peaceful", "remote"], "ex": "The travelers rented a secluded cottage surrounded by green hills."},
            {"word": "accommodate", "pos": "v", "ipa": "/əˈkɒm.ə.deɪt/", "level": "B2", "mean": "cung cấp chỗ ở; đáp ứng nhu cầu", "syns": ["lodge", "house", "provide space for"], "ex": "The countryside resort was large enough to accommodate over three hundred guests."},
            {"word": "hospitable", "pos": "adj", "ipa": "/hɒsˈpɪt.ə.bəl/", "level": "B2", "mean": "hiếu khách, mến khách", "syns": ["welcoming", "friendly", "generous"], "ex": "The local villagers were remarkably hospitable to international backpackers."},
            {"word": "picturesque", "pos": "adj", "ipa": "/ˌpɪk.tʃərˈesk/", "level": "B2", "mean": "đẹp như tranh vẽ (phong cảnh)", "syns": ["scenic", "charming", "attractive"], "ex": "They took a scenic stroll through the picturesque coastal fishing village."}
        ],
        2: [
            {"word": "elite athlete", "pos": "phrase", "ipa": "/ɪˈliːt ˈæθ.liːt/", "level": "B2", "mean": "vận động viên ưu tú, đỉnh cao", "syns": ["top-tier competitor", "world-class sportsperson"], "ex": "Becoming an elite athlete requires years of strict discipline and daily training."},
            {"word": "genetics", "pos": "n", "ipa": "/dʒəˈnet.ɪks/", "level": "B2", "mean": "di truyền học, yếu tố di truyền", "syns": ["heredity", "genetic makeup"], "ex": "Modern research shows that both genetics and lifestyle influence human longevity."},
            {"word": "fast-twitch fibers", "pos": "phrase", "ipa": "/ˌfɑːst ˈtwɪtʃ ˈfaɪ.bərz/", "level": "C1", "mean": "sợi cơ co rút nhanh", "syns": ["rapid-contraction muscle fibers"], "ex": "Short-distance runners rely heavily on fast-twitch fibers for explosive speed."},
            {"word": "fatigue", "pos": "v/n", "ipa": "/fəˈtiːɡ/", "level": "B2", "mean": "sự mệt mỏi; làm suy giảm thể lực", "syns": ["exhaust", "tire out", "weariness"], "ex": "Drivers should take regular breaks on long trips to avoid mental fatigue."},
            {"word": "generate", "pos": "v", "ipa": "/ˈdʒen.ə.reɪt/", "level": "B2", "mean": "tạo ra, sản sinh (năng lượng, nhiệt)", "syns": ["release", "produce", "create"], "ex": "Solar panels on the roof generate enough electricity to power the entire house."},
            {"word": "lactic acid", "pos": "n", "ipa": "/ˌlæk.tɪk ˈæs.ɪd/", "level": "B2", "mean": "axit lactic (hợp chất sinh ra trong cơ khi vận động mạnh)", "syns": ["muscle metabolic byproduct"], "ex": "Stretching after intense exercise helps the body clear lactic acid more quickly."},
            {"word": "endurance", "pos": "n", "ipa": "/ɪnˈdʒʊə.rəns/", "level": "B2", "mean": "sức bền, khả năng chịu đựng dẻo dai", "syns": ["stamina", "resilience", "staying power"], "ex": "Marathon runners require extraordinary endurance and mental focus."},
            {"word": "physiological", "pos": "adj", "ipa": "/ˌfɪz.i.əˈlɒdʒ.ɪ.kəl/", "level": "C1", "mean": "thuộc về sinh lý học cơ thể", "syns": ["biological", "bodily", "physical"], "ex": "High altitude induces complex physiological changes in human breathing."},
            {"word": "rigorously", "pos": "adv", "ipa": "/ˈrɪɡ.ər.əs.li/", "level": "B2", "mean": "một cách nghiêm ngặt, khắt khe", "syns": ["strictly", "thoroughly", "demanding"], "ex": "Olympic swimmers train rigorously for six hours every single day."},
            {"word": "innate", "pos": "adj", "ipa": "/ɪˈneɪt/", "level": "C1", "mean": "bẩm sinh, có sẵn từ khi sinh ra", "syns": ["inborn", "natural", "inherent"], "ex": "Great musicians often combine innate talent with thousands of hours of practice."}
        ],
        3: [
            {"word": "incandescent", "pos": "adj", "ipa": "/ˌɪn.kænˈdes.ənt/", "level": "C1", "mean": "nóng sáng, phát sáng do đốt nóng", "syns": ["glowing with heat", "filament-based"], "ex": "Many households have replaced old incandescent bulbs with energy-saving LEDs."},
            {"word": "filament", "pos": "n", "ipa": "/ˈfɪl.ə.mənt/", "level": "B2", "mean": "dây tóc bóng đèn, sợi mảnh", "syns": ["thin wire", "conducting thread"], "ex": "When the electric current passes through the thin filament, it glows brightly."},
            {"word": "kerosene lamp", "pos": "phrase", "ipa": "/ˈker.ə.siːn læmp/", "level": "B2", "mean": "đèn dầu hỏa thắp sáng", "syns": ["paraffin lamp", "fuel oil lantern"], "ex": "Before electricity reached the village, families studied by the light of a kerosene lamp."},
            {"word": "flicker", "pos": "v", "ipa": "/ˈflɪk.ər/", "level": "B2", "mean": "nhấp nháy, chập chờn (ánh lửa/ánh đèn)", "syns": ["glimmer", "waver", "flutter"], "ex": "The candle flame began to flicker as a cool breeze blew through the window."},
            {"word": "conventional", "pos": "adj", "ipa": "/kənˈven.ʃən.əl/", "level": "B2", "mean": "thông thường, truyền thống, tiêu chuẩn", "syns": ["standard", "traditional", "regular"], "ex": "She prefers holistic remedies over conventional medicine for minor colds."},
            {"word": "amplify", "pos": "v", "ipa": "/ˈæm.plɪ.faɪ/", "level": "B2", "mean": "khuếch đại, làm tăng cường độ", "syns": ["intensify", "magnify", "boost"], "ex": "Acoustic guitars use a hollow wooden body to amplify the sound of the strings."},
            {"word": "illuminate", "pos": "v", "ipa": "/ɪˈluː.mɪ.neɪt/", "level": "B2", "mean": "chiếu sáng, thắp sáng", "syns": ["light up", "brighten", "clarify"], "ex": "Street lamps illuminate the downtown pedestrian boulevard every evening."},
            {"word": "revolutionize", "pos": "v", "ipa": "/ˌrev.əˈluː.ʃən.aɪz/", "level": "B2", "mean": "cách mạng hóa, tạo đột phá lớn", "syns": ["transform", "overhaul", "reform"], "ex": "Digital photography completely revolutionized the way people share moments."},
            {"word": "breakthrough", "pos": "n", "ipa": "/ˈbreɪk.θruː/", "level": "B2", "mean": "bước đột phá, phát kiến mới", "syns": ["major advance", "discovery", "quantum leap"], "ex": "Scientists announced a historic breakthrough in solid-state battery technology."},
            {"word": "luminescent", "pos": "adj", "ipa": "/ˌluː.mɪˈnes.ənt/", "level": "C1", "mean": "phát quang, tỏa ánh sáng lạnh", "syns": ["glowing", "radiant", "light-emitting"], "ex": "Deep-sea jellyfish possess fascinating luminescent organs to attract prey."}
        ],
        4: [
            {"word": "aspire", "pos": "v", "ipa": "/əˈspaɪər/", "level": "B2", "mean": "hướng tới, khao khát đạt mục tiêu", "syns": ["aim", "strive", "seek"], "ex": "Many young graduates aspire to build a meaningful career in technology."},
            {"word": "perceived value", "pos": "phrase", "ipa": "/pəˈsiːvd ˈvæl.juː/", "level": "C1", "mean": "giá trị cảm nhận của khách hàng", "syns": ["customer-estimated worth", "subjective value"], "ex": "Attractive packaging can significantly increase the perceived value of a product."},
            {"word": "focus group", "pos": "phrase", "ipa": "/ˈfəʊ.kəs ɡruːp/", "level": "B2", "mean": "nhóm khách hàng khảo sát trọng tâm", "syns": ["consumer interview panel"], "ex": "The company organized a focus group to gather honest feedback on the new design."},
            {"word": "objective", "pos": "adj", "ipa": "/əbˈdʒek.tɪv/", "level": "B2", "mean": "khách quan, không thiên vị", "syns": ["impartial", "unbiased", "neutral"], "ex": "Journalists must remain objective and verify all facts before publishing a report."},
            {"word": "psychological pricing", "pos": "phrase", "ipa": "/ˌsaɪ.kəlˈɒdʒ.ɪ.kəl ˈpraɪ.sɪŋ/", "level": "C1", "mean": "chiến lược định giá theo tâm lý", "syns": ["charm pricing", "behavioral pricing"], "ex": "Setting the price at $19.99 instead of $20 is a classic example of psychological pricing."},
            {"word": "break even", "pos": "phrase", "ipa": "/breɪk ˈiː.vən/", "level": "B2", "mean": "hòa vốn (không lãi không lỗ)", "syns": ["cover costs", "balance expenses and revenue"], "ex": "The new café needs to sell at least two hundred cups a day just to break even."},
            {"word": "profit margin", "pos": "phrase", "ipa": "/ˈprɒf.ɪt ˌmɑː.dʒɪn/", "level": "B2", "mean": "biên độ lợi nhuận", "syns": ["net return", "markup percentage"], "ex": "Supermarkets generally operate on a low profit margin with very high sales volume."},
            {"word": "consumer willingness", "pos": "phrase", "ipa": "/kənˈsjuː.mər ˈwɪl.ɪŋ.nəs/", "level": "C1", "mean": "mức độ sẵn sàng chi trả của khách hàng", "syns": ["buyer readiness to pay"], "ex": "Market research evaluates consumer willingness to pay for eco-friendly goods."},
            {"word": "undercut", "pos": "v", "ipa": "/ˌʌn.dəˈkʌt/", "level": "B2", "mean": "bán hạ giá so với đối thủ cạnh tranh", "syns": ["underprice", "charge less than"], "ex": "Online retailers often undercut traditional high-street shops on electronics."},
            {"word": "premium", "pos": "adj/n", "ipa": "/ˈpriː.mi.əm/", "level": "B2", "mean": "cao cấp, chất lượng thượng hạng; mức giá phụ trội", "syns": ["high-end", "superior", "exclusive"], "ex": "Luxury car brands charge a premium for handcrafted leather interiors."}
        ]
    },
    2: {
        1: [
            {"word": "non-perishable", "pos": "adj", "ipa": "/ˌnɒnˈper.ɪ.ʃə.bəl/", "level": "B2", "mean": "lâu hỏng, bảo quản được dài ngày", "syns": ["long-lasting", "shelf-stable"], "ex": "Hikers should pack non-perishable food such as nuts, dried fruit, and canned beans."},
            {"word": "salt crust", "pos": "phrase", "ipa": "/sɒlt krʌst/", "level": "B2", "mean": "lớp váng muối kết tinh trên mặt đất", "syns": ["saline surface layer"], "ex": "Walking across the fragile salt crust requires extreme caution to avoid falling through."},
            {"word": "geothermal", "pos": "adj", "ipa": "/ˌdʒiː.əʊˈθɜː.məl/", "level": "B2", "mean": "thuộc về địa nhiệt lòng đất", "syns": ["earth-heated", "volcanic-thermal"], "ex": "Iceland harnesses geothermal energy to generate hot water and electricity for homes."},
            {"word": "barren", "pos": "adj", "ipa": "/ˈbær.ən/", "level": "B2", "mean": "cằn cỗi, không có cây cối sinh sống", "syns": ["infertile", "arid", "lifeless"], "ex": "After months of drought, the once lush pasture became dry and barren."},
            {"word": "mirage", "pos": "n", "ipa": "/mɪˈrɑːʒ/", "level": "B2", "mean": "ảo ảnh trên sa mạc hoặc đường nhựa", "syns": ["optical illusion", "hallucination"], "ex": "Thirsty wanderers were disappointed to realize the shimmering blue lake was merely a mirage."},
            {"word": "hostile", "pos": "adj", "ipa": "/ˈhɒs.taɪl/", "level": "B2", "mean": "khắc nghiệt, nguy hiểm, khó sống", "syns": ["unfavorable", "severe", "inhospitable"], "ex": "Polar bears possess thick layers of fat to survive in hostile Arctic conditions."},
            {"word": "inhospitable", "pos": "adj", "ipa": "/ˌɪn.hɒsˈpɪt.ə.bəl/", "level": "B2", "mean": "khắc nghiệt, khó sinh sống", "syns": ["unwelcoming", "harsh", "forbidding"], "ex": "The frozen tundra of Antarctica is one of the most inhospitable places on Earth."},
            {"word": "expedition", "pos": "n", "ipa": "/ˌek.spəˈdɪʃ.ən/", "level": "B2", "mean": "chuyến thám hiểm, hành trình khám phá", "syns": ["journey", "exploration", "mission"], "ex": "The geological expedition mapped ancient volcanic craters across the plateau."},
            {"word": "dehydration", "pos": "n", "ipa": "/ˌdiː.haɪˈdreɪ.ʃən/", "level": "B2", "mean": "tình trạng mất nước cơ thể", "syns": ["fluid depletion", "extreme dryness"], "ex": "Desert travelers must drink water regularly to prevent severe dehydration."},
            {"word": "terrain", "pos": "n", "ipa": "/təˈreɪn/", "level": "B2", "mean": "địa hình, bề mặt đất đai", "syns": ["landscape", "topography", "ground"], "ex": "The four-wheel-drive vehicle struggled over the jagged rocky terrain."}
        ],
        2: [
            {"word": "crater", "pos": "n", "ipa": "/ˈkreɪ.tər/", "level": "B2", "mean": "miệng núi lửa", "syns": ["volcanic vent", "caldera"], "ex": "Hikers stood at the rim of the volcano to peer into the massive smoking crater."},
            {"word": "dormant", "pos": "adj", "ipa": "/ˈdɔː.mənt/", "level": "B2", "mean": "ngủ yên, tạm ngừng hoạt động", "syns": ["inactive", "sleeping", "quiescent"], "ex": "The dormant volcano has not experienced an explosive eruption for over three centuries."},
            {"word": "stratovolcano", "pos": "n", "ipa": "/ˌstræt.əʊ.vɒlˈkeɪ.nəʊ/", "level": "C1", "mean": "núi lửa dạng tầng (hình nón đối xứng)", "syns": ["composite volcano"], "ex": "Mount Fuji is a classic stratovolcano formed by layers of hardened ash and lava."},
            {"word": "worship", "pos": "v/n", "ipa": "/ˈwɜː.ʃɪp/", "level": "B2", "mean": "thờ phụng, tôn sùng linh thiêng", "syns": ["revere", "venerate", "honor"], "ex": "Pilgrims climb the sacred mountain to worship sunrise deities at dawn."},
            {"word": "pilgrimage", "pos": "n", "ipa": "/ˈpɪl.ɡrɪ.mɪdʒ/", "level": "B2", "mean": "chuyến hành hương viếng chốn linh thiêng", "syns": ["religious journey", "holy visit"], "ex": "Every summer, thousands of people make a respectful pilgrimage to the summit shrine."},
            {"word": "majestic", "pos": "adj", "ipa": "/məˈdʒes.tɪk/", "level": "B2", "mean": "hùng vĩ, tráng lệ, uy nghi", "syns": ["grand", "magnificent", "awe-inspiring"], "ex": "The snow-capped peak looked truly majestic against the crystal clear blue sky."},
            {"word": "erupt", "pos": "v", "ipa": "/ɪˈrʌpt/", "level": "B2", "mean": "phun trào (núi lửa)", "syns": ["explode", "discharge", "blow up"], "ex": "Volcanologists monitor seismic tremors before a volcano begins to erupt."},
            {"word": "altitude", "pos": "n", "ipa": "/ˈæl.tɪ.tjuːd/", "level": "B2", "mean": "độ cao so với mực nước biển", "syns": ["elevation", "height"], "ex": "Climbers rested at high altitude to acclimatize their lungs to thin air."},
            {"word": "picturesque summit", "pos": "phrase", "ipa": "/ˌpɪk.tʃərˈesk ˈsʌm.ɪt/", "level": "B2", "mean": "đỉnh núi đẹp như tranh vẽ", "syns": ["scenic mountain peak"], "ex": "Hundreds of hikers gathered to watch sunrise from the picturesque summit."},
            {"word": "venerate", "pos": "v", "ipa": "/ˈven.ər.eɪt/", "level": "C1", "mean": "tôn kính, sùng kính linh thiêng", "syns": ["revere", "honor", "worship"], "ex": "Many ancient societies venerated mountain peaks as sacred spiritual sanctuaries."}
        ],
        3: [
            {"word": "alertness", "pos": "n", "ipa": "/əˈlɜːt.nəs/", "level": "B2", "mean": "sự tỉnh táo, khả năng tập trung", "syns": ["attentiveness", "wakefulness", "focus"], "ex": "A short brisk walk in fresh morning air restores mental alertness quickly."},
            {"word": "adenosine", "pos": "n", "ipa": "/əˈden.ə.siːn/", "level": "C1", "mean": "chất a-đê-nô-zin (tạo cảm giác buồn ngủ)", "syns": ["sleep-inducing molecule"], "ex": "Adenosine gradually accumulates in the brain throughout the day, signaling tiredness."},
            {"word": "stimulant", "pos": "n", "ipa": "/ˈstɪm.jə.lənt/", "level": "B2", "mean": "chất kích thích hoạt động thần kinh", "syns": ["energizer", "activating substance"], "ex": "Caffeine is considered the world's most widely consumed central nervous stimulant."},
            {"word": "metabolism", "pos": "n", "ipa": "/məˈtæb.əl.ɪ.zəm/", "level": "B2", "mean": "quá trình trao đổi chất của cơ thể", "syns": ["metabolic rate", "energy processing"], "ex": "Regular cardiovascular exercise helps boost your resting metabolism naturally."},
            {"word": "withdrawal", "pos": "n", "ipa": "/wɪðˈdrɔː.əl/", "level": "B2", "mean": "hội chứng cai, phản ứng khi ngừng dùng", "syns": ["cessation symptom", "detox effect"], "ex": "Abruptly cutting out strong espresso can trigger mild headache withdrawal symptoms."},
            {"word": "moderate", "pos": "adj", "ipa": "/ˈmɒd.ər.ət/", "level": "B2", "mean": "vừa phải, có chừng mực, điều độ", "syns": ["reasonable", "modest", "temperate"], "ex": "Doctors emphasize that moderate coffee consumption carries positive health benefits."},
            {"word": "insomnia", "pos": "n", "ipa": "/ɪnˈsɒm.ni.ə/", "level": "B2", "mean": "chứng mất ngủ", "syns": ["sleeplessness", "sleep deprivation"], "ex": "Drinking strong coffee late in the evening often leads to severe insomnia."},
            {"word": "cognitive function", "pos": "phrase", "ipa": "/ˈkɒɡ.nə.tɪv ˈfʌŋk.ʃən/", "level": "C1", "mean": "chức năng nhận thức của não bộ", "syns": ["mental processing", "brain performance"], "ex": "Adequate sleep is critical for maintaining optimal cognitive function."},
            {"word": "intake", "pos": "n", "ipa": "/ˈɪn.teɪk/", "level": "B2", "mean": "lượng nạp vào cơ thể (thức ăn, nước, thuốc)", "syns": ["consumption", "ingestion"], "ex": "Health experts advise people to limit their daily sugar intake."},
            {"word": "cardiovascular", "pos": "adj", "ipa": "/ˌkɑː.di.əʊˈvæs.kjə.lər/", "level": "B2", "mean": "thuộc về tim mạch", "syns": ["circulatory", "heart-related"], "ex": "Aerobic exercise significantly improves overall cardiovascular health."}
        ],
        4: [
            {"word": "contraction", "pos": "n", "ipa": "/kənˈtræk.ʃən/", "level": "B2", "mean": "sự co cơ, rút ngắn của sợi cơ", "syns": ["tightening", "flexing", "shortening"], "ex": "Every heartbeat requires the coordinated contraction of cardiac muscle tissue."},
            {"word": "fiber", "pos": "n", "ipa": "/ˈfaɪ.bər/", "level": "B2", "mean": "sợi cơ, bó sợi mô", "syns": ["filament", "strand", "tissue thread"], "ex": "Skeletal muscles are comprised of thousands of individual microscopic fibers."},
            {"word": "aerobic", "pos": "adj", "ipa": "/eəˈrəʊ.bɪk/", "level": "B2", "mean": "hiếu khí (cần nhiều oxy để sản sinh năng lượng)", "syns": ["oxygen-based", "cardio"], "ex": "Jogging and cycling are excellent aerobic activities that strengthen the heart."},
            {"word": "anaerobic", "pos": "adj", "ipa": "/ˌæn.eəˈrəʊ.bɪk/", "level": "C1", "mean": "kỵ khí (hoạt động cường độ cao không dùng oxy)", "syns": ["non-oxygen powered"], "ex": "Heavy weightlifting relies on anaerobic energy pathways for explosive bursts."},
            {"word": "sedentary", "pos": "adj", "ipa": "/ˈsed.ən.tər.i/", "level": "B2", "mean": "ngồi nhiều, ít vận động thể chất", "syns": ["inactive", "desk-bound", "motionless"], "ex": "A sedentary desk lifestyle can increase the risk of back pain and joint stiffness."},
            {"word": "hypertrophy", "pos": "n", "ipa": "/haɪˈpɜː.trə.fi/", "level": "C1", "mean": "sự phì đại cơ bắp do rèn luyện", "syns": ["muscle growth", "tissue enlargement"], "ex": "Resistance training stimulates muscular hypertrophy by repairing stressed micro-fibers."},
            {"word": "exertion", "pos": "n", "ipa": "/ɪɡˈzɜː.ʃən/", "level": "C1", "mean": "sự gắng sức, nỗ lực thể lực lớn", "syns": ["strenuous effort", "physical strain"], "ex": "Heavy physical exertion causes muscles to consume oxygen at a rapid rate."},
            {"word": "atrophy", "pos": "v/n", "ipa": "/ˈæt.rə.fi/", "level": "C1", "mean": "teo cơ, thoái hóa do ít vận động", "syns": ["wither", "degenerate", "waste away"], "ex": "Muscles will quickly atrophy if a broken limb remains in a cast for weeks."},
            {"word": "elasticity", "pos": "n", "ipa": "/ˌel.æˈstɪs.ə.ti/", "level": "B2", "mean": "tính đàn hồi, độ co giãn", "syns": ["flexibility", "resilience"], "ex": "Daily stretching maintains tendon flexibility and muscular elasticity."},
            {"word": "stamina", "pos": "n", "ipa": "/ˈstæm.ɪ.nə/", "level": "B2", "mean": "thể lực bền bỉ, sức chịu đựng", "syns": ["endurance", "staying power", "energy"], "ex": "Long-distance cycling requires both physical stamina and psychological grit."}
        ]
    }
}

print("Base setup ready.")
