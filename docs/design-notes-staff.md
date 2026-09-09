# Ghi chép thiết kế — nhóm màn QUẦY / BẾP / NHÂN SỰ

Áp dụng skill `frontend-design` (claude-plugins-official), 2026-09-09.
Ghi lại để lần sau không lặp lại cùng một lối mòn.

## Đề bài tự xác định

- **Chủ thể:** quầy phát cơm của nhà ăn công nghiệp Spartronics, giờ cao điểm.
- **Người dùng:** người trực quầy / bếp / nhân sự nhà máy — ĐỨNG, một tay cầm
  thẻ nhựa hoặc máy quét, ồn, vội; cả ca trưa dồn vào ~15 phút.
- **Việc chính của màn:** chọn việc → làm xong → thấy bằng chứng đã xong.
  Phải ĐỌC là đã hỏng.

## Bảng lỗi của bản cũ (soi theo danh sách "dấu hiệu AI sinh" của skill)

| Dấu hiệu | Chỗ mắc |
|---|---|
| Nhãn IN HOA giãn chữ | `VIỆC ĐƯỢC GIAO`, `TÀI KHOẢN`, `KHÁC`, `CẤP THẺ TẠM CHO` |
| Chuỗi nối bằng dấu chấm giữa | `SP04821 · Công nhân vận hành` |
| Bộ "thẻ SaaS" | 7 dòng y hệt nhau, cùng bo góc, cùng một bóng đổ mềm |
| Nhãn thừa phía trên nội dung | mô tả 2 dòng dưới MỌI dòng menu |
| Cấu trúc không mang tin | icon tô cùng một màu, kích thước bằng nhau ⇒ việc dùng 200 lần/ngày trông y như việc dùng 1 lần/tuần |
| Chế độ trong màn | nút gạt "Nhân viên quên thẻ / Suất phát sinh" — vừa bỏ chế độ ở cấp app lại dựng lại ở cấp màn |
| Màu không có lý do | chip vàng `--gold-bright` giữa một app xanh rừng |

## Bảng token (giữ nguyên bảng màu đã duyệt, chỉ GIAO VIỆC cho từng màu)

Đề bài đã ghim bảng màu (trang đặt món đã được duyệt) nên không đổi màu — đổi
**thứ bậc**.

- `#14724c` xanh rừng — CHỈ tô cho ĐÚNG MỘT khối trên mỗi màn.
- `#f1f6f0` / `#dceade` — máng và đường kẻ, mọi thứ còn lại là nét + mực.
- `#1b1814` mực chính · `#6b6457` mực phụ.
- `#e2560c` cam đất — chỉ dành cho việc ngoài lệ / sắp hết hạn.
- Bỏ hẳn `--gold-bright` khỏi nhóm màn này.

Chữ: giữ Plus Jakarta Sans (hiển thị) + Inter (thân). Đổi THANG chữ, vì bản cũ
mọi thứ đều 12–14.5px nên không gì nổi lên: việc chính 17/800 · việc phụ 14.5/700
· mã thẻ và số 20–28 tabular · mô tả chỉ còn ở 2 dòng thật sự khó đoán.

## Nguyên tắc (kiểm được bằng ảnh chụp)

1. **Một màn, một chỗ đậm.** Đúng một khối có nền đặc + bóng đổ. Bóng đổ trở
   thành thông tin thứ bậc, không phải lớp trang trí rắc đều.
2. **Kích thước = thời gian, không phải tầm quan trọng chung chung.** Việc đang
   trong khung giờ phát thì to; ngoài giờ thì thu về ô nhỏ.
3. **Nhóm theo VAI THẬT:** "Quầy cơm" và "Nhân sự" — không có nhãn bịa như
   "Việc được giao".
4. **Mô tả phải kiếm được chỗ đứng.** Tên việc tự nói được thì không viết thêm.
5. Không IN HOA, không dấu chấm giữa, không "CHỮ — mảnh vụn".

## Bố cục

    Quầy cơm                    Ca trưa · đang phát   ← đồng hồ ca, tin thật
    ┌──────────────────────────────────────┐
    │ ▣  Quét thẻ phát suất              › │  nền xanh đặc, có bóng — DUY NHẤT
    └──────────────────────────────────────┘
    ┌─────────────────┐ ┌─────────────────┐
    │ Phát ngoại lệ   │ │ Cấp thẻ tạm     │  nét + mực, không bóng
    └─────────────────┘ └─────────────────┘

Màn Cấp thẻ tạm: bỏ nút gạt, mở thẳng vào ô tra cứu người (việc chiếm ~95%);
đường "công nhân mới / khách" là một bước sau, không phải một chế độ song song.

## Màu: ba trục, mỗi trục trả lời một câu hỏi

Bản đầu tô mọi thứ về xanh thương hiệu + đen trên trắng, nhìn ra một màn đơn điệu.
`src/css/tokens.css` đã khai sẵn ba trục và trang đặt món (bản đã duyệt) dùng cả
ba — nhóm màn quầy/bếp chỉ việc dùng lại, KHÔNG đặt màu mới.

| Trục | Token | Trả lời câu hỏi |
|---|---|---|
| Loại món | `--fd-cat-{man,nuoc,chay,sub,khac}-ink` | "món này là món gì?" |
| Loại ngày | `--fd-cal-ink` · `--fd-sat-ink` · `--fd-sun-ink` | "ngày nào?" |
| Nhấn | `--fd-accent-{ink,tint,solid}` | "cái gì đang diễn ra ngay bây giờ?" |

Luật: **màu chỉ được đặt khi nó mang tin.** Bốn chấm tròn xanh y hệt nhau cạnh
bốn tên món không nói gì; bốn hình mang mực loại món thì đọc được từ xa lúc đứng
quầy. Ngược lại, đừng bịa trục thứ tư cho những chỗ không có tin để mang
(`/admin/temp-card` bước tra cứu không có món, không có ngày ⇒ để trắng).

`src/lib/dish-tone.ts` là cầu nối sang `dishLook()` của trang đặt món — trang đó
đã duyệt nên KHÔNG sửa `src/components/ordering/*`; mọi bù đắp cho dữ liệu thiếu
(bảng bếp không trả tên cột thực đơn) nằm ở phía cầu nối.

Hổ phách nghĩa cảnh báo dùng `--warning-*`. `--gold-*` không dùng ở nhóm màn này.

## Sửa lại luật "một chỗ đậm": đậm ≠ phẳng

Luật "một màn một chỗ đậm" cộng với việc dọn sạch thẻ đã đẻ ra đúng một thứ: MỘT
KHỐI XANH TRÊN NỀN TRẮNG, màn nào cũng vậy. Cái sai của bản cũ là **bảy thẻ giống
hệt nhau**, không phải bản thân cái thẻ — dọn cả thẻ đi là dọn nhầm.

Trang đặt món (đã duyệt) giàu nhờ VẬT THỂ CÓ CHẤT LIỆU, không nhờ nền:

- hoa văn chấm ở góc mặt (`.ge-dots`, chép từ `.ge-daycard::before`);
- tờ lịch gáy đất nung `.ge-daynum` (`<DayLeaf>`), không phải con số trần;
- dải ngày tô CẢ VIÊN theo loại ngày (`dayLook()`), không chỉ tô con số;
- hình lồng trong nền pha loãng chính mực của nó (12–14%), không phải hình trần;
- `--gold` pha 14% cho trạng thái **đã xong / đã chọn**.

Thẻ được phép dùng, miễn là chúng KHÁC NHAU theo nhịp dùng: ca đang phát dính
liền dưới khối xanh thành một vật thể; ca chưa tới là thẻ trắng viền mảnh.

Class `.ge-daycard`, `.ge-daynum` và mọi thứ trong `src/components/ordering/*` là
của trang đã duyệt: **dùng lại được, sửa thì không.**
