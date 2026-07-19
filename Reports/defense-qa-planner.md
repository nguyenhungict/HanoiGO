# Trip Planner Benchmark — Defense Q&A (VN + EN)

Ôn tập cho phần **Planning Trip – Effectiveness** (4 test cases: C1 Ba Dinh, C2 Multi-district, C3 Monday closure, C4 Afternoon-only).

**Số liệu gốc để nhớ:**

| Case | Setup | HanoiGO | By-District | Random (avg 200) |
|------|-------|---------|-------------|-------------------|
| C1 Ba Dinh | 1 day, 5 places | 5/5 · 25min · 0.80km | 4/5 · 19 · 0.91 | 3.6/5 · 25 · 0.96 |
| C2 Multi-district | 3 days, 12 places | 12/12 · 100 · 0.35 | 12/12 · 112 · 1.53 | 10.2/12 · 136 · 1.93 |
| C3 Mon closed | 2 days, 8 places | 8/8 · 33 · 0.61 | 5/8 · 31 · 0.36 | 6.3/8 · 44 · 0.77 |
| C4 Late open | 1 day, 5 places | 5/5 · 27 · 0.37 | 3/5 · 15 · **404 wait** | 4.3/5 · 20 · **257 wait** |

3 chỉ số: **Places visited (↑ tốt)** · **Travel time (↓ tốt)** · **Compactness (↓ tốt)**.
Riêng C4 nhấn thêm **Wait time** (phút chờ vô ích).

---

## Q1. Tại sao chỉ Random chạy 200 lần, còn 2 method kia chạy 1 lần?

**Trả lời (VN):**
Vì HanoiGO và By-District đều **cho kết quả cố định (deterministic)** — cùng input thì luôn ra cùng output, nên chạy 1 lần là đủ. HanoiGO dùng K-Means++ với bộ sinh số cố định; By-District giữ nguyên thứ tự input. Riêng Random thì **mỗi lần chạy cho kết quả khác nhau**, nên tôi chạy 200 seed rồi lấy trung bình để con số ổn định, không bị may rủi. Đó là lý do Random ra số lẻ (3.6/5) còn hai cái kia ra số nguyên.

**Answer (EN):**
Because HanoiGO and By-District are **deterministic** — the same input always gives the same result, so one run is enough. HanoiGO uses K-Means++ with a fixed random seed, and By-District keeps the input order. Random is different every run, so I run it with 200 seeds and take the average to get a stable number that does not depend on luck. That is why Random shows a fraction (3.6/5) while the other two show whole numbers.

---

## Q2. "Gom theo district" thì trong một quận có thể đi random mà? Sao gọi là cố định?

**Trả lời (VN):**
Không random. By-District gom các điểm theo quận, nhưng **bên trong mỗi quận vẫn giữ đúng thứ tự người dùng nhập vào** (thứ tự trong dataset), rồi chia đều cho các ngày. Không có bước xáo trộn nào cả — nên nó hoàn toàn cố định. Nếu tôi cũng random bên trong quận thì nó sẽ thành một biến thể của Random, mất ý nghĩa "baseline có tư duy vùng miền".

**Answer (EN):**
No, it is not random. By-District groups places by district, but **inside each district it keeps the exact order the user entered them** (the dataset order), then splits them across the days. There is no shuffle step, so it is fully deterministic. If I shuffled within a district, it would just become a version of Random and lose its meaning as a "group-by-area" baseline.

---

## Q3. "Bộ sinh số cố định (seeded RNG)" là gì?

**Trả lời (VN):**
RNG là bộ sinh số ngẫu nhiên. "Seeded" nghĩa là nó bắt đầu từ một **hạt giống (seed) cố định**, nên chuỗi số "ngẫu nhiên" nó tạo ra luôn giống nhau mỗi lần chạy — ngẫu nhiên nhưng **lặp lại được**.
- Trong HanoiGO: K-Means++ lấy seed từ toạ độ các điểm, nên cùng một chuyến đi luôn ra cùng một lịch → trải nghiệm ổn định cho user.
- Trong benchmark Random: tôi dùng seed 1 đến 200 để tạo 200 cách xáo trộn **tái lập được**, ai chạy lại cũng ra đúng số đó.

**Answer (EN):**
RNG means random number generator. "Seeded" means it starts from a **fixed seed value**, so the "random" numbers it produces are the same every run — random but **reproducible**.
- In HanoiGO: K-Means++ takes its seed from the place coordinates, so the same trip always gives the same schedule, which keeps the user experience stable.
- In the Random benchmark: I use seeds 1 to 200 to create 200 reproducible shuffles, so anyone who re-runs it gets exactly the same numbers.

---

## Q4. 4 test case này input có phải default hết không? Mỗi case bao nhiêu ngày?

**Trả lời (VN):**
Các **thiết lập chuyến đi giống nhau** ở cả 4 case (giờ 08:00–18:00, nghỉ trưa 11:00–13:00, cùng điểm xuất phát là khách sạn cạnh Hồ Gươm). Cái **cố ý thay đổi** theo từng case là: số ngày, danh sách điểm, và ngày đi (riêng C3 đổi sang thứ Hai để dính ngày đóng cửa). Giữ mọi thứ cố định, chỉ đổi đúng cái đang test — đó là thiết kế thí nghiệm có kiểm soát.
Số ngày: **C1 = 1 ngày / 5 điểm, C2 = 3 ngày / 12 điểm, C3 = 2 ngày / 8 điểm, C4 = 1 ngày / 5 điểm.**

**Answer (EN):**
The **trip settings are the same** in all four cases (day 08:00–18:00, lunch 11:00–13:00, same hotel start point near Hoan Kiem Lake). What I **change on purpose** per case is the number of days, the list of places, and the travel date (only C3 moves to Monday to hit closing days). Everything is held constant and only the tested factor changes — this is a controlled experiment.
Days: **C1 = 1 day / 5 places, C2 = 3 days / 12 places, C3 = 2 days / 8 places, C4 = 1 day / 5 places.**

---

## Q5. Case 4 thiếu thực tế? User chọn nhà hát mở 15:00 thì sẽ tự tìm chỗ mở buổi sáng chứ ai ngồi chờ 404 phút?

**Trả lời (VN):**
Đúng, người thật sẽ không ngồi chờ như thế — và đó chính là điều Case 4 muốn chỉ ra. Con số 404 phút của By-District là do nó tới nhà hát ngay buổi sáng (vì nhà hát đứng đầu danh sách input) rồi kẹt lại chờ; nó **phụ thuộc thứ tự nhập**, là một artifact chứ không phải hành vi thật. Nên khi trình bày tôi dẫn bằng **Random trung bình 257 phút chờ** cho khách quan. Ý nghĩa của C4 không phải "thắng người thông minh", mà là: **app tự động dồn điểm mở muộn xuống cuối và lấp buổi sáng bằng chỗ khác** — làm hộ user đúng việc mà nếu tự sắp thì mất công và dễ sai. Giá trị là **tự động hoá**, không phải outsmart.

**Answer (EN):**
You are right — a real person would not sit and wait, and that is exactly the point Case 4 makes. By-District's 404 idle minutes come from visiting the theatre in the morning (it is first in the input list) and getting stuck waiting; that number **depends on input order** and is an artifact, not real behavior. So in the slide I lead with **Random's averaged 257 idle minutes** to be fair. The point of C4 is not "beating a smart person" — it is that **the app automatically pushes the late-opening venue to the end and fills the morning with other places**, doing the tedious reordering for the user. The value is **automation**, not outsmarting.

---

## Q6. Trong C1 và C4, travel time của HanoiGO CAO hơn baseline. Vậy HanoiGO tệ hơn à?

**Trả lời (VN):**
Không — phải đọc travel time **cùng với số điểm đến được**. Ở C1, By-District chỉ có 19 phút vì nó **bỏ bớt điểm** (chỉ đi 4/5), còn HanoiGO đi đủ 5/5 nên tổng quãng đường cao hơn là hợp lý. So sánh travel time chỉ công bằng khi **cùng số điểm** — rõ nhất ở C2, nơi cả ba method đều đi đủ 12 điểm, và HanoiGO thấp nhất (100 so với 112 và 136). Đó là lý do C2 là case mạnh nhất để nói về hiệu quả đường đi.

**Answer (EN):**
No — travel time must be read **together with the number of places visited**. In C1, By-District only spends 19 minutes because it **drops places** (visits just 4/5), while HanoiGO fits all 5/5, so a higher total distance is expected. Comparing travel time is only fair at the **same number of places** — clearest in C2, where all three methods fit all 12 places and HanoiGO is the lowest (100 vs 112 vs 136). That is why C2 is the strongest case for route efficiency.

---

## Q7. 4 case và 2 baseline này máy móc quá, sao không so với tâm lý người dùng thật?

**Trả lời (VN):**
Hai baseline không phải để giả lập user thật, mà là **hai mốc tham chiếu để "kẹp" giá trị của thuật toán**. By-District đại diện cho cách một người **lên kế hoạch cẩn thận, hợp lý** (gộp theo quận — điều guidebook hay làm); Random là mốc **không bỏ công lên kế hoạch**. HanoiGO phải thắng Random thoải mái và bằng hoặc hơn By-District thì mới chứng minh được giá trị.
Không so với "người thật lên kế hoạch" vì kế hoạch của người **chủ quan, không lặp lại được, không thể chạy 200 lần** để so công bằng; By-District chính là bản hình thức hoá của tư duy đó. Còn 4 case thì **lấy từ bẫy thật của tourist** (đóng 10:30, đóng thứ Hai, mở buổi chiều) — chỉ có input là giữ cố định cho công bằng. Đo hành vi user thật là **usability study** đã ghi trong Future Work.

**Answer (EN):**
The two baselines are not meant to model real users — they are **two reference points that bracket the value of the algorithm**. By-District represents a **careful, sensible manual plan** (grouping by district, which guidebooks do); Random is the **no-planning-effort** lower bound. HanoiGO has to clearly beat Random and match or beat By-District to prove its value.
I do not compare against a real person's plan because such a plan is **subjective, not reproducible, and cannot be run 200 times** for a fair comparison; By-District is the formal version of that human thinking. The four cases come from **real tourist traps** (closes at 10:30, closed on Monday, opens in the afternoon) — only the input is held fixed for fairness. Measuring real user behavior is the **usability study** listed in Future Work.

---

## Q8. Cost function của bạn là `travel × 2 + wait`. Vì sao nhân 2? Có chứng minh / cơ sở lý thuyết không?

> **Ý cốt lõi phải nói ra đầu tiên:** hệ số 2 **không nằm trong hàm mục tiêu chính**, nên nó **không phải trọng số tối ưu cần chứng minh**. Nó chỉ là **tiêu chí phá hòa (tie-break)**.

**Trả lời (VN):**
Thuật toán chạy theo **2 tầng ưu tiên**, không phải một công thức duy nhất:
- **Tầng 1 (mục tiêu thật):** xếp được **nhiều địa điểm nhất** trong khung giờ hợp lệ (tôn trọng giờ mở/đóng cửa, nghỉ trưa, giờ kết thúc). Đây mới là cái quyết định lịch.
- **Tầng 2 (chỉ phá hòa):** khi có nhiều thứ tự **cùng xếp được số điểm bằng nhau**, mới dùng `travel×2 + wait` để chọn phương án ít di chuyển hơn.

Vì tôi **không tuyên bố** "nghiệm tối ưu theo hàm này" — tôi chỉ tuyên bố "xếp được nhiều điểm nhất trong khung giờ hợp lệ" — nên hệ số 2 **không cần chứng minh tính tối ưu**; nó chỉ cần **hợp lý**.

**Ẩn dụ:** Giống thi tuyển — tiêu chí chính là **điểm thi**; chỉ khi hai thí sinh **bằng điểm** mới xét tiêu chí phụ (ưu tiên khu vực…). Không ai đòi chứng minh toán học cho tiêu chí phụ, vì nó không quyết định ai đỗ. Hệ số 2 đúng là tiêu chí phụ đó.

**Ý nghĩa con số 2:** trong code cả hai vế đều quy về **giây** (`travelSec*2 + waitMin*60`), nên tỉ lệ 2:1 là thật — **1 phút chạy xe bị coi 'đắt' gấp đôi 1 phút ngồi chờ**. Lý do: thời gian chạy xe là thời gian chết hoàn toàn, tốn xăng, mệt, nắng mưa; còn thời gian chờ thì user vẫn nghỉ/chụp ảnh tại điểm đến được. Nên ưu tiên rút ngắn quãng chạy, chấp nhận chờ thêm chút. Cả brute-force lẫn greedy dùng chung cost này nên hai đường xử lý nhất quán.

**Answer (EN):**
The algorithm runs on **two priority tiers**, not a single formula:
- **Tier 1 (the real objective):** fit the **most places** within valid time windows (opening/closing hours, lunch, end-of-day). This is what decides the schedule.
- **Tier 2 (tie-break only):** when several orders **fit the same number of places**, use `travel×2 + wait` to pick the one with less travel.

Because I **do not claim** "an optimum of this function" — I only claim "the most places fitted within valid hours" — the factor 2 **needs no optimality proof**; it only needs to be **reasonable**.

**Analogy:** like university admission — the main criterion is the **exam score**; a tie-break (regional priority…) only applies when two candidates **score equally**. Nobody demands a mathematical proof of a tie-break, because it does not decide who gets in. The factor 2 is exactly that tie-break.

**What the 2 means:** in code both terms are in **seconds** (`travelSec*2 + waitMin*60`), so the 2:1 ratio is real — **one minute of riding is treated as twice as costly as one minute of waiting**. Riding is fully dead time, costs fuel, is tiring and weather-exposed; waiting still lets the user rest or take photos at the destination. So the route favours less riding at the cost of some idle time. Both the exact and greedy paths share this cost, so they stay consistent.

**Nếu bị hỏi vặn / If pushed further:**
- *"Sao đúng là 2, không phải 1.5 hay 3?"* → Chọn theo thực nghiệm; kết quả **không nhạy cảm** với giá trị chính xác vì nó chỉ phá hòa. Ràng buộc cứng (giờ cửa, nghỉ trưa, cap điểm/ngày) và mục tiêu tầng 1 mới quyết định lịch. Đổi sang 1.5 hay 3 gần như ra lịch y hệt, chỉ khác khi hai phương án chênh nhau rất sát giữa chờ và chạy. *(Empirically chosen; result is insensitive since it only breaks ties — hard constraints and the tier-1 objective dominate; 1.5 vs 3 gives near-identical schedules.)*
- *"Hai vế có cùng đơn vị không?"* → Có, đều quy về giây; report viết `t_wait` dạng tổng quát theo giây, code quy phút chờ ×60. *(Both in seconds; the report writes `t_wait` generically in seconds, the code converts wait-minutes ×60.)*

---

## Q9. Bạn nói "vét cạn (brute-force) khi ≤ 8 điểm". Vì sao là 8? Trên 8 thì sao?

**Trả lời (VN):**
Vì mỗi ngày rất ít điểm, nên tôi thử **mọi thứ tự đi** để chọn lịch **tối ưu** — đi được nhiều điểm nhất, hoà thì chọn ít di chuyển nhất. Với 8 điểm là `8! = 40.320` hoán vị, máy chạy dưới 1ms, quá rẻ nên vét cạn được và **chắc chắn không bỏ sót** thứ tự tốt (quan trọng cho case cửa đóng sớm như Ba Đình). Trên 8 điểm thì giai thừa bùng nổ (`9!`, `10!`...) nên tôi **chuyển sang Greedy Nearest Neighbor** — mỗi bước chọn điểm gần/hợp lý nhất tiếp theo, nhanh nhưng không đảm bảo tối ưu tuyệt đối. Thực tế một ngày du lịch hiếm khi quá 5–8 điểm (cap mỗi ngày là 5), nên gần như luôn chạy nhánh vét cạn.

**Answer (EN):**
Because each day has very few places, I try **every visit order** and keep the **optimal** one — the schedule that fits the most places, with least travel as a tie-break. For 8 places that is `8! = 40,320` permutations, which runs in under 1ms, so exhaustive search is cheap and **never misses a good order** (important for early-closing cases like Ba Dinh). Above 8, the factorial explodes (`9!`, `10!`...), so I **switch to Greedy Nearest Neighbor** — pick the best next place at each step, fast but not guaranteed optimal. In practice a tourist day rarely exceeds 5–8 places (the per-day cap is 5), so the exact branch almost always runs.

---

## Q10. Vì sao dùng K-Means++ để chia ngày? Số cụm K lấy ở đâu, và sao không dùng K-Means thường?

**Trả lời (VN):**
Tôi chia các điểm thành các cụm theo **vị trí địa lý**, rồi mỗi cụm thành **một ngày** — để mỗi ngày đi loanh quanh một khu, đỡ chạy xuyên thành phố. Số cụm `K = số ngày` người dùng chọn, nên bài toán tự nhiên khớp: 3 ngày → 3 cụm. Dùng **K-Means++** (thay vì K-Means thường) vì nó chọn **tâm cụm khởi tạo trải đều hơn**, tránh trường hợp khởi tạo xấu làm cụm bị lệch. Sau khi cụm xong, nếu một cụm quá cap (5 điểm/ngày) thì điểm thừa được đẩy sang **cụm gần nhất về địa lý**, không phải cụm ít điểm nhất — để không nhét Bát Tràng (Gia Lâm) chung ngày với điểm ở Hoàn Kiếm.

**Answer (EN):**
I group the places into clusters by **geographic location**, and each cluster becomes **one day**, so each day stays within one area instead of crossing the city. The number of clusters `K = the number of days` the user picks, so it maps naturally: 3 days → 3 clusters. I use **K-Means++** (instead of plain K-Means) because it picks **initial centroids that are better spread out**, avoiding a bad start that skews the clusters. After clustering, if a cluster is over the cap (5 places/day), the extra place is moved to the **geographically closest** cluster, not the one with fewest places — so a far outlier like Bat Trang (Gia Lam) is not put on the same day as a Hoan Kiem stop.

---

## Q11. Nếu Goong Maps lỗi thì tính quãng đường thế nào? Có chính xác không?

**Trả lời (VN):**
Bình thường tôi lấy thời gian di chuyển thật từ **Goong Distance Matrix API** (theo đường thật). Nếu Goong lỗi hoặc thiếu key, hệ thống **quay về công thức Haversine** — tính khoảng cách đường chim bay giữa hai toạ độ rồi chia cho tốc độ trung bình **30 km/h** để ước lượng thời gian. Đây là phương án dự phòng nên **kém chính xác hơn** (đường chim bay ngắn hơn đường thật, và 30 km/h là ước lượng chung cho nội đô), nhưng nó giúp app **luôn trả được lịch** thay vì lỗi trắng. Trong benchmark tôi dùng một ma trận Goong đã lưu sẵn để cả 3 method dùng chung số liệu, đảm bảo công bằng.

**Answer (EN):**
Normally I get real travel times from the **Goong Distance Matrix API** (following real roads). If Goong fails or the key is missing, the system **falls back to the Haversine formula** — it takes the straight-line distance between two coordinates and divides by an average speed of **30 km/h** to estimate the time. As a fallback it is **less accurate** (straight lines are shorter than real roads, and 30 km/h is a rough city average), but it lets the app **always return a plan** instead of failing. In the benchmark I use a cached Goong matrix shared by all three methods, so the comparison stays fair.

---

## Q12. Vì sao chọn đúng 3 chỉ số này? Ở C3 thì By-District lại gọn hơn (0.36 < 0.61), vậy nó tốt hơn à?

**Trả lời (VN):**
Ba chỉ số trả lời ba câu khác nhau: **Places visited** = lịch có chạy được không (quan trọng nhất); **Travel time** = đi có hiệu quả không; **Compactness** = mỗi ngày có gọn về mặt địa lý không (đo trải nghiệm thực tế). Riêng C3, By-District gọn hơn (0.36) **chỉ vì nó bỏ mất 3 điểm** (đi 5/8), còn ít điểm thì đương nhiên gom lại thấy chặt. HanoiGO đi đủ 8/8 nên phải "với" thêm vài điểm xa hơn, compactness cao hơn chút là chấp nhận được. Đây lại đúng cái bẫy như travel time: **compactness chỉ có ý nghĩa khi đọc kèm số điểm đến được** — một lịch gọn mà bỏ nửa số điểm thì không phải lịch tốt.

**Answer (EN):**
The three metrics answer three different questions: **Places visited** = did the plan work at all (most important); **Travel time** = is it efficient; **Compactness** = is each day geographically tight (a measure of real experience). In C3, By-District looks tighter (0.36) **only because it dropped 3 places** (visits 5/8) — fewer points naturally cluster tighter. HanoiGO fits all 8/8, so it has to reach a few farther places, and a slightly higher compactness is acceptable. This is the same trap as travel time: **compactness only means something when read together with places visited** — a tight plan that skips half the places is not a good plan.

---

## Câu chốt an toàn (dùng khi bị dồn)

> "Đây là benchmark thuật toán trong điều kiện kiểm soát để so sánh công bằng và tái lập được, không phải nghiên cứu hành vi người dùng. Việc đo hành vi user thật tôi đã đề xuất là usability study trong Future Work."

> "This is a controlled algorithmic benchmark for a fair, reproducible comparison — not a user behavior study. Measuring real user behavior is proposed as a usability study in Future Work."
