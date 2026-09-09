# GoEat ZMA — Kế hoạch hoàn thiện & tích hợp

> Trạng thái hiện tại: **prototype UI 100% mock**, 3.691 dòng, không có tầng API, không có đăng nhập.
> Mục tiêu: 1 codebase → 3 Zalo Mini App cho **tanloc-hafu**, **tanloc-spartronics**, **GoEat-ZAVN**.

---

## 0. Hiện trạng đã kiểm chứng

### goeat-zma
| Hạng mục | Thực tế |
|---|---|
| Tầng API | **Không có** `src/api/`. Toàn bộ dữ liệu từ `src/data/canteen.ts` + `src/data/menu.ts` |
| State | `src/state.ts` chỉ có `mealPlanAtom` (jotai, in-memory), seed cứng `{wed:{hc:'d1'}}` |
| Đăng nhập | **Không có màn nào**. `EMPLOYEE` là hằng số |
| Mô hình ca | `Shift.id` là string (`hc`, `sang`, `tc_trua`) — backend là `meal_time_id: Int` |
| Mô hình món | `Dish.id` string (`d1`) — backend đặt theo `menu_line_id: Int` |
| Ảnh món | URL Unsplash từ xa qua `food(id)` |
| Cấu hình phát hành | `app-config.json` còn `YOUR_APP_ID` / `YOUR_OA_ID` (dù `.env` đã có `APP_ID=2600294893392654695`) |
| Màn hình | 8 màn nhân viên + 7 màn admin, tất cả đọc mock |

### 3 backend — cùng domain, khác tầng auth
Cả 3 dùng chung bộ model căn-tin: `MealTime`, `FoodItem`, `Menu`, `MenuLine`, `MealOrder`, `FoodChangeQuota`, enum `OrderStatus {draft, confirmed, cancelled, served}`, `MealOrder @@unique([employee_id, meal_date, meal_time_id])`.

| | tanloc-hafu | tanloc-spartronics | GoEat-ZAVN_V3 |
|---|---|---|---|
| Auth API | JWT trong **cookie HttpOnly** `auth-token` (`getTokenFromCookies`) | **Better Auth** + `src/proxy.ts` **default-deny** mọi `/api` | JWT cookie + `middleware.ts` chặn theo prefix |
| `ordering/week-menu` | ✅ | ✅ | ❌ **thiếu** |
| `ordering/batch-order` | ✅ | ✅ | ❌ thiếu |
| `ordering/config` | `settings/menu-ordering-config` | ✅ `system_configs` key `ordering.*` | ❌ |
| `menu-columns` / `weekly-menu-groups` | ✅ | ✅ | ❌ |
| `pickup/process` | ✅ (nhận `employee_identifier`) | ✅ + `pickup/stream` SSE + máy chấm công khuôn mặt | ✅ |
| Đặc thù | Group ordering (`GroupMealOrder`), `OrgUnit`, `PosDevice`, `MealReceive` | Devices/face (`EmployeeFace`), RBAC registry, branches, goerp-core | Bản cũ nhất, đơn giản nhất |
| Liên kết Zalo trên `Employee` | ❌ không có | ❌ không có | ❌ không có |

**Ba kết luận chi phối kế hoạch:**
1. Auth cookie HttpOnly **không dùng được** trong webview ZMA cross-origin → bắt buộc lớp **Bearer token riêng**.
2. Ba backend lệch nhau về endpoint → ZMA **không gọi thẳng** API hiện có, mà gọi một **lớp BFF `/api/zma/*` chuẩn hoá** đặt trên từng backend.
3. Chưa backend nào biết Zalo là gì → cần migration liên kết `zalo_user_id`.

---

## 1. Quyết định kiến trúc (đã chốt)

| Vấn đề | Chốt |
|---|---|
| Phát hành | 1 codebase → **3 build / 3 Mini App / 3 OA**, khác nhau bằng env + tenant config |
| Mini App đầu tiên | **APP_ID `2600294893392654695` = tanloc-spartronics.** Đã ghi vào `app-config.json` + `.env`. Hai tenant còn lại xin APP_ID/OA riêng sau |
| Backend spartronics | `https://tanloc-spartronics.goeat.vn` → `VITE_API_BASE_URL`. **Xem cảnh báo lệch bản triển khai ở §7.0 trước khi bắt đầu P1** |
| Đăng nhập | **Zalo SĐT** → khớp `Employee.phone`; không khớp thì **liên kết mã NV lần đầu**, lưu `zalo_user_id` |
| Admin trong ZMA | Chỉ giữ **Quét nhận suất** + **Bếp**. Xoá 5 màn admin còn lại (dashboard, doanh thu, menu, ca, lịch sử quét đứng riêng) |
| Giá tiền | **Ẩn mặc định** (căn-tin nội bộ trợ giá). Bật lại bằng flag `showPrice` từ bootstrap |

---

## 2. Hợp đồng API `/api/zma/*` (BFF — cài trên **mỗi** backend)

ZMA chỉ biết duy nhất hợp đồng này. Mọi khác biệt giữa 3 backend được nuốt ở tầng BFF.

### Xác thực
```
POST /api/zma/auth/login      { accessToken, phoneToken }
  → verify với Zalo OpenAPI (me/info + me/phonenumber, secret key phía server)
  → tra Employee theo zalo_user_id → fallback theo phone đã chuẩn hoá
  → 200 { token, employee }            (đã liên kết)
  → 200 { needLink: true, linkTicket }  (chưa liên kết; linkTicket = JWT ngắn hạn giữ zaloUserId+phone)

POST /api/zma/auth/link       { linkTicket, employee_code, secret }
  → verify secret (mật khẩu hiện có / ngày sinh — chốt theo từng tenant)
  → set employee.zalo_user_id, zalo_phone, zalo_linked_at
  → 200 { token, employee }

POST /api/zma/auth/refresh    { token }        → xoay token
```
`token` = JWT riêng cho ZMA, claim `{ sub: employee_id, tenant, roles[], typ: 'zma' }`, hạn ngắn + refresh. **Không đụng** cookie flow của web.

**Bản mẫu có sẵn:** `vinhhoa/src/lib/zma/zma-service.ts` (`loginWithZaloToken`) + `vinhhoa/src/app/api/zma/auth/login/route.ts` — đang chạy thật. Client `getPhoneNumber()` **không** trả số, chỉ trả token; server đổi lấy số qua `graph.zalo.me/v2.0/me/info` với header `access_token` + `code` + `secret_key`. Số do Zalo xác thực → client không giả mạo được.

**Bốn điểm GoEat phải làm KHÁC vinhhoa:**
1. **Không tự tạo hồ sơ.** vinhhoa thấy khách lạ thì `customer.create()`. GoEat tuyệt đối không tạo `Employee` mới — không khớp thì trả `needLink`.
2. **Khớp SĐT phải duy nhất.** Xưởng có chuyện dùng chung số, hoặc DB gõ nhầm số sang người khác. Query ra **>1 nhân viên** cùng số → **không auto-login**, bắt nhập mã NV. Đây là rủi ro thật duy nhất của luồng này.
3. **Chuẩn hoá số 2 chiều.** Zalo trả `84988xxxxxx`; `Employee.phone` nhập từ Excel có thể là `0902 661 248` / `+84…` / trống (`phone` là optional trong `employees/import`). So khớp trên bản đã bỏ hết ký tự không phải số.
4. **Sau lần đầu ưu tiên `zalo_user_id`, không phải SĐT.** SIM đổi chủ / số được cấp lại → khớp SĐT mãi là lỗ hổng. SĐT chỉ dùng **một lần** để liên kết. Kèm chặn `Employee.active = false`.

**Cần đo trước khi chốt:** tỉ lệ `Employee.phone` hợp lệ trong DB spartronics. Nếu thấp thì màn liên kết mã NV là **đường chính** chứ không phải dự phòng — đổi cả thứ tự ưu tiên của UI đăng nhập.

### Dữ liệu
```
GET  /api/zma/bootstrap
  → { tenant: {id, name, brandColor, logo},
      capabilities: { weekMenu, batchOrder, cancelOrder, pickupScan, kitchen, showPrice },
      employee: {id, code, name, department, position, defaultMealTimeIds, avatar},
      mealTimes: [{id, name, serve_from, serve_to, order_deadline, end_time, group}],
      ordering: { includeSunday, maxDaysAhead, ... } }

GET  /api/zma/menu?date=YYYY-MM-DD
  → { date, mealTimes: [{ id, name, locked, lockReason,
        options: [{ menuLineId, name, image, sideDishes, description, column }],
        myOrder: { id, menuLineId, status, pickedUp, pickupTime } | null }] }

GET  /api/zma/week-menu?weeks=2       (ZAVN: BFF tự gom bằng cách lặp theo ngày)
POST /api/zma/order        { meal_date, meal_time_id, menu_line_id }
POST /api/zma/order/cancel { order_id }
GET  /api/zma/orders?from=&to=        → lịch sử + trạng thái nhận
GET  /api/zma/ticket?date=&meal_time_id=  → { qrPayload, expiresAt, status }
```

### Admin (rút gọn)
```
POST /api/zma/pickup/scan  { payload }   → bọc processPickup(), chấp nhận cả QR token lẫn mã NV/thẻ
GET  /api/zma/kitchen?date=              → tổng hợp số suất theo ca × món
```

**Nguyên tắc:** BFF **không** viết lại nghiệp vụ — gọi thẳng service sẵn có (`getMenuForOrdering`, `placeOrUpdateOrder`, `getWeeklyMenuForOrdering`, `processPickup`) và chỉ đổi hình dạng + đổi cách xác thực. Luật giờ (`order_deadline` / `end_time`) vẫn do service quyết; ZMA chỉ phản chiếu.

> **May mắn:** các service đặt cơm của spartronics đã nhận `employeeId` làm tham số (`getWeeklyMenuForOrdering(employeeId)`, `batchPlaceOrUpdateOrders(employeeId, …)`) — chỉ có *route* mới lấy id từ session. Nên BFF gọi thẳng service với `employee_id` lấy từ ZMA token, không phải refactor gì.

---

## 2b. Đặt món theo nhóm (xưởng) — thiết kế cho spartronics

### Ràng buộc đã kiểm chứng

1. **Spartronics chưa có đặt nhóm.** Không có `GroupMealOrder`/`OrgUnit`/`EmployeeOrgScope` (chỉ hafu có). Đây là tính năng backend **mới hoàn toàn**.
2. **RBAC gắn với `User`, không gắn với `Employee`.** `getEmployeeIdForUser(userId)` tra `Employee.user_id`; `Employee.user_id` là **nullable** — công nhân và cả trưởng xưởng có thể không có tài khoản web. Nghĩa là **không thể dùng `apiHandler({resource, action})` để gác quyền đặt nhóm cho người đăng nhập bằng Zalo.**
3. **`Employee.department` là string tự do**, không FK, trong khi `Department` là bảng thật (`code`/`name`/`parentId`/`order`/`status`, có seed + route lookup `/api/departments`).
4. **Pickup của spartronics là nhận diện khuôn mặt cá nhân** (`EmployeeFace`, `DeviceEvent`) → `processPickup` tra đơn theo `employee_id`.

### Ba quyết định (giả định đã chốt — sửa được nếu anh muốn khác)

**A. Đơn nhóm sinh `MealOrder` cá nhân cho từng nhân viên, KHÔNG đếm số suất theo xưởng.**
Vì ràng buộc (4): nếu đơn nhóm chỉ là con số theo xưởng thì máy quét mặt không tìm thấy đơn của người đó → hỏng luồng nhận cơm đang chạy. Ngoài ra bếp, báo cáo, `canteen-dashboard` đều đọc `MealOrder`; giữ một nguồn sự thật thì không phải sửa gì phía sau. `@@unique([employee_id, meal_date, meal_time_id])` sẵn có lo phần chống trùng.
→ **Không port cụm `GroupMealOrder` của hafu.** "Đặt cho xưởng" = đặt hộ hàng loạt, có kiểm soát phạm vi.

**B. Phạm vi xưởng vừa là dữ liệu tổ chức, vừa là nguồn quyền.**
Vì ràng buộc (2), quyền đặt nhóm **không** lấy từ RBAC User. Thêm:

```prisma
// hr.prisma — chuẩn hoá phòng ban (additive, nullable)
model Employee {
  department_id String?     // FK mới, backfill từ cột text `department`
  department_ref Department? @relation(fields: [department_id], references: [id])
  order_scopes  MealOrderScope[]
}

// canteen.prisma — ai được đặt cho xưởng nào
model MealOrderScope {
  id            Int      @id @default(autoincrement())
  employee_id   Int      // trưởng xưởng / thư ký
  department_id String   // xưởng được phép đặt hộ
  created_at    DateTime @default(now()) @db.Timestamptz(3)

  employee   Employee   @relation(fields: [employee_id], references: [id], onDelete: Cascade)
  department Department @relation(fields: [department_id], references: [id], onDelete: Cascade)

  @@unique([employee_id, department_id])
  @@map("meal_order_scopes")
}
```
**Có dòng scope = được đặt cho xưởng đó.** Gán tay trong admin web (trang mới, dùng CRUD engine). Nếu nhân viên đó *có* `user_id` thì kiểm thêm RBAC như bình thường — hai tầng, không xung đột.
Cột text `department` **giữ nguyên** (báo cáo cũ đang đọc), `department_id` là nguồn sự thật mới. Backfill bằng script khớp `Department.name`/`code`; ai không khớp thì admin sửa tay — **không** tự đoán.

**C. Đặt nhóm chỉ điền cho ai CHƯA có đơn; không ghi đè lựa chọn cá nhân.**
Công nhân tự chọn món rồi mà trưởng xưởng bấm "đặt cả xưởng" thì món của họ **giữ nguyên**. Muốn đổi phải bấm ghi đè **tường minh từng người** (có xác nhận), và mọi lần ghi đè ghi vào `audit_logs`. Lý do: món bị đổi sau lưng là loại lỗi người dùng không bao giờ tự phát hiện, chỉ đến quầy mới biết.

### Endpoint nhóm (thêm vào BFF)

```
GET  /api/zma/group/scope
  → { departments: [{ id, code, name, headcount }] }   // rỗng = không phải trưởng xưởng

GET  /api/zma/group/roster?department_id=&date=&meal_time_id=
  → { employees: [{ id, code, name, order: {menuLineId, source: 'self'|'group'} | null }],
      options: [...], locked, lockReason }

POST /api/zma/group/order
  { department_id, meal_date, meal_time_id,
    default_menu_line_id,              // món mặc định cho cả xưởng
    overrides: [{ employee_id, menu_line_id | null }],   // null = bỏ đặt
    overwrite_employee_ids: [ ... ]    // danh sách ĐƯỢC PHÉP ghi đè (mặc định rỗng)
  }
  → { created, updated, skipped: [{employee_id, reason: 'has_own_order'}], locked: [...] }
```

Server kiểm theo thứ tự: token ZMA hợp lệ → `MealOrderScope` chứa `department_id` → từng nhân viên có `department_id` khớp → luật giờ cho từng bữa (dùng lại kiểm tra của `batchPlaceOrUpdateOrders`) → ghi.

### Màn hình ZMA (thêm)

- `/group` — chọn xưởng (ẩn hoàn toàn nếu `scope` rỗng), chọn ngày + ca, chọn món mặc định, xem danh sách NV kèm ai đã tự đặt, tick ngoại lệ, xem tổng số suất trước khi gửi.
- Nhân viên thường không thấy tab này. Trưởng xưởng vẫn dùng `/weekly` để đặt cho **chính mình** như mọi người.

### Đặt cá nhân theo tuần — đã sẵn sàng

`getWeeklyMenuForOrdering(employeeId)` (tuần này + tuần sau, kèm đơn đã đặt + khoá từng ca) và `batchPlaceOrUpdateOrders(employeeId, ordersToSave, ordersToDelete)` chạy được ngay. ZMA chỉ bọc lại thành `/weekly` — **không cần code backend mới cho phần cá nhân.**

### Chưa làm ở v1 (ghi lại để khỏi quên)

"Suất phát sinh" cấp xưởng cho công nhân mới chưa có hồ sơ (tương đương `quantity_new_worker` của hafu). Spartronics phát cơm bằng khuôn mặt nên người chưa đăng ký khuôn mặt cũng không nhận được suất — cần thì xử lý bằng nhập tay ở quầy (`pickup/process` đã có sẵn).

---

## 3. QR nhận suất — thay chuỗi tĩnh bằng token ký

Hiện mock là chuỗi cố định `GOEAT-NV04821-20260611` → chụp màn hình gửi cho người khác là nhận hộ được.

**Thiết kế:** QR chứa JWT ký server, `{ sub: employee_id, meal_date, meal_time_id, jti, exp ≈ 60–90s }`, ZMA tự làm mới trong lúc mở màn. `POST /api/zma/pickup/scan` verify chữ ký → đối chiếu `MealOrder` → gọi `processPickup`.

**Giữ đường lui:** `processPickup(employee_identifier)` hiện có vẫn dùng được cho nhập tay/quẹt thẻ khi máy quét mất mạng — BFF nhận payload nào cũng xử lý.

---

## 4. Thay đổi schema (cả 3 backend, additive)

```prisma
model Employee {
  zalo_user_id   String?   @unique
  zalo_phone     String?
  zalo_linked_at DateTime?
}
```
Chạy qua skill `prisma-safe-migrate`. Thuần thêm cột nullable → không rủi ro dữ liệu. Spartronics đặt ở `prisma/schema/hr.prisma`, hafu/ZAVN ở `schema.prisma`.

---

## 5. Cấu trúc mới trong goeat-zma

```
src/
  api/
    config.ts       API_BASE theo env (dev → vite proxy, prod → absolute)
    client.ts       fetch/axios + Bearer + interceptor 401 → refresh → login
    auth.ts         loginWithZalo / linkEmployee / logout / token store
    ordering.ts     menu, week-menu, order, cancel, orders
    ticket.ts       QR token + polling trạng thái
    admin.ts        pickup scan, kitchen
  tenants/
    index.ts        đọc __TENANT__ do vite define
    hafu.ts | spartronics.ts | zavn.ts   (tên, màu, APP_ID, OA_ID, API base)
  state/
    auth.ts         atom employee + token (atomWithStorage)
    capabilities.ts  atom bootstrap
  pages/
    login.tsx       (mới) nút "Đăng nhập bằng Zalo"
    link.tsx        (mới) nhập mã NV lần đầu
  data/             giữ lại làm fixture dev offline, KHÔNG import trong runtime
scripts/
  build-tenant.mjs  sinh app-config.json từ tenants/*.ts rồi gọi zmp build
```

Bỏ khỏi router: `/admin/dashboard`, `/admin/revenue`, `/admin/menu`, `/admin/shifts`, `/admin/scan/history` (5 màn — đã có web admin đầy đủ). Giữ `/admin/scan`, `/admin/kitchen`.

---

## 6. Lộ trình

| Phase | Nội dung | Kết quả kiểm chứng được |
|---|---|---|
| **P−1** | **Gỡ chặn §7.0**: chốt (a) deploy bản goerp-core lên `tanloc-spartronics.goeat.vn`, hay (b) viết BFF cho bản đang chạy. Đo tỉ lệ `Employee.phone` hợp lệ | `/api/ordering/config` + `/api/departments` trả 401 thay vì 404 |
| **P0** | Tầng nền ZMA: `src/api/*`, tenant config, auth store, màn Login + Link, error boundary, SWR/react-query, gỡ import mock khỏi runtime | `npx tsc --noEmit` + `vite build` sạch; app chạy với API giả lập |
| **P1** | **Pilot = spartronics.** Migration `zalo_user_id`; module `/api/zma/*` (auth, bootstrap, menu, order); mở `/api/zma` trong `proxy.ts` publicPrefixes kèm ghi chú tự-bảo-vệ-bằng-JWT | Đăng nhập thật bằng Zalo trên máy thật, thấy đúng hồ sơ NV |
| **P2** | Nối luồng **cá nhân**: `/` (đặt hôm nay), `/weekly` (bọc `getWeeklyMenuForOrdering` + `batchPlaceOrUpdateOrders` — không cần code backend mới), `/orders`, `/profile`. Bỏ `mealPlanAtom` | Đặt/sửa/huỷ món chạy thật, dữ liệu khớp web admin |
| **P2b** | **Đặt theo xưởng** (§2b): migration `Employee.department_id` + `MealOrderScope` + backfill; 3 endpoint `/api/zma/group/*`; màn `/group`; trang admin gán phạm vi xưởng | Trưởng xưởng đặt 1 lần → sinh đúng N `MealOrder`, không ghi đè đơn NV tự đặt |
| **P3** | QR ký JWT + `/qr`, `/qr/:day/:shift` + `POST /api/zma/pickup/scan` verify token | Quét bằng máy → `MealOrder.picked_up = true` |
| **P4** | Admin rút gọn: `/admin/scan` (camera ZMP), `/admin/kitchen`; gắn RBAC (`resource: pickup`) | NV thường mở không thấy tab admin |
| **P5** | Port sang **hafu** + **ZAVN**. ZAVN thiếu `week-menu`/`batch-order` → BFF tự gom; hafu có group-ordering → **không đưa vào ZMA v1** | 3 build cùng codebase, chạy đúng 3 backend |
| **P6** | Phi chức năng: i18n (hafu/ZAVN có `Language`/`Translation`), mất mạng/retry, safe-area, ảnh, log lỗi về `ErrorLog` | Kiểm thử trên iOS + Android thật |
| **P7** | Phát hành: điền `app.id`/`oaID` cho từng tenant, `zmp deploy` bản TESTING, gửi duyệt | 3 app lên môi trường testing |

Phụ thuộc: **P−1 chặn tất cả.** P1 chặn P2–P4. P2b chạy song song được với P3/P4. P5 chỉ bắt đầu khi P2–P4 xong trên pilot.

---

## 7. Bẫy đã nhận diện

### 7.0 ⚠️ CHẶN P1 — bản đang chạy ở `tanloc-spartronics.goeat.vn` KHÔNG phải code trong repo `tanloc-spartronics/`

Thăm dò ngày 2026-08-09:

| Đường dẫn | Live | Repo `tanloc-spartronics/` |
|---|---|---|
| `/vi/sign-in` | 307 → `/vi/login` | có `[lang]/(plain)/sign-in` |
| `/api/better-auth/session` | **404** | dùng Better Auth (`better-auth/[...all]`) |
| `/api/ordering/config` | **404** | **có** |
| `/api/departments` | **404** | **có** |
| `/api/dictionary` | 401 (tồn tại) | **không có** |
| `/api/settings/groups` | 401 (tồn tại) | **không có** (đã chuyển `/api/admin/system/settings/*`) |
| `/api/admin/translations` | 401 (tồn tại) | **không có** |
| `/api/ordering/week-menu`, `/menu-columns`, `/weekly-menu-groups`, `/ordering/batch-order` | 401 / 405 (tồn tại) | có |

→ Server đang chạy **bản trước khi migrate sang goerp-core**: xác thực JWT cookie (`/api/auth/login`), còn `dictionary` + `settings/groups`, chưa có Better Auth / `Department` / `ordering/config`. Không phải codebase ZAVN (bản đó thiếu `week-menu`/`batch-order`).

**Hệ quả:** toàn bộ thiết kế ở §2b (Better Auth, model `Department`, Permission Registry, `apiHandler({resource, action})`) **bám vào code local, không bám vào cái đang chạy**. Trước khi viết dòng BFF nào, phải chốt một trong hai:

- **(a) Deploy bản goerp-core hiện tại lên domain này trước** — kế hoạch giữ nguyên. *Đây là hướng đề xuất*, vì bản local mới là bản có RBAC registry + Department + ordering/config mà §2b cần.
- **(b) Viết BFF trên chính bản đang chạy** — thì §2b phải viết lại: không có `Department` (chỉ có text), không có Permission Registry, quyền theo `Role`/`Permission` bảng cũ.

Chưa chốt việc này thì P1 chưa khởi động được.

### 7.1 Các bẫy còn lại

1. **CORS.** Mini app gọi cross-origin. `/api/zma/*` phải có CORS + preflight cho origin webview ZMA — **log `Origin` header khi chạy thật rồi mới allowlist**, đừng đoán tên miền.
2. **spartronics default-deny.** `src/proxy.ts` chặn mọi `/api` không có cookie phiên. Phải thêm `/api/zma` vào `publicPrefixes` **kèm ghi rõ nó tự bảo vệ bằng gì** (guardrail của repo yêu cầu), và JWT check phải nằm trong từng route.
3. **Ảnh món.** `spartronics /api/files/[...key]` đòi auth → ZMA không tải ảnh được. Cần đường ảnh công khai (hoặc URL ký). Đúng bài học đã gặp ở blog GoERP.
4. **Múi giờ.** Backend dùng `formatInTimeZone(..., 'Asia/Ho_Chi_Minh')`. ZMA phải gửi chuỗi `YYYY-MM-DD` theo giờ VN, **tuyệt đối không** `toISOString()` (lệch ngày sau 17:00).
5. **Luật giờ hafu 3 mốc.** `order_deadline` khoá đổi món, `end_time` khoá đăng ký thêm, ca vắt đêm là ngoại lệ. UI phải phản chiếu đúng, nhưng **server mới là hàng rào**.
6. **`app-config.json` vs `.env`.** Đã đồng bộ về `2600294893392654695` (spartronics). Khi thêm tenant thứ 2, `scripts/build-tenant.mjs` phải thành **nguồn duy nhất** sinh ra `app-config.json` — không sửa tay 2 nơi nữa. `template.oaID` vẫn còn `YOUR_OA_ID`, phải điền trước khi deploy.
7. **`zmp` CLI là tool global**, không nằm trong deps → verify bằng `npx tsc --noEmit` + `npx vite build` (nhớ trò đổi `/src/app.ts` → `/app.ts` trong `index.html` rồi revert).
8. **Chống nhận suất trùng.** `MealOrder @@unique([employee_id, meal_date, meal_time_id])` chống trùng đơn, nhưng quét 2 lần thì `processPickup` phải idempotent — kiểm lại trước khi mở QR.
9. **Rate limit** cho `/api/zma/auth/login` + `/link` (đoán mã NV).

---

## 8. Việc cần chốt thêm

- **§7.0 — bản triển khai lệch code.** Việc số 1, chặn mọi thứ khác.
- **`secret` khi liên kết lần đầu** là gì: mật khẩu web hiện có (công nhân thường không có tài khoản — `Employee.user_id` nullable), hay ngày sinh / 4 số cuối CCCD?
- **Ai gán `MealOrderScope`** (phạm vi đặt cho xưởng) và danh sách trưởng xưởng/thư ký hiện lấy ở đâu ra.
- **OA ID của spartronics** (`template.oaID` còn placeholder) + `ZMP_TOKEN` trong `.env` đang rỗng. APP_ID/OA của 2 tenant còn lại tính sau.
- **hafu group-ordering** (đặt hộ cả tổ) có cần lên ZMA ở v2 không.
- Domain public của 3 backend để điền `VITE_API_BASE_URL`.

## 9. Đã làm 2026-09-06 — UI đặt suất ăn spartronics trên ZMA (chạy bằng mock)

Toàn bộ luồng nhân viên đã chuyển sang **mô hình spartronics**. (Admin đã rút
gọn còn quét + bếp và nối API ở §10 — mock cũ `src/data/*`, `src/state.ts` đã xoá.)

### Cấu trúc mới
| File | Vai trò |
|---|---|
| `src/api/types.ts` | Chép nguyên `WeeklyMenuData / WeeklyDay / OrderingFoodItem / WeeklyShift` từ `tanloc-spartronics/src/modules/ordering/types.ts`; thêm `PickupCardData`, `OrderHistoryItem`, `Bootstrap`. BFF trả đúng hình này là app chạy. |
| `src/api/config.ts` | `VITE_API_MODE` (`mock`/`live`), `VITE_API_BASE_URL`, `VITE_TENANT`, token trong localStorage. |
| `src/api/client.ts` | fetch + Bearer + `ApiError`. |
| `src/api/ordering.ts` | Cổng duy nhất: `fetchBootstrap / fetchWeekMenu / batchOrder / fetchPickupCard / fetchOrderHistory` → mock hoặc `/api/zma/{bootstrap,week-menu,batch-order,ticket,orders}`. |
| `src/api/mock/ordering.mock.ts` | Mock spartronics: 3 ca (Ca 1 11:30, Ca 2 17:30, Ca 3 23:00), khoá 48h tính bằng `lib/ordering-lock.ts`, cột Mặn 1/Mặn 2 (combo) + Món thay thế (SUB) + Chay, roster Ca 1 = main / Ca 2 = ot / Ca 3 = none, luật 1 main + 1 ot/ngày, `noPortion[]`. Đơn lưu ở `localStorage["goeat.mock.orders.v1"]`. |
| `src/lib/date-vn.ts` | Lịch VN (Asia/Ho_Chi_Minh): `ymdVN`, `weekdayVN`, `cutoffText`, `cutoffSummary`, `splitDishName`… (port `ordering-parts.tsx`). |
| `src/lib/ordering-lock.ts` | Port `ordering-lock.ts` (effectiveLockMinutes, lockClock, lockLeadDays). UI không tự khoá — chỉ mock dùng. |
| `src/state/ordering.ts` | jotai + `useWeekMenu()`: ghi-thẳng lạc quan, hàng đợi tuần tự, hoàn khi lỗi, nhãn `none` từ `noPortion`, `countPortions` (bỏ none), `autoDishOf`. |
| `src/state/pickup.ts` | `usePickupCard`, `useOrderHistory`. |
| `src/components/ordering/` | `day-card` (số ngày + chip ca + radio món + hạn chốt + "Bỏ chọn ca này"), `dish-slot`, `shift-chips`, `dish-icon` (icon theo loại, không ảnh), `status` (loading/error). |
| Pages | `home` (Hôm nay + ngày kế còn mở + hạn chốt), `weekly` (Tuần này/Tuần sau, tổng suất, Xoá tuần 2 chạm), `orders` (Sắp tới/Đã qua, Tăng ca/Ngoài ca, giờ nhận), `qr-tab`/`qr-screen` (QR = card_number‖employee_code, suất hôm nay + khung giờ phát), `profile` (chỉ xem, không mật khẩu). |

### Khác với bản mock cũ
- Không giá, không ảnh món, không bước "xác nhận" — chạm là lưu.
- Ca là `meal_time_id` số; ngày là `YYYY-MM-DD`; "hôm nay" theo giờ VN.
- Tab footer: "Hôm nay" · "Đăng ký" · Mã QR · Suất ăn · Cá nhân.
- Route `/profile/change-password` đã bỏ (đăng nhập bằng Zalo).

### Bật live
Đặt `VITE_API_MODE=live` — BFF đã có (§10); còn thiếu là **deploy** bản
spartronics mới lên server (§7.0) + chạy migration + đặt env.

## 10. Đã làm 2026-09-06 (chiều) — BFF `/api/zma/*` trên spartronics + admin ZMA rút gọn

### 10.1 BFF trong `tanloc-spartronics` (code xong, type-check / lint / 862 test xanh — **chưa deploy**)

Module mới `src/modules/zma/` (types, `services/{token,zalo-graph,zma-auth,zma-employee,zma-staff}.service.ts`,
`api/handler.ts`, barrel `index.ts`) + route `src/app/api/zma/**`. `/api/zma` được thêm vào
`publicPrefixes` của `src/proxy.ts`; mỗi handler tự xác thực bằer bearer token (không cookie —
WebView Zalo là origin khác). CORS mở cho `https://h5.zdn.vn`, `localhost:2999/3000`
(`ZMA_ALLOWED_ORIGINS`), mọi route export `OPTIONS`.

| Route | Gác | Trả về |
|---|---|---|
| `POST /api/zma/auth/login` `{access_token, phone_token}` | public | `{token, employee}`; 404 `{code:"NEED_LINK"}` nếu SĐT chưa có trong HR |
| `POST /api/zma/auth/link` `{access_token, phone_token, employee_code}` | public | như trên; 409 `PHONE_MISMATCH` / `ALREADY_LINKED`, 404 `EMPLOYEE_NOT_FOUND` |
| `POST /api/zma/auth/dev-login` `{employee_code}` | public, chỉ khi `ZMA_DEV_LOGIN=1` và không phải production | `{token, employee}` |
| `GET /api/zma/bootstrap` | bearer | `{employee, config:{tenant,hidePrice,deadlineHours,futureHorizonDays}, staff:{canScan,canKitchen}}` |
| `GET /api/zma/week-menu` | bearer | `{data: WeeklyMenuData}` (đúng `getWeeklyMenuForOrdering`) |
| `POST /api/zma/batch-order` | bearer | `{message, data:{noPortion}}` (cùng schema/luật với `/api/ordering/batch-order`) |
| `GET /api/zma/ticket` | bearer | `{data: PickupCardData}` (theo employee_id, không cần User) |
| `GET /api/zma/orders` | bearer | `{data: OrderHistoryItem[]}` — từ thứ Hai tuần trước đến hôm nay + 14 |
| `GET /api/zma/staff/kitchen` | bearer + `pickup:view` | `{data: KitchenBoard}` — tổng hôm nay theo ca và theo món |
| `POST /api/zma/staff/scan` `{scan_value, client_id?}` | bearer + `pickup:process` | 200 `{data, duplicate, message}` / 409 `{error, result, details, duplicate}` — y hệt `/api/pickup/process` (dedupe, pickup_scan_logs, SSE cho màn bếp) |

**Token**: HMAC-SHA256, payload `{e: employeeId, z: zaloUserId, iat, exp}`, 30 ngày, secret
`ZMA_TOKEN_SECRET || BETTER_AUTH_SECRET`. Token bị từ chối nếu `z` ≠ `employees.zalo_user_id` hiện tại
(HR gỡ liên kết ⇒ đăng nhập lại).

**Khớp NV**: Zalo Graph `/me` → `zalo_user_id`; `/me/info` (code = phone token, secret_key = `ZALO_APP_SECRET`)
→ SĐT chuẩn hoá `0xxxxxxxxx`, so 9 số cuối. Thứ tự: theo `zalo_user_id` → theo SĐT (tự liên kết) →
`NEED_LINK`. Liên kết bằng mã NV chỉ khi hồ sơ **chưa có SĐT** hoặc SĐT trùng SĐT Zalo.

**Quyền quầy/bếp** = RBAC của tài khoản web gắn `employees.user_id`: `pickup:process` ⇒ `canScan`,
`pickup:view` ⇒ `canKitchen`. Không có User ⇒ nhân viên thường.

**Schema** (`prisma/schema/hr.prisma`, migration `prisma/migrations/20260906100000_employee_zalo_link/`):
`employees.zalo_user_id TEXT UNIQUE`, `zalo_phone TEXT`, `zalo_linked_at TIMESTAMPTZ(3)`.
Chạy `pnpm prisma:deploy` trên server (không migrate dev).

**Env server** (`.env.example` đã ghi): `ZALO_APP_ID`, `ZALO_APP_SECRET` (bắt buộc cho login),
`ZMA_TOKEN_SECRET` (nên đặt riêng), `ZMA_ALLOWED_ORIGINS`, `ZMA_DEV_LOGIN`.

### 10.2 goeat-zma

- `src/api/auth.ts`: `loginWithZalo()` = zmp-sdk `getAccessToken` + `getPhoneNumber().token` → `/auth/login`;
  `linkEmployee(code)`; `VITE_DEV_EMPLOYEE_CODE` ⇒ đi `/auth/dev-login` (thử live trong simulator).
- `src/components/auth-gate.tsx` bọc Page + Footer trong `layout.tsx`: mock ⇒ cho qua; live ⇒ tự đăng nhập,
  màn "Liên kết hồ sơ nhân viên" khi `NEED_LINK`, nghe sự kiện 401 (`client.ts` xoá token, phát
  `goeat:unauthorized`) để đăng nhập lại. `credentials: "omit"`.
- `src/api/staff.ts` (+ `mock/staff.mock.ts`): `scanCard()` gom 200/409 thành `ScanOutcome`, `fetchKitchenBoard()`.
  Mock: thẻ NV mẫu `0007248113` đọc kho đơn; đồng nghiệp mẫu `0007248201..204` (phát / chay / đã nhận / không suất).
- Admin còn **2 màn**, gác bằng `StaffGuard` (theo `bootstrap.staff`): `/admin/scan` (camera zmp `scanQRCode`
  + nhập tay, thẻ kết quả xanh/vàng/đỏ, 30 lượt gần nhất) và `/admin/kitchen` (theo ca + món, đã phát/đăng ký,
  tự làm mới 30s). `/admin` → `/admin/scan`. Footer admin: Quét thẻ · Bếp · Cá nhân. Nút "Chế độ Quầy & Bếp"
  ở Cá nhân chỉ hiện khi có quyền.
- Đã xoá: `pages/admin/{dashboard,shifts,menu,revenue,scan-history}`, `components/admin-ui.tsx`, `src/state.ts`,
  `src/data/*`, `Price` trong `ui.tsx`.

### 10.3 Còn lại để lên live (cần anh quyết)
1. Deploy code `tanloc-spartronics` hiện tại lên `tanloc-spartronics.goeat.vn` (§7.0), `pnpm prisma:deploy`,
   đặt `ZALO_APP_SECRET` + `ZMA_TOKEN_SECRET` (+ `ZMA_DEV_LOGIN=1` nếu muốn thử bằng mã NV).
2. Trên Zalo Developers: app `2600294893392654695` bật quyền SĐT (`scope.userPhonenumber`), lấy App Secret,
   khai domain gọi API `tanloc-spartronics.goeat.vn`. OA ID = `3436289450962234133` (đã điền vào
   `app-config.json` ngày 2026-09-09; trước đó là placeholder `YOUR_OA_ID`).
3. ZMA: `VITE_API_MODE=live`, thử trong simulator bằng `VITE_DEV_EMPLOYEE_CODE`, rồi `zmp deploy` bản testing.
4. Chưa làm: đặt nhóm (§2b), QR token ký (§3), thông báo trước giờ chốt.

## 11. Đã làm 2026-09-07 — Đồng bộ giao diện ZMA theo trang đặt món web spartronics

Toàn bộ app (không chỉ trang đặt món) bỏ ngôn ngữ "xanh phú quý + gradient" của prototype, dùng đúng
ngôn ngữ trang `/ordering` của `tanloc-spartronics` (FreshDaily / Modern Organic):

- **Token** (`src/css/tokens.css`): thêm khối `--fd-*` chép từ `goeat-tokens.css` (xanh rừng `--fd-wd-solid #14724c`,
  tờ lịch đất nung `--fd-cal-*`, cam "Hôm nay" `--fd-accent-*`, vàng T7 / đỏ CN, mực loại món `--fd-cat-*`,
  ổ khoá `--fd-lock`). Thang `--teal-*` đổi sang họ xanh rừng, `--gold` sang `#c68a12`, `--bg-page` thành trắng —
  nên `Btn`, `Field`, `cardS`, footer… tự đổi theo.
- **Đặt món** (`components/ordering/*`): `day-card` = thẻ trắng viền xanh nhạt, hoa văn chấm góc, `.ge-daynum`
  tờ lịch, viên "Hôm nay" cam, chip ca rời, dòng món kiểu radio (`dish-slot`: chỉ dòng chọn có khung vàng đứt nét +
  viên "Đã chọn", dòng khác viên xanh "Thay đổi"), nút "Bỏ chọn ca này" đỏ; `dish-icon` = màu/biểu tượng theo loại
  món (mặn/nước/chay/thay thế). `pages/weekly.tsx`: tab tuần dạng viên trong máng, dòng "Đã chọn N/M ngày".
- **Các trang khác**: `home` (đầu trang trắng, ô Hôm nay cam / tuần xanh, băng hạn chốt cam), `qr-tab` +
  `qr-ticket` (nền trắng, thẻ viền xanh 2px, lỗ đục), `orders` (hàng dùng tờ lịch + viên trạng thái),
  `profile` (đầu trang trắng, ô thống kê xanh nhạt), `footer` (nút QR xanh đặc), `auth-gate` (trắng),
  `admin/scan` (nút quét xanh), `admin/kitchen` (thẻ ca đang phát viền xanh).
- Ảnh kiểm chứng 390×844: `.playwright-mcp/restyle-{weekly,home,qr,orders,profile,scan2,kitchen}.png`.
- Chưa động: `profile/edit.tsx` (dùng `ScreenHeader`/`Field` chung nên đã theo token mới), logic API/state.

### 11.1 Sửa 2026-09-08 — trang chủ khác trang Đăng ký; khung app bám chiều cao thật
- **Trang chủ** (`pages/home.tsx`) viết lại theo cấu trúc `EmpHome` của bản mẫu `docs/GoEat-zma.html`,
  không nhúng `DayCard` nữa (trước đó trang chủ = 2 thẻ ngày y hệt trang Đăng ký): chào + thẻ NV →
  thẻ **Suất ăn hôm nay** (viên Đã nhận / Đã đặt / Suất mặc định / Chưa đặt, ca · giờ phát từ
  `usePickupCard`, món, nút **Hiện mã nhận cơm** → `/qr`) → nhắc hạn chốt → **Thực đơn hôm nay**
  (chip ca + `DishSlot`, chạm là lưu, link "Đặt cả tuần") → **Sắp tới** (1 dòng/ngày, tối đa 4, bấm sang `/weekly`).
- **Khung app** (`components/layout.tsx` + `.ge-shell` trong `app.scss`): bỏ `h-screen` (100vh) — trên webview
  di động 100vh gồm cả phần bị thanh công cụ che nên thanh điều hướng dưới có thể bị đẩy ra ngoài màn hình;
  dùng `height: 100%` (html/body 100%) + `100dvh`, và `max-width: 560px` căn giữa để khi mở giả lập toàn cửa
  sổ vẫn nhìn như điện thoại (viền hai bên từ 600px).
- Ảnh: `.playwright-mcp/home-v2.png`, `home-v2-bottom.png` (390×844), `sim-shell-v2.png` (giả lập 1280×900).
- Các màn của bản mẫu KHÔNG có trong bản spartronics (đã bỏ ở §10.2, cần anh quyết có làm lại không):
  Admin Tổng quan, Ca làm, Menu tuần, Lịch sử quét QR, Báo cáo doanh thu, Đổi mật khẩu, giỏ hàng/thanh toán.

### 11.2 Sửa 2026-09-08 — "xấu hơn bản thiết kế": trả lại chiều sâu và nhận diện

Người dùng: *"hiện tại đang xấu hơn bản thiết kế đấy … trang đặt món thì ổn rồi"*.
Đã hỏi ý ba nhóm thiết kế chạy song song bằng Gemini CLI (lead product
designer · mobile UI critic · visual design system) — báo cáo lưu ở
scratchpad `gemini/{lead,critic,system}.md`. **Cả ba chẩn đoán giống nhau:**

1. **Trắng trên trắng.** Đợt restyle 2026-09-07 đổi `--bg-page` thành trắng
   tinh, trong khi thẻ cũng trắng ⇒ thẻ mất hết chiều sâu.
2. **Hội chứng wireframe.** Để bù, thẻ được viền `inset 0 0 0 2px` xanh đặc
   ⇒ nhìn như bản vẽ khung, không như sản phẩm.
3. **Mất nhận diện.** Header xanh thương hiệu bị xoá khỏi Hôm nay / Mã QR /
   Cá nhân; màn Mã QR mất nền xanh nên hai khuyết bán nguyệt của tấm vé
   thành dị tật đồ hoạ.

**Điểm mâu thuẫn và cách xử lý.** Cả ba đề xuất đổi nền TOÀN APP sang sage,
nhưng như vậy sẽ đụng vào trang Đăng ký — trang duy nhất người dùng đã duyệt.
Quyết định: nền sage chỉ áp cho **Hôm nay · Suất ăn · Cá nhân**; **Đăng ký
giữ nguyên nền trắng** và `src/components/ordering/*` không sửa một dòng.
Đồng bộ giữa hai nhóm trang đến từ typography, tờ lịch đất nung, bộ icon và
bán kính bo 16–20px, không phải từ màu nền.

**Đã làm**

| Việc | Tệp |
| --- | --- |
| Lớp token chiều sâu `--ge-sage`, `--ge-header`, `--ge-shadow-*`, `--ge-glass*`, `--ge-card-strip` | `src/css/tokens.css` |
| `GreenHeader` — nền radial-gradient xanh + gợn sóng SVG (port đúng `EmpHome` của bản mẫu) | `src/components/green-header.tsx` |
| Hôm nay: header xanh + viên kính mờ, nền sage, thẻ hero có dải tiêu đề, bỏ vòng viền 2px, tên món 18px | `src/pages/home.tsx` |
| Mã QR: nền xanh `--teal-700` phẳng phủ kín (khuyết bán nguyệt trùng màu tuyệt đối), vé trắng bóng đổ sâu, QR mực xanh `#0d4d33` | `src/pages/qr-tab.tsx`, `src/pages/qr-screen.tsx`, `src/components/qr-ticket.tsx` |
| Suất ăn: nền sage, "Sắp tới" dùng thẻ hai tầng + nút nhanh **Mã QR**, "Đã qua" dùng dòng gọn | `src/pages/orders.tsx` |
| Cá nhân: header xanh, 3 ô thống kê kính mờ (hết cắt ba chấm), nhóm danh sách trắng có bóng | `src/pages/profile/index.tsx` |
| Bottom nav: bo góc trên 18px, bóng nâng, nút QR 56px gradient + quầng sáng | `src/components/footer.tsx` |

**Không đụng tới:** `src/pages/weekly.tsx`, `src/components/ordering/*`.

Ảnh chụp: `.playwright-mcp/v5-{home,qr,orders,profile,weekly}.png` (390×844) và
`v5-sim-shell.png` (giả lập :3000). `npx tsc --noEmit` sạch, console không lỗi.

## 11.3 Audit chức năng 2026-09-08 (4 agent Gemini + click-through Playwright)

4 agent `gemini-3.1-pro-high` soi 4 mảng (luồng đặt món · tầng API/mock ·
staff-RBAC · ngày-giờ), song song với 3 lượt click-through thật trên
`http://localhost:2999`. Mọi phát hiện dưới đây **đã được đọc lại trong mã**,
phần có dấu ▶ là **đã tái hiện được trên trình duyệt**.

### Bảng trạng thái

| Chức năng | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Chạm món → lưu ngay, chống bấm đúp | CHẠY ĐÚNG | `writeQueue` nối đuôi, `state/ordering.ts:26` ▶ đã lưu + reload vẫn còn |
| Bỏ chọn 1 ca / cả tuần | CHẠY ĐÚNG | `patchDay` xoá đúng `shiftId` |
| Chặn ô quá hạn chốt | CHẠY ĐÚNG | chặn 2 lớp: `dish-slot.tsx:108` (div, không onClick) + `ordering.ts:161` |
| Món mặc định (auto dish) trên lưới | CHẠY ĐÚNG | `autoDishOf` ổn định; home + day-card đều hiện |
| Đếm suất bỏ `entitlement=none` | CHẠY ĐÚNG | `ordering.ts:192` |
| Đồng bộ state Hôm nay ↔ Đăng ký | CHẠY ĐÚNG | chung `weekMenuAtom` |
| Chủ nhật / thực đơn rỗng | CHẠY ĐÚNG | `EmptyBody` phân biệt CN vs chưa lên món |
| Quét QR quầy (thật / trùng / lạ) | CHẠY ĐÚNG | ▶ "Phát thành công" → "Đã nhận rồi" → "Không tìm thấy NV" |
| Bảng bếp, tự làm mới 30s, tách ca | CHẠY ĐÚNG | `kitchen.tsx:47` |
| `StaffGuard` chặn `/admin/*` | CHẠY ĐÚNG | bọc trong page, không ở router |
| AuthGate khi từ chối cấp quyền | CHẠY ĐÚNG | `auth-gate.tsx:36` → phase "error", không lặp vô hạn |
| `ymdVN/hmVN` khi máy sai múi giờ | CHẠY ĐÚNG | `Intl.DateTimeFormat` + `Asia/Ho_Chi_Minh` |
| `mondayOf` với Chủ nhật (index 0) | CHẠY ĐÚNG | `date-vn.ts:28` |
| **Giờ nhận cơm khi quét trùng** | **CÓ LỖI (CHẶN)** | ▶ quét 11:35 → báo "đã nhận lúc 04:35" |
| **Suất đã phát vẫn nằm ở "Sắp tới"** | **CÓ LỖI (NẶNG)** | ▶ Ca 1 phát 11:35 vẫn "Chờ phát" |
| **Nhân sự bếp bấm "Cá nhân" → kẹt** | **CÓ LỖI (NẶNG)** | ▶ footer đổi từ 3 tab admin sang 5 tab NV |
| **Thẻ QR bỏ qua món mặc định** | **CÓ LỖI (NẶNG)** | ▶ xoá kho đơn → "Hôm nay bạn chưa có suất ăn" dù lưới hiện món mặc định |
| **Rollback ghi đè khi bấm nhanh + rớt mạng** | CÓ LỖI (NẶNG) | `ordering.ts:131-143` dùng `prevLine` từ closure cũ |
| `fetchBootstrap` không bóc `.data` | CÓ LỖI (NẶNG, live) | `api/ordering.ts:9` lệch với 4 endpoint còn lại |
| `api()` trả `null` khi body rỗng | CÓ LỖI (CHẶN, tiềm ẩn) | `client.ts:31` → `batchOrder` đọc `r.message` trên null |
| `MEAL_TIMES.find(...)!` trong lịch sử | CÓ LỖI (NHẸ) | `ordering.mock.ts:232` — trắng màn nếu ca bị xoá |
| Kho mock không gắn mã NV, không dọn rác | CÓ LỖI (VỪA) | `STORE_KEY` cứng, 2 tài khoản dùng chung máy sẽ đè nhau |
| Đăng xuất không dọn `client_id` + kho mock | CÓ LỖI (VỪA) | `auth.ts:48` chỉ `setToken(null)` |
| Ca vắt qua nửa đêm | CHƯA LÀM | `ordering-lock.ts:19` và `nowHm > end_time` đều sai nếu có ca 00:xx |
| UI tự khoá khi ngồi im qua giờ chốt | CHƯA LÀM | không có timer, chỉ chặn khi bấm |
| `profile/edit` lưu được gì | ĐÚNG THIẾT KẾ | mọi `onChange={noop}`, đọc-thôi, có chú thích báo HR |
| `dataRef` thừa | RÁC | `ordering.ts:62-63` khai báo rồi không dùng |

### Ưu tiên sửa
1. `mock/staff.mock.ts:47` — `.slice(11,16)` trên ISO → `hmVN(new Date(...))`.
2. `mock/ordering.mock.ts:234` — bỏ `&& done` khỏi `picked_up`; đã phát là đã phát.
3. `mock/ordering.mock.ts:200` — thẻ QR phải rơi về `autoDishOf` như trang Hôm nay.
4. `router.tsx` — thêm `/admin/profile` (`nav: "admin"`), trỏ `ADMIN_TABS` vào đó.
5. `state/ordering.ts:131-143` — bỏ rollback bằng `prevLine`, chỉ `void load(true)`.
6. `api/client.ts:31` — body rỗng trả `{}` thay vì `null`.
7. `api/ordering.ts:9` — đối chiếu BFF xem `/bootstrap` có bọc `.data` không.
8. Dọn: `dataRef`, `find(...)!`, `STORE_KEY` gắn mã NV, `logout()` xoá `client_id`.

Ảnh: `.playwright-mcp/audit-{1..8}-*.png`.

## 11.4 Sửa lỗi chức năng 2026-09-08 (từ audit §11.3)

Đã sửa và kiểm chứng lại trên trình duyệt (dùng `page.clock` ghim 11:35 giờ VN
để rơi đúng vào Ca 1). `npx tsc --noEmit` sạch, 0 lỗi console trên 9 route.

| Tệp | Sửa gì |
| --- | --- |
| `api/mock/staff.mock.ts` | giờ nhận cơm: `.slice(11,16)` (ISO=UTC) ➝ `hmVN(new Date(...))`; quầy phát công nhận **suất mặc định** qua `effectiveOrder()` |
| `api/mock/ordering.mock.ts` | thêm `effectiveOrder(date, shiftId)` — nguồn duy nhất cho "đơn đã chọn **hoặc** suất mặc định"; `mockPickupCard` dùng lại nó; `picked_up`/`pickup_time` bỏ điều kiện `&& done`; bỏ `MEAL_TIMES.find(...)!`; `STORE_KEY` gắn mã NV |
| `state/ordering.ts` | bỏ rollback bằng `prevLine`/`prevEnt` trong closure (ghi đè lựa chọn mới khi bấm nhanh + rớt mạng) — chỉ `void load(true)`; xoá `dataRef` thừa |
| `api/client.ts` | body rỗng trả `{}` thay vì `null` (chặn crash `batchOrder`) |
| `router.tsx` + `components/footer.tsx` | thêm route `/admin/profile` (`nav: "admin"`), `ADMIN_TABS` trỏ vào đó — nhân sự bếp không còn kẹt sang nav nhân viên |
| `api/config.ts` + `api/auth.ts` | `clearLocalData()` xoá mọi khoá `goeat.*`; `logout()` gọi nó |

**KHÔNG sửa** `api/ordering.ts:9` (`fetchBootstrap` không bóc `.data`): đã đối
chiếu BFF — `tanloc-spartronics/src/app/api/zma/bootstrap/route.ts` trả
`NextResponse.json(await getZmaBootstrap(employee))` ở gốc, khác `/ticket` bọc
`{ data }`. Mã hiện tại **đúng**; đây là báo động nhầm của agent.

**Còn nợ (chưa làm, chờ quyết định):**
- Ca vắt qua nửa đêm: `ordering-lock.ts:19` `mealStartMs` và so sánh chuỗi
  `nowHm > end_time` đều sai nếu có ca 00:xx. Hiện 3 ca đều trong ngày nên chưa lộ.
- UI không tự khoá ô khi ngồi im qua giờ chốt (chỉ báo lỗi lúc bấm).
- Dock điều hướng `background: "transparent"` (`footer.tsx`) chìm trên nền xanh
  của màn `/qr` — lỗi thiết kế, chưa đụng vì tệp đang được sửa song song.

Ảnh: `.playwright-mcp/fix-{qr,scan-dup,orders2,adminprofile,weekly-persist}.png`.

## 11.5 Dọn nốt 3 khoản nợ 2026-09-09

| Khoản nợ (§11.4) | Kết quả |
| --- | --- |
| Dock nav trong suốt chìm trên `/qr` | **Không còn** — bản `footer.tsx` hiện tại vẽ thân dock bằng SVG `fill="#ffffff"` có `drop-shadow`, nổi rõ trên nền xanh. Chỉ lớp `<nav>` bao ngoài là trong suốt (cố ý, để nền trang lộ ra quanh dock). Ảnh: `scratchpad/dock_qr.png`. |
| Ca vắt qua nửa đêm | **Đã sửa** — thêm `src/lib/shift-window.ts`. |
| UI không tự khoá khi qua giờ chốt | **Đã sửa** — hẹn giờ nạp lại trong `useWeekMenu`. |

### Ca vắt qua nửa đêm — `src/lib/shift-window.ts` (mới)

Quy ước: `end_time <= start_time` ⇒ ca kết thúc sang ngày hôm sau. Mọi so sánh
quy về phút và cộng 1440 cho mốc kết thúc, thay cho so chuỗi `"HH:mm"` (so chuỗi
cho kết quả **ngược** với ca 23:00–00:30).

- `crossesMidnight` / `startMin` / `endMin` / `openMin`
- `nowMinFor(mt, nowMin, pickup)` — quy giờ hiện tại về cùng trục với ca
- `isServing(mt, nowMin, pickup)` — quầy có đang mở phát không
- `shiftEndMs(ymd, mt)` — epoch ms lúc ca kết thúc (tự nhảy sang `ymd+1`)

Áp vào `staff.mock.ts`: `isOpen` gọi `isServing`; công thức `pct` của bảng bếp
dùng `nowMinFor`/`endMin` thay vì `hmToMin(end_time)`. Với 3 ca hiện tại kết quả
không đổi (đã đối chiếu: 11:35 → Ca 1 217 suất / đã phát 58, y như trước).

`mealStartMs` trong `ordering-lock.ts` **giữ nguyên** — giờ bắt đầu luôn nằm trên
chính ngày ăn, không có gì sai; chỉ mốc *kết thúc* mới cần cộng ngày.

Nhân tiện sửa `minToHm` trong `ordering.mock.ts`: chuẩn hoá về `[0,1440)` **trước**
khi chia, nếu không mốc mở quầy âm (ca bắt đầu ngay sau 00:00) ra `"23:-15"`.

Kiểm chứng (`npx tsx`), ca 23:00–00:30 mở quầy trước 15':

```
endMin = 1470            22:40 ✗   22:50 ✓   23:10 ✓   23:59 ✓
shiftEndMs → 10/09 00:30  00:10 ✓   00:29 ✓   00:40 ✗   12:00 ✗
```

### Tự khoá khi qua giờ chốt — `src/state/ordering.ts`

`lockAtMs(date, shift)` = `addDays(date, -cutoff_days)` lúc `cutoff_time` (+07:00).
`useWeekMenu` thêm một effect: quét mọi ô **chưa khoá** của cả hai tuần, lấy mốc
chốt gần nhất còn ở tương lai, `setTimeout` tới đó rồi `load(true)` (nạp im lặng).
Mỗi lần `data` đổi thì effect chạy lại và hẹn mốc kế tiếp; không có vòng lặp vì
mốc đã qua bị loại bởi điều kiện `at > now`.

Kiểm chứng bằng `page.clock.install` tại **09/09 11:29**, mở `/weekly`, chọn ngày
T6 11/09 (Ca 1 chốt 11:30 hôm nay), **không chạm gì cả**, chạy đồng hồ tới 11:30:

- trước: `… Cá nục kho | Mặc định | Thịt xá xíu | Chọn | Gà kho sả | Chọn …`
- sau:  `… Ca 1 đã hết hạn đổi món — chốt 11:30 trước 2 ngày. Còn Ca 2, Ca 3 đổi được. …`
  (các nút **Chọn** biến mất)

Hồi quy: `npx tsc --noEmit` sạch; 8 route (`/`, `/weekly`, `/orders`, `/qr`,
`/profile`, `/admin/{scan,kitchen,profile}`) render đủ, **0 lỗi console**.

## 11.6 Chế độ Quầy & Bếp: gác theo quyền + lối ra 2026-09-09

Anh báo hai điểm: (1) chế độ quầy/bếp phải có quyền mới thấy, (2) vào rồi không
có đường về chế độ nhân viên.

| Chỗ | Trước | Sau |
| --- | --- | --- |
| Thẻ vào ở `/profile` | đã gác sẵn theo `staff.canScan \|\| canKitchen` | giữ nguyên |
| Tab dưới của chế độ quầy | **luôn** hiện `Quét thẻ · Bếp · Cá nhân` | lọc theo quyền: `canScan` ⇒ Quét thẻ, `canKitchen` ⇒ Bếp |
| `/admin` | `Navigate` cứng sang `/admin/scan` | `AdminEntry` chọn màn NV thực sự có quyền, không có quyền thì về `/profile` |
| `/admin/profile` | lặp lại thẻ "Chế độ Quầy & Bếp" (bấm vào quay lại chính chế độ đó) | thành **"Về chế độ nhân viên"** ➝ `/` |

`ADMIN_TABS` nay có trường `need?: "canScan" | "canKitchen"`; chưa biết quyền
(`boot` còn null) thì **chưa** hiện tab, tránh nháy ra rồi mất. Tab Cá nhân không
gác — đó chính là lối ra.

Kiểm chứng bằng cách tạm đổi `staff` trong `mockBootstrap` (đã trả lại
`{canScan:true, canKitchen:true}` sau khi thử):

| `staff` | `/profile` | Vào chế độ | Tab dưới | `/admin` |
| --- | --- | --- | --- | --- |
| scan+kitchen | thẻ "Chế độ Quầy & Bếp" | `/admin/scan` | Quét thẻ · Bếp · Cá nhân | `/admin/scan` |
| chỉ kitchen | thẻ, phụ đề chỉ "Bảng bếp hôm nay" | `/admin/kitchen` | **Bếp · Cá nhân** | `/admin/kitchen` |
| không quyền | **không có thẻ** | — | — | ➝ `/profile` |

Gõ tay `/admin/scan` khi không có quyền vẫn ra tường "Chưa được cấp quyền" của
`StaffGuard` (tab dưới còn mỗi Cá nhân). Vòng ra/vào đủ: `/profile` ➝ `/admin/scan`
➝ tab Cá nhân ➝ "Về chế độ nhân viên" ➝ `/`. `npx tsc --noEmit` sạch, 0 pageerror.

---

## 11.7. Chế độ Quầy & Bếp: PHÁT MÓN NGOẠI LỆ (2026-09-09)

Port chức năng "phát ngoại lệ" của app web spartronics (`/pickup/manual`) sang Mini App.

**Vì sao có:** người thật đứng trước quầy thì phải được ăn kể cả khi hệ thống không dự
báo suất cho họ (chấm công chưa về, đổi ca đột xuất, khách) — nhưng lối đi đó phải có
NGƯỜI BẤM, có LÝ DO và để lại dấu (§16, §17.3, §21).

**Quyền riêng.** `manual-dispense:create`, KHÔNG dùng chung `pickup:process`: quét thẻ chỉ
đóng dấu lên suất đã có, còn đây là TẠO suất ngoài dự báo. `StaffAccess` do đó có cờ thứ ba
`canManual`.

### BFF (`../tanloc-spartronics`) — đã viết, CHƯA deploy
| Tệp | Thay đổi |
| --- | --- |
| `src/modules/zma/types.ts` | `ZmaStaffAccess` thêm `canManual` |
| `src/modules/zma/services/zma-employee.service.ts` | `staffAccessFor` thêm `checkPermission(session, "manual-dispense", "create")` |
| `src/app/api/zma/staff/manual/route.ts` (mới) | `GET` (lý do + món, hoặc `?q=` tra cứu NV) gác `manual-dispense:view`; `POST` phát ngoại lệ gác `manual-dispense:create`, gọi thẳng `dispenseManualPickup`, phát `emitPickupEvent`, 409 khi `PickupError` |

Route dùng lại nguyên bộ nghiệp vụ của web (`dispenseManualPickup`, `listManualReasons`,
`listManualDishOptions`, `searchEmployeesForTemporaryCard`) — không nhân bản luật.
Ô tra cứu NV gác bằng `manual-dispense:view` chứ không phải `temp-card-issue:view` như web,
vì ở Mini App nó chỉ tồn tại để nạp cho đúng form này.

### ZMA (`goeat-zma`)
| Tệp | Thay đổi |
| --- | --- |
| `src/api/types.ts` | `StaffAccess.canManual`; thêm `ManualReason`, `ManualDish`, `ManualMeta`, `ManualEmployeeHit`, `ManualDispenseInput`, `ManualDispenseResult`, `ManualOutcome` |
| `src/api/staff.ts` | `fetchManualMeta()`, `searchEmployees(q)`, `dispenseManual(input)` — cùng kiểu 200/409 như `scanCard` |
| `src/api/mock/staff.mock.ts` | `mockManualMeta` / `mockSearchEmployees` / `mockManualDispense`; nhánh NV mẫu ghi thẳng vào kho đơn nên bảng bếp và thẻ QR cùng nhảy; trần 5 suất phát sinh/ngày |
| `src/pages/admin/manual.tsx` (mới) | 2 bước: chọn người (NV hoặc suất phát sinh) ➝ lý do (bắt buộc) + món thay thế + ghi chú; lịch sử phát trong phiên |
| `src/router.tsx` | route `/admin/manual`; `AdminEntry` rơi về `/admin/manual` nếu chỉ có mỗi quyền này |
| `src/components/footer.tsx` | tab "Ngoại lệ" (`need: "canManual"`); `need` mở rộng thành `keyof StaffAccess` |
| `src/components/staff-guard.tsx` | `PERM_LABEL` thay câu điều kiện 2 nhánh — thêm nhánh `canManual` |
| `src/pages/admin/{manual,scan}.tsx` | đáy vùng cuộn `calc(var(--safe-bottom) + 112px)`: nút "Phát suất ngoại lệ" trước đó nằm KHUẤT dưới dock (Playwright không bấm được) |

### Kiểm chứng (mock, Playwright)
| Việc | Kết quả |
| --- | --- |
| Tìm "Bích" ➝ chọn ➝ lý do "Chưa có dữ liệu chấm công" + món thay thế | ✅ "Đã phát ngoại lệ · Trần Thị Bích · SP04901 · Món: Gà rô ti + bắp cải xào", form tự dọn |
| Phát lại đúng người đó | ✅ từ chối "Đã nhận rồi" — ngoại lệ không phải cửa nhận hai lần |
| Suất phát sinh (Khách, có nhãn + bộ phận) | ✅ "Đã phát suất phát sinh · EXTRA · còn 4 suất phát sinh" |
| Phát cho NV mẫu SP04821 ➝ mở bảng bếp | ✅ 347→348 suất, đã phát 58→59, Mặn 1 96/97→97/98 |
| Nút "Phát" khi chưa chọn lý do | ✅ disabled + dòng nhắc "Phải chọn lý do trước khi phát." |
| Tạm gỡ `canManual` trong mock | ✅ dock còn "Quét thẻ / Bếp / Cá nhân"; vào thẳng `/admin/manual` ra tường "cần quyền Phát ngoại lệ (manual-dispense:create)" |

`npx tsc --noEmit` sạch ở CẢ HAI repo. Chưa deploy, chưa chạy migration, chưa commit.

---

## 12. Vai trò × chức năng: đối chiếu web ➝ ZMA và kế hoạch bổ sung (2026-09-09)

### 12.1. Sự thật gốc: Permission Registry của web

Nguồn: `../tanloc-spartronics/src/configs/permissions/*.permissions.ts`.
`defaultGrants` dùng **mã vai trò** (`admin` / `manager` / `staff` / `kitchen`) mà
`scripts/rbac-sync.ts` chỉ cấp NẾU vai trò đó đã tồn tại trong bảng `roles` — tức
danh sách vai trò thật do quản trị tạo, không seed trong code.

➜ **Hệ quả cho ZMA: tuyệt đối không hard-code mã vai trò.** Bootstrap phải suy ra
cờ năng lực từ `checkPermission(session, resource, action)` như `staffAccessFor`
đang làm. Đổi tên vai trò trên web thì Mini App vẫn đúng.

| Resource:action | admin | manager (nhân sự) | staff (nhân viên) | kitchen (bếp) | ZMA hôm nay |
| --- | :-: | :-: | :-: | :-: | --- |
| `ordering:view/create/delete/batch-order` | ✓ | ✓ | ✓ | view | ✅ `/weekly`, `/orders`, `/qr` |
| `ordering:proxy-order` — đặt món **thay người khác** | ✓ | ✓ | — | — | ❌ **thiếu** |
| `meal-registrations:view` — xem đăng ký cả nhà máy | ✓ | ✓ | — | ✓ | ❌ **thiếu** |
| `meal-registrations:update` — **sửa đăng ký** người khác | ✓ | ✓ | — | — | ❌ **thiếu** |
| `meal-registrations:export/import` | ✓ | ✓ | — | export | ⛔ giữ trên web |
| `pickup:view` — bảng bếp | ✓ | ✓ | — | ✓ | ✅ `/admin/kitchen` |
| `pickup:process` — quét thẻ phát | ✓ | ✓ | — | ✓ | ✅ `/admin/scan` |
| `manual-dispense:view/create` — phát ngoại lệ | ✓ | ✓ | — | ✓ | ✅ `/admin/manual` (§11.7) |
| `report:view/export` — báo cáo căn-tin | ✓ | ✓ | — | ✓ | ❌ **thiếu** |
| `temp-card-issue:view` + `pickup:assign-temp-card` — cấp thẻ tạm | ✓ | ✓ | — | ✓ | ❌ (tuỳ chọn) |
| `temp-card-inventory:*`, cấu hình, phân quyền, thực đơn tuần | ✓ | ✓ | — | — | ⛔ giữ trên web |

Chốt lại đúng như nhận xét: **nhân sự (`manager`) là nhóm duy nhất chưa có gì
trong Mini App** ngoài phần dùng chung với nhân viên. Bếp thì thiếu mỗi báo cáo.

**Một điểm lệch trong registry (không gây lỗi, nên biết):** phát ngoại lệ được khai
báo ở HAI chỗ — action `pickup:manual` và resource `manual-dispense:view/create`.
Route thật (`/api/pickup/manual`) gác bằng `manual-dispense:create`, và ZMA đã bám
theo route. `pickup:manual` là mã thừa; đừng cấp quyền theo nó.

### 12.2. Ba cấp năng lực trong `StaffAccess` sau khi bổ sung

```ts
canScan       // pickup:process             — quét thẻ phát suất        ✅
canKitchen    // pickup:view                — bảng bếp hôm nay          ✅
canManual     // manual-dispense:create     — phát ngoại lệ             ✅
canProxy      // ordering:proxy-order       — ĐĂNG KÝ HỘ                ← mới
canRegView    // meal-registrations:view    — xem đăng ký nhà máy       ← mới
canRegEdit    // meal-registrations:update  — SỬA đăng ký người khác    ← mới
canReport     // report:view                — báo cáo căn-tin           ← mới
```

Admin không cần cờ riêng: vai trò `admin` được cấp `*` nên bật hết cờ một cách
tự nhiên — đúng nghĩa "toàn quyền" mà không phải viết nhánh đặc biệt nào.

### 12.3. Giai đoạn 1 — NHÂN SỰ: đăng ký hộ + sửa đăng ký (ưu tiên cao nhất)

Web có hai đường riêng biệt, ZMA nên giữ nguyên sự tách bạch đó:

| Việc | Web | Vì sao tách |
| --- | --- | --- |
| **Đăng ký hộ** cả tuần | `POST /api/ordering/proxy` (`ordering:proxy-order`) | "Đặt giúp người chưa/không dùng app" — cùng luật hạn chốt như tự đặt |
| **Sửa đăng ký** một ngày | `GET/PUT /api/ordering/day-registration` (`meal-registrations:view/update`) | "Sửa dòng đã có của cả nhà máy" — đổi ca, đổi món, qua đủ bộ luật |

**BFF (`../tanloc-spartronics`)** — bọc lại service sẵn có, không viết lại luật:

| Route mới | Gác | Gọi vào |
| --- | --- | --- |
| `GET /api/zma/staff/employees?q=` | `ordering:proxy-order` **hoặc** `meal-registrations:view` | `findEmployeeByCode` / tìm theo mã–tên |
| `GET /api/zma/staff/week-menu?employeeId=` | `ordering:proxy-order` | `getWeeklyMenuForOrdering(targetId)` |
| `POST /api/zma/staff/proxy-order` | `ordering:proxy-order` | `batchPlaceOrUpdateOrders(targetId, save, del, session.user.id)` |
| `GET/PUT /api/zma/staff/day-registration` | `meal-registrations:view` / `:update` | `getDayRegistrationBoard` / `saveDayRegistrations` |

`zmaStaffHandler` chỉ nhận MỘT cặp resource:action, nên route `employees` cần một
biến thể chấp nhận "một trong hai quyền" — thêm `zmaStaffHandlerAny(fn, perms[])`
cạnh nó, đừng nới lỏng cái đang có.

**ZMA (`goeat-zma`)**

| Tệp | Việc |
| --- | --- |
| `src/api/types.ts` | 4 cờ mới + `ProxyEmployee`, `DayRegistrationBoard` |
| `src/api/staff.ts` + `mock/staff.mock.ts` | 4 hàm mới + mock tương ứng |
| `src/pages/admin/proxy.tsx` (mới) | Chọn NV ➝ lưới tuần. **Tái dùng `DayCard` NGUYÊN VẸN** |
| `src/pages/admin/registrations.tsx` (mới) | Chọn NV + ngày ➝ 3 ca ➝ sửa/đổi ca |
| `src/state/proxy-ordering.ts` (mới) | `useProxyWeekMenu(employeeId)` |

**Bẫy phải tránh:** `useWeekMenu` đọc/ghi atom jotai **toàn cục** gắn với chính
người đang đăng nhập. Dùng lại nó cho đặt hộ sẽ **ghi đè lịch của chính nhân sự
đó** trên tab `/weekly`. Hook đặt hộ phải giữ state cục bộ, chỉ dùng chung
component hiển thị. Và không sửa `src/pages/weekly.tsx` — trang đó đã chốt.

**Bắt buộc về UI:** khi đang thao tác hộ, luôn có một dải cảnh báo dính trên đầu
màn — "Đang đặt hộ **Trần Thị Bích · SP04901**" kèm nút thoát. Đặt nhầm người là
lỗi tốn cơm thật và rất khó lần ra.

### 12.4. Giai đoạn 2 — QUẢN LÝ BẾP: báo cáo phát món

Web có 6 báo cáo (`by-date`, `by-shift`, `meal-day`, `orders`, `pickup`, `switch`).
Không bê cả 6 lên điện thoại. Lấy đúng câu hỏi người phụ trách ca hỏi khi đứng
trong bếp:

- `GET /api/zma/staff/report/meal-day?date=` ➝ `getMealDayReport` (`report:view`) —
  "hôm đó bếp nấu bao nhiêu, quầy phát tới đâu", tách theo Ca × Món.
- Màn `/admin/report`: chọn ngày (mặc định hôm nay), KPI tổng đăng ký / đã phát /
  tỷ lệ, tách theo ca, và **số suất ngoại lệ** để thấy ngay ca mình phát bao nhiêu
  suất ngoài dự báo.
- Khác `/admin/kitchen` ở chỗ: bảng bếp là realtime **chỉ hôm nay**; báo cáo là
  **xem lại** và chọn được ngày.
- Không làm xuất Excel trên điện thoại — `report:export` giữ trên web.

### 12.5. Giai đoạn 3 — tuỳ chọn: cấp thẻ tạm

`temp-card-issue:view` + `pickup:assign-temp-card`: quét mã thẻ nhựa rồi gán cho
NV. Việc này hợp điện thoại hơn hẳn web (đang đứng cạnh người cần cấp), nhưng
không phải nhóm nào cũng cần — chỉ làm khi có yêu cầu thật.

**Dứt khoát KHÔNG đưa lên Mini App:** import/export Excel, kho thẻ tạm, cấu hình
đặt suất, phân quyền, soạn thực đơn tuần. Màn hình 6 inch không phải chỗ nhập
liệu hàng loạt, và mọi thứ này đều có sẵn trên web.

### 12.6. Điều hướng: 7 chức năng không nhét vừa 1 dock

Nhân sự (`manager`) sẽ có ĐỦ cả 7 cờ. Dock 5 tab hiện tại không chứa nổi.

**Đề xuất:** `/admin` đổi từ trang chuyển hướng thành **trung tâm** — lưới thẻ
liệt kê đúng những chức năng người đó có quyền (Quét thẻ · Phát ngoại lệ · Bảng
bếp · Báo cáo · Đăng ký hộ · Sửa đăng ký). Dock rút còn 4 tab cố định:
**Trung tâm · Quét thẻ · Đăng ký · Cá nhân**, tab nào không có quyền thì ẩn như
hiện nay. Bếp thuần vẫn thấy đúng 3 thẻ, không loãng.

## 12.7. Đã làm 2026-09-09 — GIAI ĐOẠN 1 (nhân sự): đặt hộ + sửa đăng ký + trung tâm `/admin`

Làm đúng phạm vi §12.3 + §12.6 anh đã chọn. **Chưa deploy, chưa chạy migration,
chưa commit.** Chạy được ngay ở chế độ mock.

### Hai đường, cố ý KHÔNG gộp

| | Đặt món hộ | Sửa đăng ký |
|---|---|---|
| Quyền | `ordering:proxy-order` (`canProxy`) | `meal-registrations:view` / `:update` (`canRegView` / `canRegEdit`) |
| Đơn vị | cả tuần | một ngày |
| Đường ghi | `batchPlaceOrUpdateOrders` — y như nhân viên tự đặt | `saveDayRegistrations` — transaction cả ngày |
| Mốc chặn | **hạn chốt 48h của nhân viên** | **chính bữa ăn** (xong bữa mới khoá) |
| Dùng khi | đặt trước cho người không dùng điện thoại | việc phát sinh **sau** hạn chốt: điều tăng ca, nghỉ đột xuất |

Gộp lại thì hoặc chặn oan nhân sự (áp 48h vào màn sửa ⇒ chỉ sửa được chuyện của
hai ngày sau, tức là không sửa được việc nào có thật), hoặc cho nhân viên đặt
quá hạn. Quá 48h ở màn sửa chỉ là **cảnh báo vàng** ("bếp nấu theo số cũ, nhớ
báo bếp"); quá mốc bếp chốt số là **cảnh báo đỏ**; khoá cứng chỉ khi bữa đã xong
hoặc suất đã nhận cơm.

### BFF (`../tanloc-spartronics`) — đã viết, type-check sạch, CHƯA deploy

- `src/modules/zma/types.ts` — `ZmaStaffAccess` thêm `canProxy` / `canRegView` / `canRegEdit`.
- `src/modules/zma/services/zma-employee.service.ts` — `staffAccessFor` trả 6 cờ, đều qua `checkPermission`, không hard-code mã vai trò.
- `src/modules/zma/api/handler.ts` — CORS thêm `PUT` (màn sửa ghi cả ngày bằng PUT như web); thêm `zmaStaffHandlerAny(fn, perms[])` cho route phục vụ NHIỀU màn. **Không nới `zmaStaffHandler` thành nhận mảng.**
- `GET /api/zma/staff/employees?q=` — tra nhân viên, đủ MỘT trong hai quyền.
- `GET /api/zma/staff/week-menu?employeeId=` — thực đơn tuần của người khác (`ordering:proxy-order`). Cố ý tách khỏi `/api/zma/week-menu`: thêm `employeeId` vào đó là mở toang cả nhà máy.
- `POST /api/zma/staff/proxy-order` — `batchPlaceOrUpdateOrders(target, …, session.user.id)`.
- `GET|PUT /api/zma/staff/day-registration` — `getDayRegistrationBoard` / `saveDayRegistrations`, lỗi trả nguyên câu tiếng Việt của service.

### ZMA (`goeat-zma`)

- `src/api/types.ts` — `StaffAccess` +3 cờ; `ManualEmployeeHit` ➝ `StaffEmployeeHit` (dùng chung 3 màn); thêm `RegistrationBoard` / `RegistrationOrder` / `RegistrationShiftState` / `RegistrationPick` / `RegistrationSaveResult`, hình dạng ĐÚNG như `DayRegistrationBoard` của web để BFF trả thẳng, không map lại.
- `src/api/hr.ts` (mới) — cổng 5 hàm; `src/api/mock/hr.mock.ts` (mới) dùng lại nguyên bộ máy `ordering.mock`.
- `src/api/mock/ordering.mock.ts` — kho đơn tách theo người: `storeOf(employeeId)` / `saveOf(employeeId)`. Nhân sự sửa cho người khác thì đơn của chính mình không suy suyển (người thật ⇒ localStorage, đồng nghiệp ⇒ bộ nhớ phiên).
- `src/state/proxy-ordering.ts` (mới) — `useProxyWeek`. **KHÔNG dùng lại `useWeekMenu`**: hook đó ghi vào atom jotai tầm module, mở lịch của A xong thì trang `/weekly` của chính nhân sự sẽ hiện đơn của A và cú chạm sau lưu nhầm người. Ở đây state cục bộ, đổi người là xoá sạch trước khi nạp.
- `src/components/admin/employee-picker.tsx` (mới) — `EmployeePicker` + `TargetBanner`. Đặt nhầm người là mất một suất cơm thật: chưa chọn ai thì không hiện màn sửa, chọn rồi thì tên DÍNH `sticky` trên đầu kèm nút "Đổi".
- `src/components/admin/proxy-day-card.tsx` (mới) — thẻ ngày prop-driven, dùng lại `DishSlot` / `ShiftChips` / `.ge-daycard` của trang đặt món (KHÔNG sửa `src/components/ordering/*`). `DayCard` gốc tự gọi `useWeekMenu()` nên không tái dùng được.
- `src/pages/admin/proxy.tsx`, `src/pages/admin/registrations.tsx` (mới).
- `src/pages/admin/hub.tsx` (mới) — `/admin` từ trang chuyển hướng thành **trung tâm**: lưới thẻ lọc theo quyền + lối ra "Về suất ăn của tôi". Cuộn cả trang như trang Hôm nay (chỉ cuộn phần dưới thì lưới kéo lên âm 46px bị mép trên cắt mất).
- `src/components/footer.tsx` — dock chế độ nhân sự còn **Trung tâm · Quét thẻ · Đăng ký · Cá nhân**; Bếp và Phát ngoại lệ chuyển vào trung tâm.
- `src/pages/profile/index.tsx` — lối vào chế độ nhân sự nay xét **bất kỳ** cờ nào (trước chỉ `canScan || canKitchen`, nên người chỉ có quyền đặt hộ / sửa đăng ký không bao giờ thấy lối vào) và trỏ về `/admin`.
- `src/components/staff-guard.tsx` — thêm nhãn 3 quyền mới.

### Kiểm chứng (mock, Playwright, `localhost:2999`)

`npx tsc --noEmit` sạch ở cả hai repo. Không có lỗi console.

- `/admin` hiện đủ 5 thẻ theo quyền; dock đúng 4 tab; `/profile` ➝ "Chế độ nhân sự" ➝ `/admin`.
- Đặt hộ Trần Thị Bích T2 tuần sau ➝ "Đã lưu cho nhân viên"; mở `/weekly` của chính mình: **không đổi** (đúng cái bẫy jotai đã tránh).
- Ngày hôm nay quá hạn 48h ⇒ ô đặt hộ khoá kèm câu chỉ đường sang Sửa đăng ký.
- Sửa đăng ký 09/09: cả 3 ca hiện cảnh báo vàng "đã qua hạn chốt … nhớ báo bếp" nhưng **vẫn sửa được**; chọn món ➝ "Lưu thay đổi" ➝ toast "Đã thêm 1 suất."
- Ngày 07/09 (bữa đã xong): cảnh báo đỏ "bữa ăn ngày 07/09/2026 đã xong lúc 12:30 — không sửa được nữa", không ô nào bấm được.

### Chưa làm (chưa được duyệt)

Hết — giai đoạn 3 (cấp thẻ tạm, §12.5) đã làm ở §12.9.2. Ranh giới §12.5 giữ
nguyên: import/export Excel, **kho thẻ tạm**, cấu hình đặt suất, phân quyền,
soạn thực đơn tuần **không** lên Mini App.

---

## 12.8. Đã làm 2026-09-09 — GIAI ĐOẠN 2 (bếp / quản lý): BÁO CÁO PHÁT MÓN

Làm đúng phạm vi §12.4. **Chưa deploy, chưa chạy migration, chưa commit.** Chạy
được ngay ở chế độ mock.

### Vì sao là màn RIÊNG, không nhét vào Bảng bếp

| | Bảng bếp `/admin/kitchen` | Báo cáo `/admin/report` |
|---|---|---|
| Quyền | `pickup:view` (`canKitchen`) | `report:view` (`canReport`) |
| Ngày | **hôm nay**, cứng | **chọn ngày bất kỳ** |
| Nhịp | tự làm mới 30 giây | đọc một lần, có nút tải lại |
| Dùng khi | đang đứng quầy phát cơm | đối soát với nhà máy, xem lại ngày đã qua |

Hai câu hỏi khác nhau nên hai quyền khác nhau — nhà máy có người chỉ được xem
báo cáo mà không đứng quầy, và ngược lại.

### Một hệ số học duy nhất, giữ nguyên như web

```
Dự trù − Loại trừ = Thực nấu = Đã phát + Chưa nhận
Phát ngoại lệ nằm NGOÀI dự trù — cộng riêng, KHÔNG trộn vào Thực nấu.
```

Vì thế "Phát ngoại lệ" luôn ở **thẻ riêng**, và trong thẻ ca nó nằm ở hàng dưới
cùng chứ không bao giờ cộng vào ô Thực nấu. Trộn hai con số là hỏng luôn bản đối
soát với nhà máy.

### BFF (`../tanloc-spartronics`) — đã viết, type-check + lint sạch, CHƯA deploy

- `src/modules/zma/types.ts` — `ZmaStaffAccess` thêm `canReport`.
- `src/modules/zma/services/zma-employee.service.ts` — `staffAccessFor` trả 7 cờ; `canReport = checkPermission(session, "report", "view")`.
- `src/modules/zma/services/zma-report.service.ts` (mới) — `getZmaMealDayReport(date)` là **bản CHIẾU** của `getMealDayReport`, không phải bản sao: mọi phép đếm vẫn nằm ở `modules/report`, ở đây chỉ đổi sang `snake_case` và cắt bớt. **Bỏ hẳn mảng `employees`** (từng người + timeline, mỗi ngày vài nghìn dòng) — muốn tra từng người thì mở web.
- `GET /api/zma/staff/report/meal-day?date=` (mới) — gác `report:view`. **Không có `export`**: `report:export` giữ trên web, không ai xuất Excel trên điện thoại rồi gửi đi được.

### ZMA (`goeat-zma`)

- `src/api/types.ts` — `StaffAccess` thêm `canReport`; thêm `MealDayReport` / `ReportShift` / `ReportDish`, hình dạng đúng payload BFF để trả thẳng, không map lại.
- `src/api/report.ts` (mới) — `fetchMealDayReport(date)`.
- `src/api/mock/report.mock.ts` (mới) — số giả nhưng **tự nhất quán**: mọi con số suy ra từ `forecast` bằng đúng các phép trừ của server, nếu không thì lúc thử màn hình sẽ tưởng mình tính sai công thức. Chủ nhật trả ngày rỗng; ngày mai `roster_pushed = false` để thấy nhãn "đang là số dự trù"; mốc chốt bếp giả cố định 90 phút trước giờ ăn (server thật đọc `cook_lock_minutes_before_start`); suất của chính NV mẫu được cộng vào để đặt món / quét thẻ xong mở báo cáo thấy số nhảy.
- `src/pages/admin/report.tsx` (mới) — dải 14 ngày (11 ngày đã qua + hôm nay + 2 ngày tới, tự cuộn tới hôm nay), KPI ngày, thẻ ngoại lệ riêng, thẻ từng ca có nút mở chi tiết Ca × Món. Ngày chưa tới thì nhãn đổi "Chưa nhận" ➝ "Chưa phát" (bữa còn chưa diễn ra, gọi là "chưa nhận" là nói sai) và thẻ ngoại lệ ẩn hẳn khi chưa phát suất nào.
- `src/router.tsx` — `/admin/report`; `src/pages/admin/hub.tsx` — thẻ thứ 6 `need: "canReport"`; `src/components/staff-guard.tsx` — nhãn `report:view`; `src/pages/profile/index.tsx` — dòng tóm tắt quyền thêm "Báo cáo".
- **Dock giữ nguyên 4 tab** — việc thứ 6 vào trung tâm, không nới thanh điều hướng (đúng lý do §12.7 dựng trung tâm).

### Kiểm chứng (mock, Playwright, `localhost:2999`)

`npx tsc --noEmit` sạch ở cả hai repo, `eslint` sạch ở BFF, 0 lỗi console.

- Hôm nay 09/09: Dự trù 351 − Loại trừ 18 = Thực nấu 333 = Đã phát 57 + Chưa nhận 276; Bếp phải ra 340 = 333 + 7 suất phát sinh. Cộng từng ca đúng bằng tổng.
- Ca 1 "Đã chốt 10:00" (11:30 − 90′), Ca 2/Ca 3 "Chốt lúc 16:00 / 21:30" — đúng trạng thái theo đồng hồ.
- Mở "Chi tiết 4 món": từng dòng Ca × Món có thực nấu / đã phát / loại trừ.
- 07/09 (đã qua): 97% đã phát, còn 9 suất chưa nhận.
- 11/09 (chưa tới): dải vàng "Chưa có danh sách nhà máy cho Ca 1, Ca 2, Ca 3", mỗi ca thêm dòng "đang là số dự trù", nhãn "Chưa phát", thẻ ngoại lệ ẩn.
- 06/09 (chủ nhật): "Ngày này bếp không nấu — không có suất nào."
- `/admin` nay 6 thẻ, xếp 3 hàng × 2 cột, không tràn.

---

## 12.9. Đã làm 2026-09-09 — BỎ "CHẾ ĐỘ NHÂN SỰ" + GIAI ĐOẠN 3: CẤP THẺ TẠM

### 12.9.1. Sửa kiến trúc điều hướng: không còn "chế độ", chỉ còn MENU theo quyền

Nhận xét của người dùng (2026-09-09): *"thiết kế chế độ nhân sự như vầy không
thông minh lắm — mặc định ai cũng sẽ là nhân viên, ai cũng có chức năng cơ bản
của nhân viên, còn các chức năng khác là menu, có quyền là thấy thêm menu chức
năng."* Đúng, và nó xoá luôn ba thứ rườm rà mà §12.7 dựng lên:

| Trước (§12.7) | Sau |
| --- | --- |
| Hai thanh dock: dock nhân viên 5 tab + dock nhân sự 4 tab | **Một dock duy nhất** (5 tab nhân viên) cho mọi người |
| Nút "Chế độ nhân sự" / "Về chế độ nhân viên" ở `/profile` | Không còn vào/ra chế độ nào cả |
| `/admin` là Trung tâm lưới thẻ + `/admin/profile` là bản sao hồ sơ | `/admin` chuyển hướng về `/profile`; **trang Cá nhân CHÍNH LÀ menu** |

Lý do sâu hơn: người đứng quầy **vẫn là nhân viên** và vẫn phải tự đăng ký cơm
cho mình. Dựng một "chế độ" là dựng bức tường giữa hai việc của cùng một người,
lại phải nuôi hai thanh điều hướng, một màn Trung tâm chỉ để liệt kê link, và
một bản sao trang hồ sơ.

- `src/lib/staff-menu.ts` (mới) — **nguồn duy nhất** của danh sách việc theo
  quyền (`STAFF_MENU`, `staffMenuFor(staff)`). Thêm việc mới = thêm một dòng ở
  đây, không phải sắp lại thanh điều hướng.
- `src/pages/profile/index.tsx` — nhóm đầu **"Việc được giao"** hiện đúng những
  dòng tài khoản có quyền; không có quyền nào thì trang này y hệt của mọi nhân
  viên. Bỏ hẳn nút chuyển chế độ.
- `src/components/footer.tsx` — xoá `ADMIN_TABS` và cả nhánh dock thứ hai.
- `src/router.tsx` — mọi `/admin/*` chuyển sang `handle: { back: true }` (màn con
  mở ra từ menu, có nút quay lại), `/admin` → `<Navigate to="/profile">`, bỏ
  `/admin/profile`. Xoá `src/pages/admin/hub.tsx`.
- Sáu màn `/admin/*` — `onBack` nay đều về `/profile` (menu), và đáy vùng cuộn
  giảm từ `+112px` xuống `+24px` vì màn con không có dock che.

### 12.9.2. Cấp thẻ tạm (§12.5)

Việc này hợp điện thoại hơn hẳn web: người cấp **đang đứng cạnh** người quên thẻ,
cầm thẻ nhựa trong tay — quét tại chỗ thay vì chạy về máy tính gõ mã.

**Quyền: `temp-card-issue:view` cho CẢ đọc lẫn ghi** — bám theo route web đang
chạy (`/api/pickup/temporary-cards` gác đúng quyền này ở cả GET và POST), **không**
bám `pickup:assign-temp-card` trong bảng đăng ký quyền: bảng có khai nhưng route
không dùng. Gác khác đi là cấp quyền lệch với web.

**Không đưa lên Mini App:** `bulkCreateTemporaryCards` (nhập kho thẻ hàng loạt) —
đúng ranh giới §12.5.

#### BFF (`../tanloc-spartronics`) — đã viết, tsc + eslint sạch, CHƯA deploy

- `src/modules/zma/types.ts` + `zma-employee.service.ts` — cờ thứ 8 `canTempCard`
  = `checkPermission(session, "temp-card-issue", "view")`.
- `src/modules/zma/services/zma-temp-card.service.ts` (mới) — lớp **chiếu** mỏng:
  luật (thẻ phải có trong kho, thẻ đang kích hoạt thì không cấp lại, hạn +1 giờ,
  `kind` = `employee` / `extra:new_worker` / `extra:guest`) nằm nguyên ở
  `modules/pickup/temporary-card.service`. Ở đây chỉ đổi snake_case và **cắt cột
  nội bộ** (`assigned_by` là id tài khoản web, `employee_id`, `id`).
- `GET/POST /api/zma/staff/temp-card` (mới) — GET `?q=` tra nhân viên,
  POST cấp thẻ (`mode: "employee" | "extra"`). `TemporaryCardError` → **400 kèm
  `error`** (kết quả nghiệp vụ, không phải sự cố hệ thống).

#### ZMA (`goeat-zma`)

- `src/api/types.ts` — `StaffAccess.canTempCard`; `TempCard`,
  `TempCardIssueInput`, `TempCardIssueResult`.
- `src/api/temp-card.ts` (mới) — ô tra cứu nhân viên đi **đường riêng**
  `/temp-card?q=`, không dùng `searchStaffEmployees`: người trực quầy thường chỉ
  có `temp-card-issue:view`, gọi đường nhân sự sẽ ăn 403 dù đủ quyền làm việc này.
- `src/api/mock/temp-card.mock.ts` (mới) — kho 12 thẻ `TC-0001…TC-0012` giữ trong
  localStorage, **có hậu quả thật**: cấp xong mà cấp lại ngay thì bị từ chối đúng
  câu của server. Mock cấp được vô hạn thì lỗi chỉ lộ ra ở nhà máy.
- `src/pages/admin/temp-card.tsx` (mới) — hai chế độ tách hẳn: **Nhân viên quên
  thẻ** (tra người → quét/nhập mã thẻ → cấp, xong thì tự bỏ chọn người để không
  cấp nhầm thẻ thứ hai) và **Suất phát sinh** (CN mới / khách, ghi chú + bộ phận,
  quét từng thẻ *hoặc* lấy nhanh N thẻ trong kho — có mã quét thì ô số lượng tự
  tắt). Hạn thẻ **do server trả về**, màn hình không tự cộng giờ.
- `src/components/admin/employee-picker.tsx` — thêm prop `search` để đổi **đường**
  tra cứu (không đổi kết quả).
- `src/components/staff-guard.tsx`, `src/api/mock/ordering.mock.ts` — nhãn quyền
  và cờ mock.

### Kiểm chứng (mock, Playwright, `localhost:2999`)

`npx tsc --noEmit` sạch ở cả hai repo, `eslint` sạch ở BFF, 0 lỗi console.

- `/profile` hiện nhóm "Việc được giao" 7 dòng, dock nhân viên vẫn ở dưới; `/admin`
  chuyển hướng về `/profile`; `/admin/scan` có nút quay lại, không còn dock.
- Cấp cho NV: chọn Trần Thị Bích → `TC-0003` → "Đã cấp thẻ tạm TC-0003",
  hết hạn **12:35** (đồng hồ 11:35 + 1 giờ), màn tự về ô tra cứu.
- Khách / đoàn, số lượng 3 → cấp `TC-0001`, `TC-0002`, **`TC-0004`** — tự bỏ qua
  `TC-0003` vì đang kích hoạt, đúng thứ tự kho.
- Cấp `TC-0001` (đang kích hoạt) cho người khác → bị từ chối, danh sách "Thẻ đã
  cấp" không tăng.

---

## §12.10 — Làm lại THIẾT KẾ nhóm màn quầy / bếp / nhân sự (2026-09-09)

Người dùng: *"Cái thiết kế của bạn đang khá là xấu và không logic đấy — có skill
nào tham khảo để cải thiện phong cách thiết kế này không?"* và *"Việc được giao
là cái gì? tại sao có chức năng này nữa?"*

Đã cài plugin chính thức `frontend-design@claude-plugins-official` và làm theo
quy trình hai lượt của skill (lập bảng token → soi lại xem có rơi vào mặc định
không → dựng → tự phê bằng ảnh chụp). Ghi chép thiết kế: `docs/design-notes-staff.md`.

### 12.10.1 — "Việc được giao" là nhãn BỊA, đã bỏ

Không phải chức năng, chỉ là tiêu đề nhóm cho 7 màn có sẵn. Nó gợi ý một hộp thư
công việc mà app không có. Thay bằng hai nhóm theo VAI THẬT:

| Nhóm | Quyền |
|---|---|
| **Quầy cơm** | `canScan` · `canTempCard` · `canManual` · `canKitchen` |
| **Nhân sự** | `canProxy` · `canRegView` · `canReport` |

`src/lib/staff-menu.ts` thêm trường `group` + `staffGroupsFor()`; nhóm rỗng bị bỏ
hẳn nên người chỉ có một vai chỉ thấy một nhóm.

### 12.10.2 — Bảng lỗi (soi theo danh sách "dấu hiệu AI sinh" của skill)

| Dấu hiệu | Chỗ mắc | Đã sửa |
|---|---|---|
| Nhãn IN HOA giãn chữ | `VIỆC ĐƯỢC GIAO` · `TÀI KHOẢN` · `KHÁC` · eyebrow `CẤP THẺ TẠM CHO` trong `TargetBanner` | chữ thường, cỡ đọc được |
| Chuỗi meta nối bằng dấu chấm giữa | `SP04821 · Công nhân vận hành`, `mã · bộ phận` ở picker / proxy / registrations / scan / manual | tách bằng khoảng trắng, hoặc bỏ hẳn vế thừa |
| Bộ "thẻ SaaS" | 7 dòng y hệt nhau, cùng bo góc, cùng một bóng đổ | 1 khối đậm + lưới ô nét mảnh |
| Nhãn thừa trên nội dung | mô tả 2 dòng dưới MỌI dòng menu | chỉ còn 2 dòng thật khó đoán (`Phát ngoại lệ`, `Sửa đăng ký`) |
| Cấu trúc không mang tin | icon cùng màu, kích thước bằng nhau | kích thước = nhịp dùng; đồng hồ ca đứng cạnh nhóm Quầy |
| Chế độ trong màn | nút gạt `Nhân viên quên thẻ / Suất phát sinh` | bỏ; mở thẳng vào ô tra cứu, đường phát sinh là MỘT dòng ở dưới |
| Màu không có lý do | chip `--gold-bright` giữa app xanh rừng | về trục xanh (`--fd-wd-slot` + viền đậm) |

### 12.10.3 — Nguyên tắc mới (kiểm được bằng ảnh chụp)

1. **Một màn, một chỗ đậm.** Đúng một khối nền đặc + bóng đổ. Vì thế
   `TargetBanner` đổi sang nền NHẠT: nó là bối cảnh, không phải nút bấm — để nền
   xanh đặc thì nó chồng lên nút Quét ngay dưới thành một mảng xanh.
2. **Kích thước = nhịp dùng.** Việc đầu của nhóm đầu tiên là khối lớn; còn lại là
   ô 2 cột; ô LẺ cuối trải ngang cho hết chỗ trống.
3. Không IN HOA, không dấu chấm giữa trong chuỗi meta, không "CHỮ — mảnh vụn".

### 12.10.4 — File đụng tới

- **Mới:** `src/lib/serving-now.ts` (`servingNow` — ca đang phát / ca kế tiếp,
  dùng lại `shift-window.ts`, không tự cộng phút), `docs/design-notes-staff.md`.
- **Sửa:** `src/lib/staff-menu.ts` (nhóm + `hint` thay `desc`),
  `src/pages/profile/index.tsx` (viết lại phần việc + phần hồ sơ),
  `src/components/admin/employee-picker.tsx` (`bare`, bỏ eyebrow IN HOA, banner
  nền nhạt), `src/pages/admin/temp-card.tsx` (bỏ nút gạt, bỏ vàng),
  `src/pages/admin/{proxy,registrations,scan,manual}.tsx` (chuỗi meta).

### 12.10.5 — Đã kiểm bằng trình duyệt (đồng hồ 11:35, 2026-09-09)

- `/profile`: một khối xanh duy nhất (Quét thẻ), nhóm Quầy cơm kèm `Ca 1 đang phát`,
  nhóm Nhân sự, rồi danh sách tài khoản im lặng.
- `/admin/temp-card`: mở thẳng vào "Ai cần thẻ?"; chọn người → banner nhạt + khối
  quét; cấp `TC-0003` → dòng tổng kết `TC-0003 · Nhân viên · hết hạn 12:35`, đầu màn
  đổi thành "Phiên này đã cấp 1 thẻ"; đường phát sinh mở ra như bước tiếp, không còn vàng.
- `/admin/proxy`: banner nhạt không còn tranh chỗ với thẻ ngày.
- `npx tsc --noEmit` sạch.

### 12.10.6 — Ba màn còn lại: bếp, phát ngoại lệ, báo cáo

Ba màn này lúc đầu mới sửa chuỗi meta. Nay làm lại bố cục theo đúng ba nguyên tắc
ở 12.10.3:

| Màn | Trước | Sau |
|---|---|---|
| `/admin/kitchen` | ba ca = ba thẻ y hệt, ca đang phát chìm giữa hai ca chưa tới; số lớn là `registered` | `LeadShift` (ca đang mở, khối đặc duy nhất) + `QuietShift` (chỉ nét và mực). Số lớn đổi theo câu hỏi thật: đang phát ⇒ **suất chưa nhận**, chưa tới giờ ⇒ **suất cần nấu**. Tổng cả ngày rời tiêu đề, xuống chân trang (mỗi số in một lần) |
| `/admin/manual` | cặp chip "Nhân viên / Suất phát sinh" ở đầu màn = dựng lại đúng cái "chế độ" vừa bỏ | mở thẳng vào "Ai nhận suất?" dùng `EmployeePicker` (thêm `scan`, `placeholder`); đường phát sinh là MỘT dòng nét đứt ở dưới. Chip chọn đổi sang nền nhạt, nút "Phát suất ngoại lệ" là chỗ đặc duy nhất |
| `/admin/report` | bốn số xếp lưới bốn ô bằng nhau nên phép tính biến mất; ba tông vàng cảnh báo cho số bình thường | dạng SỔ: mỗi số một dòng, vạch kẻ đúng chỗ phép tính khép lại (`Dự trù − Loại trừ = Thực nấu = Đã phát + Chưa nhận`). Bỏ hết tông vàng khỏi dòng thường; ca chưa mở quầy viết `92 suất` chứ không `0/92` |

Thẻ kết quả của `/admin/scan` và `/admin/manual` gộp thành
`src/components/admin/dispense-result.tsx` (`LatestResult` + `ResultLog`) — hết
trùng mã, hết biến thể `--gold-bright`, và lịch sử hiện dạng **dòng sổ**
(`giờ · tên · kết quả`) đúng cách người đứng quầy dò lại.

### 12.10.7 — BA TRỤC MÀU (trả lời "đơn điệu một màu xanh")

Bản trên tô mọi thứ về xanh thương hiệu + đen trên trắng. Sai: `src/css/tokens.css`
đã khai sẵn ba trục, và trang đặt món (bản đã duyệt) đang dùng cả ba. Màu ở đây để
**mang tin**, không phải trang trí — mỗi trục trả lời một câu hỏi khác nhau:

| Trục | Token | Nghĩa |
|---|---|---|
| **Loại món** | `--fd-cat-{man,nuoc,chay,sub,khac}-ink` | mặn đỏ gạch · canh hổ phách · chay xanh · thay thế xám |
| **Loại ngày** | `--fd-cal-ink` · `--fd-sat-ink` · `--fd-sun-ink` | ngày thường · thứ Bảy · Chủ nhật |
| **Nhấn** | `--fd-accent-{ink,tint,solid}` | "hôm nay / đang diễn ra" |

Đã kéo vào:

- `src/lib/dish-tone.ts` (mới) — cầu nối sang `dishLook()` của trang đặt món **mà
  không sửa `src/components/ordering/*`**. Bảng bếp không trả về tên cột thực đơn
  nên món chay ở đó rơi hết vào nhóm "khác"; thêm hai biểu thức tên món
  (`VEG` / `MEAT`) là đủ cho suất ăn nhà máy — có thịt cá thì vẫn là món mặn dù
  kèm rau ("gà rô ti + bắp cải xào").
- Hình món mang mực loại món ở: dòng món bảng bếp, dòng món báo cáo, chip chọn
  món màn phát ngoại lệ.
- Dải ngày `/admin/report`: số ngày lấy mực theo loại ngày; ô hôm nay dùng
  `--fd-accent-tint` + viền `--fd-accent-solid`.
- `/profile`: nhãn `Ca 1 đang phát` đổi sang trục NHẤN (viên nền cam nhạt) — nó là
  TRẠNG THÁI, để xanh thì lẫn vào nút bấm ngay dưới. Ô việc nhóm **Nhân sự** lấy
  mực lịch (`--fd-cal-ink`) vì cả ba màn đó đều bắt đầu bằng "chọn ngày"; nhóm
  Quầy cơm giữ xanh phục vụ. Nhìn màu là biết mình đi về đâu.

`--gold-*` vẫn KHÔNG dùng ở nhóm màn này; cần hổ phách nghĩa cảnh báo thì dùng
`--warning-*`.

### 12.10.8 — Đã kiểm lại bằng trình duyệt (đồng hồ 11:35, 2026-09-09)

- `/admin/kitchen`: `Ca 1` khối xanh đặc `159 suất chưa nhận`; `Ca 2` / `Ca 3` chỉ
  nét; bốn dòng món ba màu (mặn đỏ gạch ×3, chay xanh ×1 — "Đậu hũ sốt nấm + su su
  luộc" đúng màu chay sau khi thêm `VEG`).
- `/admin/report`: dải ngày CN đỏ / ngày thường nâu đất; sổ ngày khép ở
  `Bếp phải ra 340`; chi tiết món đủ bốn mực (Mặn 1, Mặn 2, Món thay thế xám, Chay xanh).
- `/admin/manual`: chọn `Lê Minh Tuấn` → banner nhạt, 4 chip món đủ bốn mực, nút phát
  là khối đặc duy nhất.
- `/admin/scan`: khối quét xanh + kết quả xanh nhạt + sổ lượt trước (`Không tìm thấy NV`
  đỏ, `Đã nhận rồi` hổ phách) — ba tông kết quả đọc được ngay.
- `/profile`: viên `Ca 1 đang phát` cam, ô Nhân sự mực nâu đất.
- `npx tsc --noEmit` sạch.

### 12.10.9 — "Vẫn một màu, chưa ấn tượng": lỗi ở LUẬT, không ở màu

Người dùng xem xong 12.10.7 vẫn nói *"thiết kế nó vẫn 1 màu chưa có gì ấn tượng
lắm"*. Đúng, và nguyên nhân là chính cái luật tôi đặt ra ở 12.10.3: **"một màn
một chỗ đậm" + bỏ bộ thẻ ⇒ mọi màn thành MỘT KHỐI XANH TRÊN NỀN TRẮNG.** Thêm
mực loại món vào hình 17px không cứu được, vì 90% diện tích màn vẫn là trắng và
đen.

Soi lại trang đặt món (bản đã duyệt) thì thấy nó giàu KHÔNG phải nhờ nền, mà nhờ
**vật thể có chất liệu**:

| Thứ | Trang đặt món làm gì | Nhóm màn quầy/bếp trước đó |
|---|---|---|
| Hoa văn chấm | `.ge-daycard::before`, chấm xanh 28% ở góc thẻ | không có |
| Tờ lịch | `.ge-daynum` — gáy đất nung + hai lỗ đóng gáy | số ngày trần |
| Dải ngày | tô CẢ VIÊN theo loại ngày (nền, viền, nhãn, số) | chỉ tô con số |
| Trạng thái đã chọn | khung nét đứt + nền pha `--gold` 12% | xanh, hoặc không có |
| Hình món | lồng trong vòng tròn pha 14% mực loại món | hình trần trên nền trắng |
| Thẻ | vẫn dùng thẻ, viền xanh + bóng ngả xanh | đã dọn sạch thẻ |

Tức là tôi dọn "bộ thẻ SaaS" quá tay: cái sai của bản cũ là **bảy thẻ giống hệt
nhau**, không phải bản thân cái thẻ. Sửa lại:

- **`src/css/app.scss`** thêm class MỚI `.ge-dots` (chép kết cấu chấm của
  `.ge-daycard::before`, điều khiển bằng `--ge-dot-ink` / `--ge-dot-alpha`).
  `.ge-daycard` giữ nguyên — trang đặt món không đụng tới.
- **`src/lib/day-look.ts`** (mới) — `dayLook(ymd, on, today)` trả về nguyên bộ
  nền/viền/nhãn/số/bóng của dải ngày trang đặt món. Dải ngày `/admin/report` dùng
  hàm này nên T7 ra kem hổ phách, CN ra hồng ruby, hôm nay ra cam đất nung — thay
  vì bảy ô trắng chỉ khác nhau màu chữ số.
- **`src/components/admin/day-leaf.tsx`** (mới) — tờ lịch `.ge-daynum` + thứ, đặt
  đầu `/admin/kitchen` và `/admin/report`. Hai màn nhiều số nhất cần một mốc ấm
  để mắt bám; tiêu đề màn thôi lặp lại ngày (mỗi thứ chỉ nói một lần).
- Khối đậm của bốn màn (`kitchen` ca chính, `report` số ngày, `scan` khối quét,
  `profile` việc chính) mang `.ge-dots` ⇒ là một MẶT, không phải mảng màu phẳng.
- Thẻ quay lại nhưng KHÔNG giống nhau: ca của `report`/`kitchen` là thẻ trắng
  viền + bóng + chấm, còn sổ của ca đang phát thì DÍNH LIỀN dưới khối xanh
  (`marginTop: -14`, bo góc dưới) — cùng một phép tính thì không tách hai mặt.
- Món phát đủ ở bảng bếp dùng viên `--gold` pha 14% (ngôn ngữ "đã chọn" của trang
  đặt món) thay cho chữ xanh — đây là chỗ duy nhất `--gold` được dùng lại ở nhóm
  màn này, và nó có nghĩa: **xong**.
- Hình trong ô việc `/profile` lồng trong ô bo 34px pha 13% mực của nhóm ⇒ nhóm
  Quầy ra bạc hà, nhóm Nhân sự ra đất nung, nhìn phát biết ngay hai họ việc.

Đã kiểm bằng trình duyệt (11:35, 2026-09-09): `/admin/report`, `/admin/kitchen`,
`/profile`, `/admin/scan` — và `/weekly` không đổi một điểm ảnh nào (`.ge-dots`
là class mới, trang đó đếm được 0 phần tử dùng nó; `.ge-daycard` vẫn trắng, viền
`#8FD3B0`, bóng xanh y như cũ). `npx tsc --noEmit` sạch.

**Chưa làm:** trang chủ vẫn chưa có khối việc (đề xuất cũ, chưa được duyệt).
