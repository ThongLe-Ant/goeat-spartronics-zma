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
2. Trên Zalo Developers: app `2600294893392654695` bật quyền SĐT (`scope.userPhonenumber`), lấy App Secret.
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
