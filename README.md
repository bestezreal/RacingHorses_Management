# STRIDE — Hướng dẫn sử dụng bản giao diện RTMS

STRIDE là bản mẫu giao diện tương tác cho **Racehorse Training & Management System**, phục vụ minh họa SRS của môn SWR302. Giao diện sử dụng tiếng Việt và có đủ **5 luồng nghiệp vụ, 5 vai trò người dùng**.

Đây là bản frontend chạy trên trình duyệt. Các biểu mẫu và quy tắc nghiệp vụ được mô phỏng bằng dữ liệu tại máy của bạn; chưa có máy chủ, cơ sở dữ liệu dùng chung hoặc xác thực người dùng thật.

## 1. Mở bản mẫu

1. Giải nén toàn bộ gói ZIP vào một thư mục.
2. Mở tệp **index.html** bằng Chrome hoặc Edge. Giữ nguyên các thư mục **assets** và **js** nằm cạnh tệp này.
3. Bắt đầu từ trang **Tổng quan**. Bạn không cần cài thư viện, chạy npm hoặc tạo tài khoản.

Gói ZIP đã chứa các tệp cần thiết để dùng ngoại tuyến. Nếu trình duyệt trên máy hạn chế việc mở tệp trực tiếp, bạn có thể dùng một máy chủ tĩnh có sẵn. Ví dụ, nếu máy đã có Python, mở cửa sổ dòng lệnh tại thư mục vừa giải nén và chạy:

```text
python -m http.server 8000
```

Sau đó mở **http://localhost:8000**. Đây chỉ là cách mở tùy chọn; không cần cài thêm gói Python.

Bản trên **Sites** mặc định giới hạn truy cập cho chủ sở hữu. Có đường dẫn chưa đồng nghĩa với người khác được phép truy cập. Gói ZIP có thể được mở riêng tại máy và không phụ thuộc quyền truy cập Sites.

## 2. Cách điều khiển demo

- **Chuyển vai trò:** dùng danh sách vai trò dưới tên người dùng ở góc trên bên phải. Các nút thao tác thay đổi theo vai trò.
- **Chọn chủ ngựa:** khi đang ở vai **Chủ sở hữu**, dùng danh sách chủ ngựa ở thanh trên để so sánh hai phạm vi sở hữu.
- **Điều hướng:** chọn chức năng tại thanh bên trái. Nút **Kịch bản demo** gần cuối thanh bên gợi ý cách thử năm luồng.
- **Thông báo:** biểu tượng chuông trên thanh trên mở thông báo liên quan đến vai trò và phạm vi hiện tại.
- **Khôi phục:** biểu tượng mũi tên xoay ở cuối thanh bên có tên **Khôi phục dữ liệu demo**. Xác nhận để xóa các thay đổi của bản mẫu và trở lại dữ liệu ban đầu. Tệp tài liệu trên máy không bị ảnh hưởng.

Ngày nghiệp vụ của demo được cố định là **26/10/2026** để các kịch bản có thể thử lại. Khi thêm lịch hoặc giải, hãy chọn ngày phù hợp với mốc này.

### Năm vai trò

| Vai trò | Các việc nên thử |
|---|---|
| **Quản lý CLB** | Hồ sơ/sở hữu ngựa, tài khoản, danh mục, xác nhận thành tích, chi phí/tiền thưởng, báo cáo và nhật ký. |
| **HLV trưởng** | Giáo án, lịch tập, mô phỏng chỉ số, đánh giá, khẩu phần nháp, đăng ký giải và kết quả. |
| **Bác sĩ thú y** | Hồ sơ khám, vùng chấn thương, khóa/gỡ khóa bài nặng, lịch y tế và duyệt khẩu phần. |
| **Nhân viên chăm sóc** | Xem việc được giao, hoàn thành chăm sóc, ghi lượng sử dụng, báo sự cố và đề xuất vật tư. |
| **Chủ sở hữu** | Xem hồ sơ, sức khỏe, huấn luyện, thành tích và báo cáo của ngựa thuộc sở hữu. |

Chuyển vai là tiện ích trình diễn. Việc ẩn nút/kiểm tra quyền tại frontend không thay thế bảo mật máy chủ của một sản phẩm thực tế.

## 3. Dữ liệu mẫu để bắt đầu

| Ngựa | Tình huống ban đầu |
|---|---|
| **Aurora — EQ-001** | Đủ điều kiện sức khỏe; có lịch tập và kết quả October Classic đang chờ quản lý xác nhận. Thuộc chủ Nguyễn Minh Anh. |
| **Golden Arrow — EQ-002** | Cần theo dõi; khẩu phần bữa sáng đang chờ bác sĩ duyệt; có báo cáo ăn chậm. Thuộc chủ Trần Gia Bảo. |
| **Silver Storm — EQ-003** | Chấn thương; có khóa bài tập nặng và buổi tập chờ điều chỉnh. Thuộc chủ Nguyễn Minh Anh. |
| **Midnight — EQ-004** | Có thành tích đã xác nhận và tiền thưởng đã xác nhận. Phù hợp để thử sửa thành tích rồi đối chiếu lại khoản thưởng. Thuộc chủ Trần Gia Bảo. |
| **Desert Rose — EQ-005** | Có buổi khởi động/phục hồi và hồ sơ đăng ký giải sắp tới. Thuộc chủ Nguyễn Minh Anh. |
| **Thunderbolt — EQ-006** | Chưa có hoạt động đang mở trong dữ liệu ban đầu; phù hợp để thử ngừng quản lý thành công. Thuộc chủ Trần Gia Bảo. |

Tất cả tên CLB, giải, tài khoản, số đo, chứng từ và số tiền là dữ liệu minh họa.

## 4. Kịch bản thử đủ năm luồng

Có thể thực hiện theo thứ tự dưới đây trong khoảng 10–15 phút. Dùng **Khôi phục dữ liệu demo** nếu muốn bắt đầu lại từ đúng trạng thái ban đầu.

### Luồng 1 — Hồ sơ và lý lịch ngựa

1. Chọn vai **Quản lý CLB**, mở **Hồ sơ ngựa**.
2. Mở hồ sơ **Aurora**, xem lý lịch, chủ sở hữu, dòng dõi và lịch sử. Chọn **Cập nhật hồ sơ**, sửa ghi chú hoặc vị trí chuồng và lưu.
3. Thử **Thêm ngựa**. Nếu nhập mã **EQ-001**, hệ thống phải báo mã đã tồn tại. Đổi sang mã mới để tạo thành công.
4. Mở **Silver Storm** và thử **Ngừng quản lý**: các hoạt động chưa kết thúc sẽ được liệt kê để xử lý.
5. Mở **Thunderbolt** và thử **Ngừng quản lý**: với dữ liệu ban đầu, có thể thực hiện thành công. Trong bộ lọc hồ sơ, chọn hiển thị cả ngựa ngừng quản lý để xem lại lịch sử.
6. Chuyển sang **Chủ sở hữu**, đổi giữa hai chủ ở thanh trên và kiểm tra danh sách ngựa thay đổi theo sở hữu.

### Luồng 2 — Lập và thực hiện giáo án huấn luyện

1. Chọn **HLV trưởng**, mở **Huấn luyện**.
2. Chọn **Lập giáo án**, sử dụng **Aurora**, nhập giai đoạn, cự ly, khối lượng và mặt sân.
3. Chọn **Xếp lịch tập** hoặc **Xếp buổi tập** trong thẻ giáo án. Chọn ngày/giờ không giao lịch hiện có của cả ngựa và nhân viên. Hai buổi tiếp giáp thời gian được chấp nhận.
4. Thử xếp bài **Nặng** cho **Silver Storm**: hệ thống chặn do khóa y tế. Thử một lịch giao với lịch hiện có để kiểm tra báo lỗi xung đột.
5. Với một buổi hợp lệ, chọn **Bắt đầu**, sau đó mở tab **Theo dõi mô phỏng**. Chọn **Phát mô phỏng**, quan sát biểu đồ và dùng **Lưu quan sát** nếu cần.
6. Chọn **Tạm dừng luồng**, chờ hơn 10 giây để thấy nhãn dữ liệu cũ. Nút **Thử cảnh báo mẫu** chỉ tạo tình huống giao diện, không dùng ngưỡng chẩn đoán thật.
7. Trở về lịch, tạm dừng/hoàn tất buổi tập và chọn **Đánh giá** để ghi nhận kết quả. Video là tùy chọn và chỉ được ghi thông tin tệp.

### Luồng 3 — Y tế và xử lý chấn thương

1. Chọn **Bác sĩ thú y**, mở **Y tế & chấn thương**.
2. Với **Silver Storm**, xem hồ sơ chấn thương và vùng được đánh dấu. Dùng **Khám & cập nhật** để ghi nhận khám hoặc cập nhật diễn biến.
3. Có thể thử **Khóa bài nặng** với một ngựa đang có lịch tập nặng, chẳng hạn **Midnight**. Nhập lý do; buổi chưa bắt đầu liên quan sẽ chuyển sang chờ điều chỉnh.
4. Chuyển sang **HLV trưởng**, mở lịch tập và kiểm tra tác động của khóa. Người dùng HLV không có quyền gỡ khóa y tế.
5. Chuyển lại **Bác sĩ thú y**, chọn **Đánh giá gỡ khóa**, nhập kết quả đánh giá và lý do.
6. Chuyển lại HLV: buổi tập đang chờ không tự chạy lại. HLV phải xem xét và điều chỉnh lịch.
7. Bác sĩ có thể mở các báo cáo sự cố để tiếp nhận, tạo hồ sơ khám và kết thúc xử lý; đồng thời theo dõi lịch y tế định kỳ.

### Luồng 4 — Chăm sóc chuồng trại và dinh dưỡng

1. Chọn **Nhân viên chăm sóc**, mở **Chăm sóc & dinh dưỡng**. Với bữa sáng **Golden Arrow**, kiểm tra việc cho ăn chưa được phép hoàn thành khi khẩu phần còn chờ duyệt.
2. Chuyển **Bác sĩ thú y**, mở danh sách khẩu phần, xem phiên bản của **Golden Arrow** và duyệt đúng phiên bản.
3. Trở lại **Nhân viên chăm sóc**, hoàn thành bữa ăn, nhập lượng thực tế và ghi chú. Công việc giữ liên kết với phiên bản khẩu phần đã sử dụng.
4. Chuyển **HLV trưởng**, điều chỉnh một khẩu phần đã duyệt để tạo phiên bản mới. Gửi bác sĩ duyệt; phiên bản mới không tự có hiệu lực chỉ vì đã lưu.
5. Dưới vai nhân viên, gửi một **báo cáo sự cố** kèm ảnh nếu có và tạo **đề xuất bổ sung vật tư**.
6. Chuyển sang bác sĩ để tiếp nhận sự cố; chuyển sang quản lý để xem và xử lý đề xuất vật tư. Bữa đã hoàn thành vẫn giữ lịch sử khẩu phần cũ.

### Luồng 5 — Thi đấu, thành tích và tiền thưởng

1. Chọn **HLV trưởng**, mở **Thi đấu & thành tích**. Trong **Lịch giải đua**, có thể thêm giải mới hoặc đăng ký **Aurora** vào giải tương lai đang có.
2. Hồ sơ mới bắt đầu ở trạng thái nháp. Vào **Hồ sơ đăng ký**, chọn **Cập nhật** để ghi nhận đã nộp và phản hồi ban tổ chức. Trạng thái **Được chấp thuận** cần căn cứ.
3. Thử đăng ký **Silver Storm** để kiểm tra chặn sức khỏe/khóa; thử đăng ký trùng một nội dung để kiểm tra chặn trùng.
4. Chọn **Quản lý CLB**, vào tab **Thành tích**. **Aurora** có kết quả đang chờ: xem bằng chứng, sau đó **Xác nhận** hoặc **Trả lại** kèm lý do.
5. Mở **Chi phí & báo cáo**. Dùng **Ghi tiền thưởng**, chọn kết quả đã xác nhận, ghi số tiền hoặc chọn rõ **không có thưởng**, thêm căn cứ và lưu nháp. Xác nhận khoản mục sau khi đối chiếu.
6. Để thử thay đổi thành tích, chuyển **HLV trưởng**, tạo bản sửa kết quả đã xác nhận của **Midnight** và gửi lại. Bản chính thức cũ vẫn được giữ trong lúc chờ.
7. Chuyển **Quản lý CLB**, xác nhận bản sửa. Kết quả cũ được thay thế và khoản thưởng liên quan chuyển sang **Chờ đối chiếu**, tạm thời không cộng vào tổng chính thức.
8. Vào **Sổ khoản mục**, đối chiếu khoản thưởng với đúng phiên bản kết quả mới, lưu và xác nhận lại. Báo cáo cập nhật khoản thưởng có hiệu lực.

## 5. Thử báo cáo và quyền truy cập

Trong **Chi phí & báo cáo**:

- Chọn khoảng ngày và phạm vi ngựa. Kỳ ban đầu là tháng 10/2026, đến ngày nghiệp vụ của demo.
- Tổng chỉ cộng các bản **đã xác nhận và đang có hiệu lực**. Khoản nháp hoặc chờ đối chiếu được thể hiện riêng.
- **Quản lý CLB** xem toàn CLB, gồm chi phí chung chưa phân bổ. **Chủ sở hữu** chỉ xem ngựa trong phạm vi sở hữu; chi phí chung chưa phân bổ không tự tính cho chủ.
- Chọn **Lập báo cáo** để tạo ghi nhận báo cáo và thông báo trong ứng dụng.
- Chọn **CSV** để xuất dữ liệu đã xác nhận theo bộ lọc hiện tại; chọn **In báo cáo** để mở bản in. Nếu trình duyệt chặn cửa sổ in, cho phép cửa sổ bật lên rồi thử lại.
- Khi thử sửa một khoản chi đã xác nhận, bản cũ vẫn có hiệu lực cho đến lúc bản sửa được xác nhận; tổng không cộng hai phiên bản cùng lúc.

Trong **Quản trị hệ thống**, quản lý có thể thử tài khoản, phạm vi quyền, danh mục và **Nhật ký thao tác**. Các thao tác của demo sẽ xuất hiện trong nhật ký.

## 6. Dữ liệu được lưu như thế nào?

- Các thay đổi được lưu trong bộ nhớ cục bộ của trình duyệt. Đóng rồi mở lại bằng cùng trình duyệt/địa chỉ thường giữ được dữ liệu.
- Trình duyệt khác, thiết bị khác hoặc bản trên Sites và bản ZIP có thể có bộ dữ liệu riêng; thay đổi không đồng bộ giữa các nơi.
- Xóa dữ liệu trình duyệt, dùng chế độ riêng tư hoặc chọn khôi phục demo có thể làm mất các thay đổi của bản mẫu.
- Ảnh nhỏ có thể được xem trước và giữ trong trình duyệt. PDF/video chủ yếu lưu tên, loại và dung lượng; chưa có dịch vụ tải tệp lên hoặc kho chứng từ thật.

## 7. Phạm vi của bản mẫu

Bản này giúp trình bày luồng màn hình, thao tác, quyền theo vai và các quy tắc quan trọng của SRS. Nó chưa phải hệ thống vận hành thực tế:

- Không có đăng nhập/mật khẩu hay bảo mật máy chủ thật.
- Không kết nối cảm biến. Biểu đồ và cảnh báo thử là dữ liệu mô phỏng, không phải hướng dẫn chẩn đoán hoặc điều trị.
- Sơ đồ vị trí chấn thương là hình minh họa tương tác; chưa phải mô hình giải phẫu 3D chuyên dụng.
- Không gửi email, SMS hoặc thông báo đẩy ra thiết bị; thông báo chỉ ở trong giao diện.
- Không chuyển tiền, thanh toán, gửi đăng ký thật cho ban tổ chức hoặc xác thực bằng chứng với bên ngoài.
- Không nên nhập hồ sơ y tế, chứng từ tài chính hoặc tài khoản thật vào bản demo.

Nếu một thao tác bị chặn, hãy kiểm tra vai trò, trạng thái ngựa, khóa y tế, phiên bản đang duyệt và điều kiện lịch trước. Có thể mở **Kịch bản demo** để quay lại hướng dẫn hoặc **Khôi phục dữ liệu demo** để thử từ đầu.
