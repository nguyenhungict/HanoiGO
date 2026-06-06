# V-Loop Mobile App — UI/UX Build Prompt

> **Mục đích tài liệu:** Prompt chi tiết để thiết kế & build toàn bộ UI/UX cho app mobile V-Loop — nền tảng kết nối khách du lịch khám phá Việt Nam cùng nhau, lấy cảm hứng từ kiến trúc web HanoiGO.

---

## 1. Tổng quan Dự án

**V-Loop** là ứng dụng mobile xã hội du lịch, cho phép du khách nước ngoài và nội địa:
- Tìm bạn đồng hành theo vibe & sở thích
- Khám phá địa điểm, ẩm thực địa phương qua góc nhìn cộng đồng
- Tạo & chia sẻ lịch trình du lịch
- Kết nối realtime qua bản đồ xã hội và group chat

**Tagline:** *"Meet Travelers. Explore Vietnam Together."*

---

## 2. Design System

### 2.1 Color Palette (Pastel Version)

*Các màu sắc chủ đạo được chuyển sang tông Pastel nhẹ nhàng, tươi sáng nhưng vẫn đảm bảo độ tương phản cho trải nghiệm di động:*

| Token | Hex | Dùng ở đâu |
|---|---|---|
| `primary` | `#A7F3D0` | Xanh lá pastel (Brand chính, card active, elements nổi bật) |
| `secondary` | `#FED7AA` | Cam pastel (Orange accent, badges, highlights) |
| `tertiary` | `#FDE68A` | Vàng pastel (Tertiary accent, warning badges, rating stars) |
| `background` | `#FAF9F6` | Neutral pastel (Nền ứng dụng - warm off-white) |
| `surface` | `#FFFFFF` | Nền card & component trắng sạch |
| `on-primary` | `#064E3B` | Xanh lá đậm (Text hiển thị trên nền primary) |
| `on-secondary` | `#7C2D12` | Cam đậm (Text hiển thị trên nền secondary) |
| `on-surface` | `#1E293B` | Text chính (Slate dark) |
| `on-surface-variant` | `#475569` | Text phụ / label |
| `error` | `#FCA5A5` | Đỏ pastel (Lỗi, destructive alert) |
| `on-error` | `#7F1D1D` | Đỏ đậm (Text hiển thị trên nền error) |
| `primary-container` | `#D1FAE5` | Container xanh lá pastel nhạt |
| `secondary-container` | `#FFEDD5` | Container cam pastel nhạt |

### 2.2 Typography

Font: **Plus Jakarta Sans** (toàn bộ)

| Scale | Size | Weight | Dùng ở đâu |
|---|---|---|---|
| Display | 40px | 800 | Hero title, app name |
| Headline LG | 32px | 700 | Page title |
| Headline LG Mobile | 24px | 700 | Section title |
| Headline MD | 20px | 600 | Card title |
| Body LG | 18px | 400 | Body text lớn |
| Body MD | 16px | 400 | Body thường |
| Label MD | 14px | 600 | Button, chip label |
| Label SM | 12px | 500 | Caption, hint |

### 2.3 Spacing & Shape

| Token | Value |
|---|---|
| `spacing-base` | 8px |
| `spacing-sm` | 12px |
| `spacing-md` | 24px |
| `spacing-lg` | 48px |
| `margin-mobile` | 20px (side margin) |
| `border-radius-default` | 4px |
| `border-radius-lg` | 8px |
| `border-radius-xl` | 12px |
| `border-radius-full` | 9999px (pill, avatar) |

### 2.4 Thiết bị mục tiêu

- **Screen width:** 390px (iPhone 14)
- **Bottom nav height:** 64px
- **Animation duration:** 200ms (micro-interaction)

---

## 3. Màn hình & Spec chi tiết

---

### Screen 1 — Splash Screen

**Mục đích:** Branding đầu tiên khi app khởi động.

**Components:**
- Logo V-Loop căn giữa màn hình
- Animation gradient xanh lá pastel (`#A7F3D0`) → cam pastel (`#FED7AA`) chạy trên nền logo
- Tên app "Loop" với Display typography
- Loading state: spinner hoặc progress bar mỏng phía dưới
- Transition smooth sang Welcome Screen sau khi load xong

**Behavior:** Auto-navigate sang Welcome sau 2–3s hoặc khi data đã sẵn sàng.

---

### Screen 2 — Welcome Screen

**Mục đích:** Onboarding đầu tiên, chuyển đổi người dùng đăng ký / đăng nhập.

**Components:**

| Component | Spec |
|---|---|
| Hero Background | Ảnh toàn màn hình cảnh du lịch Việt Nam, gradient tối phía dưới |
| Branding | Tên "V-Loop" (Display), headline "Meet Travelers. Explore Vietnam Together." (Headline LG), subtext tagline |
| Live Badge | Góc trên phải: `"128 travelers looping"` với pulse animation, màu `#FED7AA` |
| Auth Buttons | Nút Google (nền trắng, icon Google), nút Apple (nền đen, icon Apple) |
| Text Links | "Log In" và "Create Account" dạng text button |
| Footer | Links Terms of Service & Privacy Policy, Label SM, cuối màn hình |

**Notes:**
- Live badge hiển thị số travelers đang online (min 100, lấy từ API)
- Gradient overlay trên ảnh: `rgba(0,0,0,0)` → `rgba(0,0,0,0.7)` từ trên xuống

---

### Screen 3 — Phone Login (Email / Gmail)

**Mục đích:** Đăng nhập bằng Gmail, bước đầu nhập email.

**Components:**

| Component | Spec |
|---|---|
| Back Button | Icon chevron-left, top-left |
| Header | Tiêu đề "Sign in to Loop" (Headline MD), mô tả "Enter your Gmail to continue" |
| Hero Image | Ảnh cảnh Việt Nam (Đà Nẵng / Hà Nội) với gradient overlay phía dưới |
| Gmail Input | Text field, placeholder `...@gmail.com`, validate bắt buộc định dạng `@gmail.com` |
| Send Code Button | Primary button "Send Verification Code", full width, `border-radius-lg` |
| Toast | Overlay toast "Verification code sent!" sau khi submit thành công |

**Validation:**
- Chỉ chấp nhận email kết thúc `@gmail.com`
- Hiện inline error nếu sai định dạng

---

### Screen 4 — OTP Verification

**Mục đích:** Xác thực mã OTP 6 chữ số gửi qua email.

**Components:**

| Component | Spec |
|---|---|
| Back Button | Icon chevron-left, top-left |
| Header | "Verify your Gmail" + hiển thị email đã nhập (Body MD, màu `on-surface-variant`) |
| OTP Input Grid | 6 ô input riêng biệt, tự động focus ô tiếp theo khi nhập, hỗ trợ paste toàn bộ mã |
| Resend Timer | Đếm ngược 2 phút. Khi hết giờ → hiện nút "Resend Code" |
| Security Card | Card nhỏ "🔒 256-bit encryption" để tạo trust, màu `surface`, border nhẹ |
| Verify Button | "Verify & Continue", primary color, loading animation khi đang xử lý |

**Behavior:**
- OTP sai → shake animation trên input grid + error message đỏ
- OTP đúng → navigate sang Create Profile (lần đầu) hoặc Home (đã có profile)

---

### Screen 5 — Create Profile

**Mục đích:** Thu thập thông tin cá nhân sau khi xác thực lần đầu.

**Chia thành 2 trang con (stepper):**

**Trang 1:**
- Photo Upload: Avatar tròn (96px), nút camera/edit overlay, bắt buộc
- First Name (text field, required)
- Date of Birth (date picker)

**Trang 2:**
- Nationality (searchable dropdown)
- Sex (dropdown: Male / Female / Prefer not to say)

**Các bước tiếp theo (cùng flow):**

| Component | Spec |
|---|---|
| Vibe Chips | Multi-select chips: Foodie, Party, Photography, History, Beach, Adventure, Shopping, Work, Road Trip, Wellness. Chip active: bg `primary`, text trắng |
| Inspiration Card | Card ảnh cảm hứng du lịch kèm live location badge |
| Khảo sát nguồn | Single-select: TikTok, Instagram, Facebook, Friends, Website |
| Cấp quyền | Thông báo tại sao cần: Notification + Location (nêu rõ lý do) |
| Gợi ý Premium | Card nhỏ gợi ý nâng cấp tài khoản (skip được) |
| CTA | Nút "Start Exploring" fixed bottom, primary color |

---

### Screen 6 — Home Screen

**Mục đích:** Màn hình chính sau khi đăng nhập.

**Layout:**

```
┌─────────────────────────────┐
│  Logo VLoop   🔔(badge)  👤  │  ← Top App Bar
├─────────────────────────────┤
│  Good evening, [Name] 👋    │
│  X travelers near you        │  ← Welcome Section
├─────────────────────────────┤
│  [Create Trip] [Bus Booking] │
│  [Super Local] [Activities]  │
│  [Friend List]               │  ← Feature Grid (Bento 5 ô)
├─────────────────────────────┤
│  🔴 Live Now ─────────────> │
│  [Card] [Card] [Card]        │  ← Horizontal scroll
├─────────────────────────────┤
│  🏠   🗺   ✈   💬   👤    │  ← Bottom Nav
└─────────────────────────────┘
```

**Chi tiết từng vùng:**

**Top App Bar:**
- Logo + "VLoop" (Label MD)
- Notification icon với pulse badge (số, hiện đến 99+)
- Avatar user (40px, border-radius-full)

**Welcome Section:**
- "Good evening [name]" + wave emoji (Headline LG Mobile)
- Nếu đã bật location: "X travelers looping near you"
- Nếu chưa bật: "Allow location to see travelers nearby"

**Feature Grid (Bento):**
5 ô layout bento grid (2-2-1 hoặc theo thiết kế):
1. **Create Trip** — icon map-plus
2. **Bus Booking** — icon bus
3. **Super Local Suggestion** — icon utensils / compass
4. **Your Activities** — icon calendar-check
5. **Friend Lists** — icon users

**Live Now Section:**
- Tiêu đề "🔴 Live Now" với badge đỏ nhấp nháy
- Cuộn ngang các Activity Cards đang diễn ra / sắp diễn ra (upcoming, nhiều user nhất lên đầu)
- Mỗi card: ảnh, tên activity, địa điểm, số người tham gia, avatar stack (3–5 avatars)

**Bottom Navigation (5 tab):**
- Home 🏠 | Map 🗺 | Trips ✈ | Chat 💬 | Profile 👤
- Chiều cao 64px, active tab màu `primary`

---

### Screen 7 — Social Map

**Mục đích:** Bản đồ xã hội thời gian thực, xem travelers & địa điểm.

**Components:**

| Component | Spec |
|---|---|
| Search Bar | Tìm kiếm thành phố, floating trên map, border-radius-full |
| City Filter | Chips cuộn ngang: các thành phố chính (Hà Nội, TP.HCM, Đà Nẵng, Hội An...) |
| Map View | Toàn màn hình, avatar pins của travelers + location pins địa điểm |
| Traveler Pin | Avatar tròn 40px với viền `primary`, hiện tên khi tap |
| Location Popup | Popup nổi khi tap pin: tên địa điểm, số người đang ở đây, avatars mini. Có thể xem profile & kết bạn |
| Bottom Sheet | Kéo lên để xem chi tiết địa điểm: ảnh, tên, vibe tags, rating, avatar stack, nút "Join" + "Navigate" |

**Behavior:**
- Pin animate nhẹ khi có người mới join
- Bottom sheet: peek 30% → full 80% khi kéo lên

---

### Screen 8 — My Journey (Trip)

**Mục đích:** Quản lý lịch trình cá nhân và khám phá lịch trình cộng đồng.

**Gồm 3 sub-section:**

**A. Template / Header:**
- Avatar user, tiêu đề "My Journey", nút Edit

**B. Create Trip (Manual):**
- Nhập địa điểm (search)
- Chọn start date (date picker)
- Số ngày (number input)
- Chọn địa điểm từ danh sách (tương tự Discovery của HanoiGO)

**C. Community Feed:**
- Filter theo category (Heritage, Culture, Sightseeing, Food...)
- Mỗi card: ảnh, tiêu đề, like ❤️, comment 💬, saved 🔖, nút report góc phải
- Click vào card → xem chi tiết lịch trình

**D. My Journey Tab (góc phải trên):**
- Filter toggle: "My Trips" / "Saved Trips"
- Card trip hiện tên + số ngày
- "My Trips": hiện nút **Edit** và **Delete** dưới card
- "Saved Trips": hiện nút **View** và **Clone**

---

### Screen 9 — Bus Booking

**Mục đích:** Xem và đặt vé xe bus liên tỉnh.

**Components:**

| Component | Spec |
|---|---|
| Header | Back button + tiêu đề "Bus Booking" |
| Search | Điểm đi → Điểm đến, date picker |
| Cost Cards | Card từng chuyến: tên nhà xe, giờ đi/đến, giá tiền |
| Pricing Display | Hiển thị rõ giá VND, class (thường / giường / limousine) |
| Card Actions | Nút "Book Now" primary, nút "Details" secondary |

---

### Screen 10 — Chat

**Mục đích:** Nhắn tin nhóm (Groups) và trực tiếp (DMs).

**Layout:**

```
┌───────────────────────────────┐
│  VLoop Logo    🔍             │  ← Header
├───────────────────────────────┤
│  [Groups]  [Direct Messages]  │  ← Tab Filter
├───────────────────────────────┤
│  [Avatar] Group Name          │
│           Last message...  2m │  ← Chat List
│  [Avatar] Friend Name         │
│           Seen  •  10:32   ✓✓ │
└───────────────────────────────┘
```

**Chi tiết Chat Screen (khi mở 1 cuộc trò chuyện):**

**Input Toolbar:** Ảnh 📷, Location 📍, Camera 📸, Poll 📊, Sticker 🎭 (Sticker API)

**Tap vào tên nhóm/bạn:**
- Mute (1h / 8h / 24h)
- Leave / Delete
- Media, Add member
  - Leader: thêm ngay
  - Member: phải chờ accept
- Đổi tên & ảnh nhóm
- Report
- Các tin nhắn đã ghim

**Long-press tin nhắn:**
- React emoji
- Ghim
- Reply
- Thu hồi (chỉ trong 2 phút)

**UI tin nhắn:**
- Giờ gửi hiện dưới tin nhắn
- Seen: hiện avatar những người đã xem

---

### Screen 11 — Friend List

**Mục đích:** Quản lý danh sách bạn bè.

**Entry points:** Từ Profile, từ Maps pin, từ Community Feed card.

**Components:**

| Component | Spec |
|---|---|
| Header | Back button + "Friends" |
| Search | Tìm theo tên |
| Friend Card | Avatar 48px, tên, số mutual friends, nút "See Request" |
| 3-dot Menu | Nhắn tin, Huỷ kết bạn, Report, Block |
| Friend Request | Badge số trên tab, có thể Accept / Decline |

---

### Screen 12 — Traveler Profile (Bản thân)

**Mục đích:** Trang hồ sơ cá nhân đầy đủ.

**Layout:**

```
┌──────────────────────────────┐
│  🥈 [Badge]  ⚙️ Setting      │  ← Header (Silver badge, Settings icon)
├──────────────────────────────┤
│  [Avatar 96px]               │
│  Tên  •  Current Location    │
│  Bio                         │
│  Travel Vibe: [Chips]        │  ← Profile Info
│  [Edit Profile Button]       │
├──────────────────────────────┤
│  ⭐ Upgrade to Premium        │  ← Premium Banner
├──────────────────────────────┤
│  📸 Photos                   │
│  [Grid ảnh với description]  │
├──────────────────────────────┤
│  🗺 Cities Visited           │
│  [Chips + nút Edit]          │
├──────────────────────────────┤
│  🔴 Log Out                  │  ← Màu đỏ cảnh báo #EF4444, cuối trang
└──────────────────────────────┘
```

**Settings (overlay sheet):** Tham chiếu thiết kế Nomadtable.

**Edit Profile:** Cho phép sửa tất cả thông tin từ bước Create Profile.

---

### Screen 13 — Super Local Foods

**Mục đích:** Khám phá ẩm thực địa phương theo thành phố.

**Hierarchy:**

```
Home → Super Local Foods
  └── Chọn City
      └── Chọn Món ăn
          └── Chọn Nhà hàng
```

**A. Main Screen:**
- Header: Logo + "Loop Food"
- Search bar + trending food chips
- Select city (thành phố phổ biến lên đầu), hiện số món & số quán
- Top Favourite Restaurants: 3 card đầu, nút "See More"
  - Card: tên quán, ảnh, số ❤️, rating sao
- Food Passport (dev sau — placeholder)

**B. Inside City Card:**
- Header: Back + tên thành phố (Headline LG)
- Local Tip Cards: ảnh + text, scroll ngang, chia theo buổi (Sáng / Trưa / Tối)
- Grid món ăn: ảnh + tên, nút hiện số lượng quán

**C. Inside Food Card:**
- Ảnh đầu trang, tên món trong ảnh
- Food Tags:
  - Flavour: Spicy / Sweet / Sour / Savory
  - Dietary: Veg / Gluten-free / Nut-free
  - Best Time: Breakfast / Lunch / Dinner
- Danh sách nhà hàng: tên, địa chỉ, khoảng giá, số sao, nút "View Details"

**D. Inside Restaurant Card:**
- Ảnh + tên trong ảnh + địa chỉ
- Giờ mở/đóng cửa + phương thức thanh toán: Card / Cash / QR
- Map card (tọa độ)
- Reviews: bình luận + star rating

---

## 4. Navigation Architecture

```
App
├── Splash Screen
├── Welcome Screen
│   ├── Login Flow
│   │   ├── Phone Login (Gmail)
│   │   └── OTP Verification
│   └── Create Profile (Onboarding)
│
└── Main App (Bottom Nav)
    ├── 🏠 Home
    ├── 🗺 Social Map
    ├── ✈ My Journey
    │   ├── Create Trip
    │   ├── Community Feed
    │   └── My Trips / Saved Trips
    ├── 💬 Chat
    │   ├── Groups
    │   └── Direct Messages
    └── 👤 Profile
        ├── Edit Profile
        ├── Friend List
        ├── Settings
        └── Log Out
```

**Deep Links từ Home:**
- Feature Grid → Bus Booking (modal/sheet)
- Feature Grid → Super Local Foods (full screen)
- Live Now → Activity Detail → Join / Chat

---

## 5. Shared Components

### 5.1 Activity Card

Dùng ở: Home (Live Now), Map (Bottom Sheet), My Journey (Community Feed)

```
┌─────────────────────────────┐
│ [Ảnh bìa 16:9]              │
│ 🔴 LIVE  hoặc  🟡 SOON      │  ← Status badge (animate)
├─────────────────────────────┤
│ Tên Activity (Headline MD)  │
│ 📍 Địa điểm  •  ⏰ 14:00    │
│ [Avatar][Avatar][Avatar] +5 │
│ [Join Group]  [Save]        │
└─────────────────────────────┘
```

**Status badge logic (từ HanoiGO):**
- `UPCOMING`: badge xanh dương pastel `#DBEAFE` (text `#1E40AF`)
- `STARTING` (trong 2h): badge vàng pastel `#FEF3C7` (text `#92400E`) + nhấp nháy "SOON"
- `ONGOING` (trong 3h từ lúc bắt đầu): badge xanh lá pastel `#D1FAE5` (text `#065F46`) + pulse "LIVE"
- `ENDED`: badge xám pastel `#F3F4F6` (text `#374151`), opacity 50%

### 5.2 Trip Card

Dùng ở: My Journey, Profile

```
┌─────────────────────────────┐
│ [Ảnh thumbnail]             │
│ Tên lịch trình              │
│ X ngày  •  Ngày tạo         │
│ [Edit]  [Delete]            │  ← Chỉ My Trips
└─────────────────────────────┘
```

### 5.3 User Avatar Pin (Map)

- Avatar tròn 40px, border 2px màu `primary`
- Tap → popup tên + nút "View Profile" + nút "Add Friend"

### 5.4 Bottom Sheet

- Peek: 30% chiều cao màn hình
- Expanded: 80%
- Handle bar: 40px × 4px, màu `on-surface-variant`, bo tròn, căn giữa
- Dismiss: tap backdrop hoặc swipe xuống

### 5.5 Toast Notification

- Duration: 3 giây
- Position: top (phía dưới status bar) hoặc bottom (trên nav)
- Màu success: `primary-container`; màu error: `error`

---

## 6. Micro-interactions & Animation

| Interaction | Behavior |
|---|---|
| Tap button | Scale 0.97 → 1.0, duration 150ms |
| Live badge | Pulse ring xanh lá, 2s loop |
| Status LIVE | Ripple circle animation, 1.5s loop |
| Status SOON | Blink opacity 1.0 ↔ 0.6, 1s loop |
| Bottom Sheet drag | Spring physics, friction 0.8 |
| OTP field focus | Border color → `primary`, scale 1.05 |
| Avatar stack | Mỗi avatar overlap 8px, shadow nhẹ |
| Page transition | Slide từ phải (push), 200ms ease |
| Loading skeleton | Shimmer gradient trái → phải, 1.5s loop |

---

## 7. Khác biệt Mobile so với Web (HanoiGO)

| Feature | HanoiGO Web | V-Loop Mobile |
|---|---|---|
| Auth | Email + Password + OTP | Gmail-only + OTP |
| Map | Leaflet CartoDB Voyager | Native Maps với avatar pins xã hội |
| Trip Planner | 5-phase algorithm (TSPTW) | Manual + Community Clone |
| AI Mentor | Gemini chat interface | (Phase sau) |
| Social | Shared Trips + Activity | Full social: Friends, DM, Group Chat |
| Food | Không có | Super Local Foods module |
| Transport | Không có | Bus Booking module |
| Profile | Username-based | Travel Vibe + Cities Visited |
| Realtime | WebSocket group chat | Chat (Groups + DMs) + Map live pins |

---

## 8. Ghi chú Kỹ thuật cho Builder

- **Target:** React Native hoặc Flutter (390px base width)
- **Font:** Import Plus Jakarta Sans từ Google Fonts
- **Map:** Mapbox / Google Maps với custom marker (avatar component)
- **Realtime:** WebSocket (Socket.io) cho Map pins + Chat
- **State:** Zustand (React Native) hoặc Riverpod (Flutter)
- **OTP:** 6-digit, timeout 2 phút, resend cooldown
- **Sticker API:** Tenor hoặc Giphy SDK trong Chat
- **Deep link:** Universal links cho activity invite & trip share
- **Splash:** Lottie animation logo gradient
- **Skeleton Loading:** Áp dụng cho tất cả list & card khi đang fetch

---

*Tài liệu tổng hợp từ VLoop2_0 Design Spec + HanoiGO Architecture — v1.0*
