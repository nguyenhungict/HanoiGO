# Chapter 4 — Methodology Notes (Results & Discussions)

Tài liệu nội bộ tóm tắt **chi tiết phương pháp** cho Chapter 4 của `HanoiGO-report.tex`.
Bám khung Chapter 4 của `studybuddymatch.tex` và tuân `actions/rule-report.md`
(no over-praise, IELTS 6.0, no-invented-numbers, `\texttt{}` cho code).

Chapter 4 gồm 3 phần:

| Section | Nội dung | Trạng thái |
|---|---|---|
| 4.1 System Results | Bullet list module đã build + **T3: 5 screenshot UI** | Skeleton đã có 3 ảnh |
| 4.2 Performance Evaluation | **T1: Trip Planner Effectiveness** + **T2: Real-time Chat** | Đang làm T1 |
| 4.3 Discussion & Limitations | Hạn chế + trade-off | Sau |

Doc này tập trung **T1 (trục A)** — phần đang code. T2/T3 mô tả ngắn ở cuối.

---

## 1. T1 — Trip Planner Effectiveness

### 1.1 Câu hỏi nghiên cứu

> Lịch trình do module HanoiGO sinh ra có **tốt hơn** các cách lập lịch thủ công mà
> du khách hay tự làm hay không, và **tốt hơn ở điểm nào, bao nhiêu**?

Đây là so sánh **tương đối** (module vs thủ công), không phải đo độ chính xác tuyệt đối
của travel time. Vì vậy điều cốt lõi là cả ba phương pháp được chấm trên **cùng một
bộ dữ liệu và cùng một engine thời gian**, chỉ khác **chiến lược lập lịch**.

### 1.2 Ba phương pháp so sánh (trục A)

Cùng input: cùng tập địa điểm, cùng số ngày `numDays`, cùng tham số ngày
(giờ bắt đầu/kết thúc, nghỉ trưa, điểm xuất phát).

| # | Phương pháp | Chia ngày | Thứ tự trong ngày | Ý nghĩa |
|---|---|---|---|---|
| 1 | **HanoiGO** | K-Means++ (gom theo địa lý) | TSPTW: brute-force (exact) chọn membership+order cho ngày ≤ 8 điểm, GNN fallback ngày lớn; có time window | hệ thật |
| 2 | **By-District** | gom theo quận hành chính (`district`) | thứ tự liệt kê (ngây thơ) | baseline "tự nghĩ", hợp lý nhưng chưa tối ưu |
| 3 | **Random** | gán ngẫu nhiên vào ngày | ngẫu nhiên | baseline "không chiến lược" (cận dưới) |

- **HanoiGO**: gọi **chính `TripPlannerService.generateItinerary` của production** (xem 1.6).
- **By-District**: gom các địa điểm theo `district`, mỗi ngày ưu tiên một quận; quá
  `MAX_PLACES_PER_DAY = 5` thì cắt sang ngày kế; trong ngày giữ nguyên thứ tự đầu vào.
- **Random**: trộn ngẫu nhiên rồi chia đều vào `numDays` ngày, thứ tự ngẫu nhiên.
  Dùng RNG **có seed** để tái lập; báo cáo **trung bình trên nhiều seed** thay vì
  chọn một lần đẹp nhất.

> **Trục B (optional, sẽ cân nhắc sau):** so sánh nội bộ HanoiGO **GNN-only vs
> GNN+Brute-Force ordering** để chứng minh giá trị của Step 6 (xem
> `actions/plantrip-algorithm-analysis.md`, case "bẫy Ba Đình" 2/4 vs 4/4).

### 1.3 Bốn chỉ số đánh giá (metrics)

Tất cả do **chính engine `calculateVisitWindow` / scheduling của production** tính ra
→ tái lập được, không phải số bịa.

| Metric | Định nghĩa | Tốt khi |
|---|---|---|
| **Places visited** | Số địa điểm xếp được hợp lệ (kịp giờ mở cửa + trong giới hạn ngày) | càng **cao** |
| **Total travel time** | Tổng thời gian di chuyển giữa các điểm (phút) | càng **thấp** |
| **Total wait time** | Tổng thời gian chờ vì đến trước giờ mở cửa (phút) | càng **thấp** |
| **Compactness** | Trung bình khoảng cách các điểm tới tâm cụm mỗi ngày (km) | càng **thấp** = gọn |

Chỉ số chính là **Places visited** (đo "không bỏ lỡ địa điểm"); ba chỉ số còn lại đo
"hiệu quả/đỡ mệt".

### 1.4 Dữ liệu (fixture)

`places_import_data/places_data.json` **không có** `lat/lng` và giờ mở cửa (chỉ có
trong Postgres). Để thí nghiệm **chạy được offline, tái lập 100% và hội đồng tự kiểm
chứng**, ta dùng **fixture tự dựng**: ~12–15 địa danh Hà Nội nổi tiếng với
**toạ độ + giờ mở cửa lấy từ nguồn công khai** (Google Maps / trang chính thức).

- Đây là **dữ liệu đầu vào công khai**, không phải "kết quả đánh giá bịa ra" → tuân
  rule no-invented-numbers. Giờ mở cửa Lăng Bác (07:30–10:30), bảo tàng đóng trưa…
  ai cũng tra được.
- Fixture cố ý chứa các **time window chặt** (Lăng Bác, bảo tàng khu Ba Đình) vì đó
  chính là chỗ phương pháp thủ công dễ thất bại.

### 1.5 Travel time — Goong fetch-once-cache (Haversine fallback)

Module thật dùng **Goong Distance Matrix API** làm nguồn chính → để Chapter 4 nhất
quán Chapter 3, benchmark cũng dùng **Goong thật**, nhưng theo cơ chế
**fetch-once → đóng băng**:

1. `fetch-goong-cache.ts` gọi Goong **một lần** cho toàn bộ toạ độ trong fixture
   (origin = start + mọi điểm, destination = mọi điểm), có delay giữa các call và tái
   dùng `retry/backoff` sẵn có → lưu ma trận ra `goong-cache.json` (commit vào repo).
2. Benchmark đọc ma trận đã đóng băng → chạy **offline**, deterministic.

Ưu điểm: vừa có **road time thật của Goong**, vừa **tái lập** (chạy lại ra y hệt,
không cần API key của tác giả), vừa **đúng hành vi production** (production cũng
prefetch toàn ma trận một lần/trip, Step 3).

- **Fallback**: nếu chưa có `goong-cache.json`, benchmark tự dùng **Haversine** và in
  rõ `MODE: HAVERSINE`. Đây là code path fallback có thật của hệ thống.
- **Caveat ghi vào report**: ma trận Goong là **snapshot tại thời điểm fetch** (điều
  kiện giao thông lúc đó), motorbike mode. Câu mẫu:
  *"Travel durations were fetched once from the Goong Distance Matrix API in
  motorbike mode and frozen for reproducibility."*

### 1.6 Tính hợp lệ & công bằng (validity)

- **HanoiGO = code production thật.** Benchmark gọi thẳng
  `TripPlannerService.generateItinerary`. Chỉ thay **2 dependency bằng test double**:
  (a) Postgres → repo địa điểm in-memory (trả đúng shape `DbPlace`);
  (b) Goong API live → ma trận đã cache (qua một `fetch` mock đọc từ cache). Đây là
  kỹ thuật dependency-stubbing chuẩn, không sửa logic thuật toán.
- **Cùng engine thời gian.** Cả ba phương pháp tính feasibility bằng **cùng hàm
  `calculateVisitWindow`** (cùng parking buffer 10', cùng nghỉ trưa, cùng kiểm tra
  giờ đóng cửa) → khác biệt kết quả chỉ đến từ chiến lược chia ngày + xếp thứ tự.
- **Cùng input.** Ba phương pháp nhận đúng cùng tập địa điểm và tham số.
- **Random có seed**, báo cáo trung bình nhiều lần → không cherry-pick.

### 1.7 Hai case study (ưu tiên trực quan)

**Case 1 — "Bẫy Ba Đình" (headline, 1 ngày).** ~5 điểm khu Ba Đình + Hoàn Kiếm, có
Lăng Bác (đóng 10:30) và bảo tàng đóng trưa, xuất phát từ khách sạn Hoàn Kiếm.
Kỳ vọng: Random/By-District **bỏ lỡ** các điểm đóng sớm, HanoiGO xếp được nhiều hơn.
Trình bày: bảng route từng phương pháp + đánh dấu điểm bị drop + mini-timeline.

**Case 2 — Trip 3 ngày, ~12 điểm nhiều quận.** Trộn Ba Đình / Hoàn Kiếm / Tây Hồ +
1 điểm xa (Bát Tràng, Gia Lâm). Bảng tổng hợp **4 metric × 3 phương pháp**.

Tham số mặc định: `startTime=08:00`, `endTime=18:00`, nghỉ trưa `11:00–13:00`,
parking buffer 10', `travelDate` cố định (tránh trùng ngày đóng cửa cố định).

**(Optional) bảng batch:** 20–30 trip ngẫu nhiên (subset + numDays ngẫu nhiên), báo
cáo trung bình + "win-rate". Làm nhưng để quyết giữ/bỏ sau.

### 1.8 Sub-comparison: Goong vs Haversine (trục travel-source, optional)

Chứng minh **vì sao module dùng Goong** thay vì đường chim bay:

1. Lập lịch bằng **Haversine** → itinerary A. Lập lịch bằng **Goong** → itinerary B.
2. **Chấm cả A và B trên cùng ground-truth = ma trận Goong thật**: lấy thứ tự mỗi
   plan, mô phỏng lại timeline bằng road time thật, đếm điểm "lên kế hoạch ổn nhưng
   thực tế vỡ" (đến trễ / lỡ giờ đóng).
3. **Bẫy phải tránh:** không chấm plan-Haversine bằng chính giờ Haversine (tự nhất
   quán → che mất vấn đề). Giá trị chỉ lộ ra khi ground-truth là giờ thật.

Caveat trung thực: độ chênh phụ thuộc địa lý (trung tâm dày đặc lệch nhiều hơn). Báo
cáo đúng số chạy được; nếu nhỏ thì kết luận "Haversine đủ cho clustering nhưng Goong
cần cho sequencing" — đúng như code thật đang làm.

### 1.9 Cải tiến thuật toán mà benchmark phát hiện (ghi vào Discussion)

Lần chạy đầu tiên lộ ra một điểm yếu thật của hệ: bước sequencing dùng **GNN tham
lam** để chọn *thành viên* mỗi ngày, nên ở case bẫy Ba Đình nó neo vào điểm gần
khách sạn nhất rồi bỏ lỡ Lăng Bác (đóng 10:30) → chỉ 3/5. Đã sửa production
(`trip-planner.service.ts` + `trip-planner-scheduling.ts`) theo 2 bước, khớp đúng
điều Chapter 3 đã mô tả ("exact brute-force search for small days"):

1. Cụm ≤ `BRUTE_FORCE_MAX_PLACES` (8 điểm) dùng `bruteForceWithTimeWindow` để chọn
   **cả thành viên lẫn thứ tự** thay cho GNN; ngày lớn vẫn GNN fallback.
2. Brute-force ban đầu giả định "đi tới điểm đầu = 0 giây", nên khi cascade áp chặng
   GPS thật (~14') thì một điểm sát giờ trưa bị trượt và rớt. Thêm tham số
   `startTravelSec` để brute-force **biết chặng GPS đầu tiên** (lấy từ `startCache`
   đã prefetch) → chọn thứ tự bền vững với độ trễ thật.

Kết quả sau sửa: HanoiGO **không rớt điểm nào** ở cả 2 case, **39/39 unit test pass**.
Đây là một đóng góp đáng nêu trong báo cáo (benchmark không chỉ đo, mà còn dẫn tới
cải tiến thuật toán).

### 1.10 Kết quả thực tế (GOONG mode — ma trận đường thật, 0 cache miss)

Số do `npm run benchmark:trip` sinh ra (ghi ở `scripts/benchmark/results.json`),
travel time = ma trận Goong thật đã đóng băng (`goong-cache.json`):

| Case | Metric | HanoiGO | By-District | Random (avg) |
|---|---|---|---|---|
| 1 (bẫy Ba Đình, 1 ngày) | Điểm thăm được | **5/5** | 4/5 | 3.77/5 |
| 1 | Travel (min) | 10 | 8 | 11 |
| 1 | Compactness (km) | **0.80** | 0.91 | 0.94 |
| 2 (3 ngày, 12 điểm) | Điểm thăm được | **12/12** | 12/12 | 10.62/12 |
| 2 | Travel (min) | **40** | 76 | 87 |
| 2 | Compactness (km) | **0.35** | 1.53 | 1.94 |

Đọc số: HanoiGO **không bỏ lỡ điểm nào**; By-District rớt Bảo tàng HCM ở Case 1;
Random trung bình rớt 1–2 điểm. Ở Case 1 travel HanoiGO (10') nhỉnh hơn By-District
(8') chỉ vì nó thăm **nhiều hơn 1 điểm** (5 vs 4) — quy ra ~2 phút/điểm thì ngang
nhau. Ở Case 2 HanoiGO vừa thăm đủ 12 vừa **đi gần một nửa quãng đường** (40 vs 76').

Điểm đáng chú ý: so với Haversine, **đường thật Goong nới rộng khoảng cách hiệu quả**
(Case 2 By-District nhảy từ 43' lên 76') — vì đường thật ở Hà Nội (hồ, phố một chiều)
phạt nặng các ngày trải rộng về địa lý của By-District/Random, trong khi các ngày gọn
của HanoiGO ít bị ảnh hưởng. Đây chính là minh chứng cho việc dùng Goong thay Haversine
(liên quan sub-comparison 1.8).

---

## 2. Artifact (code benchmark)

Thư mục `actions/scripts/benchmark/`:

| File | Vai trò |
|---|---|
| `fixture-places.ts` | Place[] fixture (toạ độ + giờ mở cửa công khai) + định nghĩa scenario |
| `travel-matrix.ts` | TravelLookup (Goong cache / Haversine) + `installGoongFetchMock` |
| `methods.ts` | Random + By-District simulator, `simulateDay` (dùng `calculateVisitWindow`), `computeMetrics`, nhánh HanoiGO gọi service thật |
| `run-benchmark.ts` | Chạy scenario × phương pháp, in bảng |
| `fetch-goong-cache.ts` | Gọi Goong một lần → ghi `goong-cache.json` (cần API key) |

Chạy: `npm run benchmark:trip` (offline). Lấy số Goong thật:
`npm run benchmark:fetch-goong` (một lần, cần `GOONG_API_KEY`) rồi chạy lại.

---

## 3. T2 — Real-time Chat (đo nhẹ, tóm tắt)

Đo round-trip `send_message` → `new_message` qua `socket.io-client` với JWT thật vào
gateway local, vài mẫu, + thời gian connect/join. Bảng nhỏ (median). Cơ chế:
in-memory `onlineMap`/`typingMap` single-server, optimistic render. **Số nào xấu (vd
latency tăng khi đông client, giới hạn single-server) → đẩy xuống 4.3 Limitations.**

## 4. T3 — UI Screenshots (5 ảnh)

Discovery, Trip Planner, Activity Map, Group Chat, Admin Dashboard. Report đã có 3
(`trip-planner-ui.png`, `activity-map-ui.png`, `admin-dashboard-ui.png`); cần bổ sung
**Discovery + Group Chat** (tác giả tự chụp).
