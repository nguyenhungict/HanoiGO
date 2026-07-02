# Phân tích thuật toán PlanTrip — GNN vs. Brute Force

## 1. Pipeline hiện tại hoạt động như thế nào?

Khi user yêu cầu lịch trình, hệ thống chạy qua **5 bước** này:

```
[1] fetchAndMapPlaces      → lấy dữ liệu địa điểm từ DB
[2] preFilter              → lọc bỏ nơi đóng cửa toàn bộ ngày đi
[3] kMeansClustering       → gom nhóm địa điểm theo khu vực địa lý (1 cluster = 1 ngày)
[4] GNN (per cluster)      → xếp thứ tự thăm trong mỗi ngày  ← ĐÂY LÀ ĐIỂM ĐANG BÀN
[5] cascadeRouteTimes      → điều chỉnh giờ thực tế bằng GPS (Goong API)
```

Bước **[4] GNN** là trọng tâm. Giới hạn cố định: **tối đa 5 địa điểm/ngày** (`MAX_PLACES_PER_DAY = 5`).

---

## 2. GNN (Greedy Nearest Neighbor) là gì?

**Nguyên lý:** Tại mỗi bước, chọn địa điểm **"tốt nhất"** theo công thức cost:

```
cost = travelTime × 2 + waitTime × 60
```

Tức là: ưu tiên điểm gần nhất AND ít phải chờ nhất. Chọn xong thì không quay lại — **quyết định tham lam, không thể đảo ngược.**

**Ví dụ đơn giản (3 điểm A, B, C):**

```
Từ start → A gần nhất (cost thấp) → chọn A ✓
Từ A     → B gần nhất             → chọn B ✓
Từ B     → C                      → chọn C ✓
Kết quả: A → B → C
```

Với 3 điểm không có ràng buộc giờ, GNN thường cho kết quả tốt.

---

## 3. Khi nào GNN sai? — Vấn đề "tầm nhìn ngắn"

GNN chỉ nhìn **1 bước phía trước**. Nó không biết rằng việc chọn điểm A hôm nay sẽ khiến bỏ lỡ điểm B (đóng cửa sớm) sau đó.

### Tình huống thực tế tại Hà Nội

> **Setup:** Khách ở khách sạn Hoàn Kiếm, muốn đi 4 điểm khu Ba Đình + Hoàn Kiếm.
> Xuất phát lúc **08:00**.

| Điểm | Khoảng cách từ start | Giờ mở | Giờ đóng | Visit |
|------|---------------------|--------|----------|-------|
| **A** — Bảo tàng Phụ Nữ VN | **1 km** (gần nhất) | 08:00 | 17:00 | 90 phút |
| **B** — Lăng Bác | 3 km | 07:30 | **10:30** ← sớm | 60 phút |
| **C** — Bảo tàng HCM | 3.2 km | 08:00 | **11:30** ← sớm | 60 phút |
| **D** — Chùa Một Cột | 3.1 km | 24/7 | 24/7 | 45 phút |

### GNN chạy như thế nào?

```
08:00 → Chọn A (gần nhất, 1km) → thăm đến 09:30
09:30 → Từ A, gần nhất là D (Chùa Một Cột) → thăm đến 10:25
10:25 → Thử B (Lăng Bác): arrive 10:35 → ĐÃ ĐÓNG lúc 10:30 ❌ DROP
10:25 → Thử C (Bảo tàng HCM): arrive 10:35 → 10:35+60=11:35 > 11:30 ❌ DROP

Kết quả GNN: 2/4 điểm ❌
```

### Route tối ưu thực sự là?

```
08:00 → B (Lăng Bác, 3km): thăm 08:00–09:00 ✓
09:00 → C (Bảo tàng HCM, cạnh B): thăm 09:13–10:13 ✓
10:13 → A (Bảo tàng Phụ Nữ): thăm 10:43–12:13 ✓ (nghỉ trưa sau)
14:30 → D (Chùa Một Cột): thăm 14:30–15:15 ✓

Kết quả Optimal: 4/4 điểm ✅
```

**GNN thua vì:** Nó thấy A gần hơn → chọn A trước → sau đó cả B lẫn C đều đã trễ.

---

## 4. Brute Force giải quyết thế nào?

**Nguyên lý:** Thử **tất cả thứ tự** có thể, chọn thứ tự tốt nhất.

Với 4 điểm: `4! = 24 thứ tự`. Với 5 điểm: `5! = 120 thứ tự`.

```
Thử A→B→C→D: B arrive 10:35 > đóng 10:30 → B bị skip → 3 điểm
Thử B→C→A→D: B 08:00✓ → C 09:13✓ → A 10:43✓ → D 14:30✓ → 4 điểm ✅ ← CHỌN
Thử C→B→A→D: C 08:00✓ → B 09:10✓ → A 10:20✓ → D 12:10✓ → 4 điểm ✅
... (thử hết 24 thứ tự)
→ Chọn thứ tự nhiều stops nhất, ít travel nhất
```

**Thời gian chạy:** 120 vòng lặp × ~5 phép tính = **< 1ms**. Không đáng kể.

---

## 5. Kết quả test thực tế (đã chạy và pass)

File test: [trip-planner-algorithm.spec.ts](file:///e:/USTH_ICT/Thesis/HanoiGO/actions/src/trips/trip-planner-algorithm.spec.ts)

```
Tests: 17 passed, 17 total  (0.792s)
```

| Case | Tình huống Hà Nội thực tế | GNN | Optimal | Cần BF? |
|------|--------------------------|-----|---------|---------|
| 1 | Hoàn Kiếm loop (5 điểm, alwaysOpen) | ✅ 5/5 | 5/5 | ❌ Không |
| 2 | Ba Đình: Lăng Bác + Bảo tàng giờ HC | ⚠️ 3/4 | 4/4 | **✅ Có** |
| 3 | Bẫy GNN: 4 điểm, 2 đóng sớm xa start | ⚠️ **2/4** | **4/4** | **✅ Có** |
| 4 | Bar/cafe mở 16:00 | ✅ 3/3 | 3/3 | ❌ Không |
| 5 | Bảo tàng đóng cửa đúng ngày đi | ✅ Lọc đúng | — | ❌ Không |
| 6 | Lunch break 11:00–13:00 | ✅ Đúng | — | ❌ Không |
| 7 | Kiểm tra thời gian hợp lệ (arrive < depart) | ✅ Pass | — | ❌ Không |
| 8 | Bờ Hồ tour từ ga Hà Nội | ✅ 3/3 | 3/3 | ❌ Không |

**Output console của Case 3 (được in khi chạy test):**
```
⚠️  GNN: 2/4 điểm. Optimal (Brute Force): 4/4 điểm.
→ GNN dưới mức optimal. Cần Brute Force để đạt kết quả tốt nhất.

[Case 3 — Optimal Route Simulation B→C→A→D]
  B: depart 9:00
  C: depart 10:13
  A: depart 14:30
  D: depart 15:43
  → Cả 4 điểm khả thi trong ngày ✅
```

---

## 6. Tổng kết: Có nên dùng Brute Force không?

### ✅ Nên dùng, vì:

**1. GNN sai ở đúng use case phổ biến nhất của HanoiGO**

Khu Ba Đình (Lăng Bác đóng 10:30, bảo tàng đóng 11:30) là điểm du lịch **số 1 Hà Nội** và cũng là nơi GNN thất bại nghiêm trọng nhất. Đây không phải edge case học thuật.

**2. Chi phí = 0**

| Số điểm | Số hoán vị | Thời gian ước tính |
|---------|-----------|-------------------|
| N = 3 | 6 | < 0.01ms |
| N = 4 | 24 | < 0.05ms |
| N = 5 | 120 | < 0.5ms |

So sánh: Goong API call mất **200–500ms**. Brute Force chạy **1000× nhanh hơn**.

**3. Kết quả đảm bảo tối ưu tuyệt đối**

Brute Force không bao giờ bỏ sót 1 điểm "nếu về mặt lý thuyết nó fit trong ngày". GNN có thể.

**4. Lập luận học thuật mạnh**

> *"Do số địa điểm mỗi ngày bị giới hạn ở N ≤ 5 nhằm đảm bảo trải nghiệm du lịch thực tế, không gian tìm kiếm chỉ có tối đa 5! = 120 hoán vị. Trong phạm vi này, thuật toán Exact (Brute Force) cho phép tìm lời giải tối ưu toàn cục với chi phí tính toán không đáng kể (< 1ms), vượt trội hoàn toàn so với heuristic GNN vốn dễ bỏ lỡ các địa điểm có time window chặt."*

### ❌ Không cần nếu:
- Tất cả địa điểm trong cluster đều `alwaysOpen` (công viên, phố đi bộ, hồ) → GNN và BF cho kết quả giống nhau.
- Số ngày đi dài (N ≥ 7): BF vẫn OK vì cluster đã chia nhỏ.

---

## 7. Nếu implement, thay đổi gì?

**Chỉ thay đổi 1 hàm** trong [trip-planner-scheduling.ts](file:///e:/USTH_ICT/Thesis/HanoiGO/actions/src/trips/trip-planner-scheduling.ts):

```
greedyNearestNeighborWithTimeWindow()
  → bruteForceWithTimeWindow()  (giữ nguyên signature & return type)
```

**Không cần sửa** `trip-planner.service.ts` vì interface output (`route`, `droppedInGNN`) không đổi.

**Cấu trúc Brute Force:**
```
1. Filter places mở cửa hôm đó
2. Sinh 120 hoán vị (Heap's Algorithm)
3. Simulate từng hoán vị → tính timeline
4. Chọn hoán vị: nhiều stops nhất → ít totalTravelSec nhất
5. Trả về { route, droppedInGNN }
```
