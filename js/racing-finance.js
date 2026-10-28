(function () {
  'use strict';
  const R = window.RTMS;
  const E = value => R.utils.esc(String(value == null ? '' : value));
  const fmt = (value, currency) => R.utils.money(value, currency || 'VND');
  const date = value => value ? R.utils.date(value) : '—';
  const day = () => String(R.utils.today()).slice(0, 10);
  const offset = n => String(R.utils.addDays(n)).slice(0, 10);
  const get = () => R.getState();
  const btn = (label, action, data, variant, icon) => R.ui.btn(label, action, data || {}, variant || 'secondary', icon || '');
  const badge = status => R.ui.badge(status);
  const selected = (a, b) => String(a) === String(b) ? ' selected' : '';
  const field = (label, input, hint) => '<label class="field"><span class="label">' + label + '</span>' + input + (hint ? '<span class="small muted">' + hint + '</span>' : '') + '</label>';
  const text = (name, value, attrs) => '<input class="input" name="' + E(name) + '" value="' + E(value || '') + '" ' + (attrs || '') + '>';
  const option = (value, label, current) => '<option value="' + E(value) + '"' + selected(value, current) + '>' + E(label) + '</option>';
  const select = (name, options, attrs) => '<select class="select" name="' + E(name) + '" ' + (attrs || '') + '>' + options + '</select>';
  const area = (name, value, attrs) => '<textarea class="textarea" name="' + E(name) + '" rows="3" ' + (attrs || '') + '>' + E(value || '') + '</textarea>';
  const warn = message => { R.ui.toast(message, 'error'); return false; };
  const roles = (...values) => values.includes(R.role());
  const horseName = id => { const h = R.horse(id); return h ? h.name : 'Chi phí chung CLB'; };
  const raceById = id => get().races.find(r => r.id === id);
  const registrationById = id => get().registrations.find(r => r.id === id);
  const resultById = id => get().results.find(r => r.id === id);
  const currentResult = registrationId => get().results.find(r => r.registrationId === registrationId && r.status === 'Confirmed');
  const evidenceName = evidence => typeof evidence === 'string' ? evidence : (evidence && evidence.name) || '';
  const proofLabel = evidence => evidenceName(evidence) ? '<span class="small muted">' + R.ui.icon('file', 14) + ' ' + E(evidenceName(evidence)) + '</span>' : '<span class="small muted">Chưa có bằng chứng</span>';
  const visibleHorses = () => R.visibleHorses();
  const horseVisible = id => !!id && R.hasHorse(id);
  const horseOptions = (current, allLabel) => (allLabel ? option('', allLabel, current) : '') + visibleHorses().map(h => option(h.id, h.name + ' · ' + h.code, current)).join('');
  const notification = (s, title, body, view, horseId, recipientRoles) => s.notifications.unshift({ id: R.utils.uid('notice'), title, body, view, horseId: horseId || null, roles: recipientRoles || ['manager'], read: false, createdAt: R.utils.now() });

  function ensureDemo() {
    const s = get();
    ['races', 'registrations', 'results', 'expenses', 'prizes', 'notifications'].forEach(key => { if (!Array.isArray(s[key])) s[key] = []; });
  }

  function eventWindow(race) { return { from: race.start || '00:00', to: race.end || '23:59' }; }
  function overlaps(a, b, c, d) { return a < d && c < b; }
  function eligibility(horseId, raceId, excludeId) {
    const h = R.horse(horseId), race = raceById(raceId);
    if (!h || !race || !horseVisible(horseId)) return 'Không tìm thấy ngựa hoặc giải trong phạm vi được phép.';
    if (!h.active) return 'Ngựa đã ngừng quản lý, không thể đăng ký mới.';
    if (h.health !== 'Eligible' || h.ready === false) return 'Ngựa chưa ở trạng thái đủ điều kiện và sẵn sàng thi đấu.';
    if (R.locked(horseId)) return 'Ngựa đang có khóa huấn luyện. Cần bác sĩ đánh giá trước khi đăng ký.';
    const win = eventWindow(race);
    const duplicate = get().registrations.find(reg => reg.id !== excludeId && reg.horseId === horseId && reg.raceId === raceId && !['Cancelled', 'Rejected'].includes(reg.status));
    if (duplicate) return 'Ngựa đã có hồ sơ đăng ký cho nội dung thi đấu này.';
    const conflict = get().registrations.find(reg => {
      if (reg.id === excludeId || reg.horseId !== horseId || ['Cancelled', 'Rejected'].includes(reg.status)) return false;
      const other = raceById(reg.raceId); if (!other || other.date !== race.date) return false;
      const w = eventWindow(other); return overlaps(win.from, win.to, w.from, w.to);
    });
    if (conflict) return 'Ngựa có đăng ký giải khác giao thời gian.';
    const session = (get().sessions || []).find(item => item.horseId === horseId && item.date === race.date && !['Cancelled', 'Completed'].includes(item.status) && overlaps(win.from, win.to, item.start, item.end));
    if (session) return 'Giờ thi đấu giao với buổi tập “' + session.title + '”. Hãy điều chỉnh lịch trước.';
    return '';
  }

  function eventCard(race) {
    const registrations = get().registrations.filter(reg => reg.raceId === race.id && horseVisible(reg.horseId));
    const past = race.date < day();
    return '<article class="card"><div class="card-body"><div class="row" style="justify-content:space-between"><span class="pill">' + R.ui.icon('trophy', 16) + ' ' + E(race.event) + '</span><span class="small muted">' + (past ? 'Đã diễn ra' : 'Sắp diễn ra') + '</span></div><h3 style="margin:22px 0 8px">' + E(race.name) + '</h3><p class="muted small">' + R.ui.icon('calendar', 15) + ' ' + date(race.date) + ' · ' + E(race.start || 'Theo điều lệ') + '</p><p class="muted small">' + E(race.location) + ' · ' + E(race.distance) + ' m</p><p class="small" style="min-height:42px">' + E(race.conditions) + '</p><div class="divider"></div><div class="row" style="justify-content:space-between"><span class="muted small">' + registrations.length + ' hồ sơ trong phạm vi của bạn</span><div class="row">' + btn('Chi tiết', 'race:detail', { id: race.id }, 'ghost', 'eye') + (roles('trainer') && !past ? btn('Đăng ký', 'race:register', { id: race.id }, 'primary', 'plus') : '') + '</div></div></div></article>';
  }

  function registrationRows() {
    const rows = get().registrations.filter(reg => horseVisible(reg.horseId));
    if (!rows.length) return R.ui.empty('trophy', 'Chưa có hồ sơ đăng ký', 'Hồ sơ thi đấu sẽ xuất hiện tại đây.');
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Ngựa / giải</th><th>Thời gian</th><th>Trạng thái</th><th>Căn cứ ban tổ chức</th><th></th></tr></thead><tbody>' + rows.map(reg => {
      const race = raceById(reg.raceId) || {};
      return '<tr><td><strong>' + E(horseName(reg.horseId)) + '</strong><div class="small muted">' + E(race.name) + ' · ' + E(race.event) + '</div></td><td>' + date(race.date) + '</td><td>' + badge(reg.status) + '</td><td>' + proofLabel(reg.evidence) + (reg.reason ? '<div class="small muted">' + E(reg.reason) + '</div>' : '') + '</td><td><div class="row">' + btn('Xem', 'race:registration', { id: reg.id }, 'ghost', 'eye') + (roles('trainer') ? btn('Cập nhật', 'race:status', { id: reg.id }, 'secondary', 'edit') : '') + (roles('trainer') && reg.status === 'Accepted' && race.date <= day() ? btn('Nhập kết quả', 'race:result', { id: reg.id }, 'primary', 'plus') : '') + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function resultRows() {
    const rows = get().results.filter(result => {
      const reg = registrationById(result.registrationId);
      return reg && horseVisible(reg.horseId) && (roles('owner') ? result.status === 'Confirmed' : result.status !== 'Superseded');
    });
    if (!rows.length) return R.ui.empty('trophy', 'Chưa có thành tích phù hợp', 'Chỉ kết quả đã xác nhận được công bố cho chủ ngựa.');
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Ngựa / giải</th><th>Thành tích</th><th>Phiên bản</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows.map(result => {
      const reg = registrationById(result.registrationId), race = raceById(reg.raceId) || {};
      let actions = btn('Chi tiết', 'race:result-detail', { id: result.id }, 'ghost', 'eye');
      if (roles('manager') && result.status === 'Pending confirmation') actions += btn('Xác nhận', 'race:approve', { id: result.id }, 'primary', 'check') + btn('Trả lại', 'race:return', { id: result.id }, 'ghost', 'x');
      if (roles('trainer') && ['Confirmed', 'Returned'].includes(result.status)) actions += btn(result.status === 'Confirmed' ? 'Tạo bản sửa' : 'Chỉnh & gửi lại', 'race:revise', { id: result.id }, 'secondary', 'edit');
      return '<tr><td><strong>' + E(horseName(reg.horseId)) + '</strong><div class="small muted">' + E(race.name) + ' · ' + date(race.date) + '</div></td><td><strong>Hạng ' + E(result.position) + '</strong><div class="small muted">' + E(result.finishTime) + '</div></td><td>v' + E(result.version) + '</td><td>' + badge(result.status) + (result.reason ? '<div class="small muted">' + E(result.reason) + '</div>' : '') + '</td><td><div class="row">' + actions + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  R.pages.racing = function () {
    ensureDemo();
    const tab = R.filters['racing:tab'] || 'events';
    const regs = get().registrations.filter(reg => horseVisible(reg.horseId));
    const results = get().results.filter(item => { const reg = registrationById(item.registrationId); return reg && horseVisible(reg.horseId); });
    const pending = results.filter(item => item.status === 'Pending confirmation').length;
    return '<div class="page-head"><div><p class="label">THI ĐẤU & THÀNH TÍCH</p><h1 class="page-title">Đường đua phía trước</h1><p class="page-subtitle">Từ hồ sơ đăng ký đến thành tích được xác nhận.</p></div><div class="page-actions">' + (roles('trainer') ? btn('Thêm giải đua', 'race:create', {}, 'primary', 'plus') : '') + '</div></div><div class="stats-row"><div class="stat-card"><div class="stat-label">Giải sắp tới</div><div class="stat-value">' + get().races.filter(r => r.date >= day()).length + '</div><div class="stat-meta">Cơ hội cho phong độ tốt nhất</div></div><div class="stat-card"><div class="stat-label">Đăng ký được chấp thuận</div><div class="stat-value">' + regs.filter(r => r.status === 'Accepted').length + '</div><div class="stat-meta">Có căn cứ từ ban tổ chức</div></div><div class="stat-card"><div class="stat-label">' + (roles('owner') ? 'Thành tích chính thức' : 'Chờ xác nhận kết quả') + '</div><div class="stat-value">' + (roles('owner') ? results.filter(r => r.status === 'Confirmed').length : pending) + '</div><div class="stat-meta">' + (roles('owner') ? 'Trong phạm vi sở hữu của bạn' : 'Quản lý CLB kiểm tra bằng chứng') + '</div></div></div><div class="tabs">' + [['events', 'Lịch giải đua'], ['registrations', 'Hồ sơ đăng ký'], ['results', 'Thành tích']].map(([key, label]) => '<button class="tab' + (tab === key ? ' active' : '') + '" data-action="race:tab" data-id="' + key + '">' + label + '</button>').join('') + '</div><div class="section-gap">' + (tab === 'events' ? '<div class="grid-3">' + get().races.slice().sort((a, b) => b.date.localeCompare(a.date)).map(eventCard).join('') + '</div>' : '<div class="card">' + (tab === 'registrations' ? registrationRows() : resultRows()) + '</div>') + '</div><p class="small muted section-gap">Đăng ký với ban tổ chức được thực hiện bên ngoài ứng dụng. Thao tác lưu tại đây chỉ ghi nhận hồ sơ và căn cứ. Dữ liệu giải mẫu là giả lập.</p>';
  };

  R.actions['race:tab'] = button => { R.filters['racing:tab'] = button.dataset.id; R.render(); };
  R.actions['race:create'] = function () {
    if (!R.guard('race.edit')) return;
    R.ui.modal('Thêm giải đua', '<div class="form-grid">' + field('Tên giải', text('name', '', 'required maxlength="100" placeholder="Tên giải đua"')) + field('Nội dung thi đấu', text('event', '', 'required maxlength="100" placeholder="Ví dụ: Cự ly 1.600 m"')) + field('Ngày tổ chức', text('date', offset(6), 'type="date" required min="' + day() + '"')) + field('Địa điểm', text('location', '', 'required maxlength="150"')) + field('Giờ bắt đầu', text('start', '09:00', 'type="time" required')) + field('Giờ kết thúc', text('end', '10:00', 'type="time" required')) + field('Cự ly (m)', text('distance', 1600, 'type="number" min="1" step="1" required')) + '</div>' + field('Điều kiện theo ban tổ chức', area('conditions', '', 'required maxlength="2000"'), 'Không tự đặt ngưỡng y tế. Điều kiện chuyên môn cần bác sĩ và HLV xác nhận.'), data => {
      if (!R.guard('race.edit')) return false;
      if (!data.name.trim() || !data.event.trim() || !data.conditions.trim()) return warn('Vui lòng điền đầy đủ thông tin giải.');
      if (data.end <= data.start) return warn('Giờ kết thúc phải sau giờ bắt đầu.');
      if (data.date < day()) return warn('Giải mới phải có ngày từ hôm nay trở đi.');
      R.mutate(s => s.races.unshift({ id: R.utils.uid('race'), name: data.name.trim(), event: data.event.trim(), location: data.location.trim(), date: data.date, start: data.start, end: data.end, distance: Number(data.distance), conditions: data.conditions.trim(), status: 'Open' }), 'Thêm giải đua ' + data.name.trim());
      R.ui.toast('Đã thêm giải đua.');
    }, { submitText: 'Tạo giải đua', wide: true });
  };

  R.actions['race:detail'] = button => {
    const race = raceById(button.dataset.id); if (!race) return;
    const regs = get().registrations.filter(item => item.raceId === race.id && horseVisible(item.horseId));
    R.ui.modal(race.name, '<div class="detail-grid">' + [['Nội dung', race.event], ['Ngày thi đấu', date(race.date)], ['Địa điểm', race.location], ['Cự ly', race.distance + ' m'], ['Khung giờ', (race.start || '00:00') + ' – ' + (race.end || '23:59')]].map(([key, value]) => '<div><div class="detail-label">' + E(key) + '</div><div class="detail-value">' + E(value) + '</div></div>').join('') + '</div><div class="divider"></div><h4>Điều kiện tham dự</h4><p>' + E(race.conditions) + '</p><h4>Hồ sơ trong phạm vi của bạn</h4>' + (regs.length ? regs.map(reg => '<div class="list-item"><strong>' + E(horseName(reg.horseId)) + '</strong>' + badge(reg.status) + '</div>').join('') : '<p class="muted">Chưa có đăng ký.</p>'), null, { wide: true });
  };

  R.actions['race:register'] = button => {
    if (!R.guard('race.edit')) return;
    const race = raceById(button.dataset.id); if (!race) return;
    R.ui.modal('Đăng ký · ' + race.name, '<div class="alert info">Hệ thống kiểm tra trạng thái hồ sơ, sức khỏe, khóa và xung đột lịch. Điều kiện chuyên môn chi tiết vẫn cần xác nhận theo điều lệ.</div>' + field('Chọn ngựa', select('horseId', horseOptions('', 'Chọn ngựa'), 'required')) + field('Ghi chú đối chiếu điều kiện', area('note', '', 'required maxlength="1000"'), 'Ghi nhận HLV đã đối chiếu điều kiện giải; đây không phải chứng nhận y tế tự động.'), data => {
      if (!R.guard('race.edit')) return false;
      const error = eligibility(data.horseId, race.id); if (error) return warn(error);
      if (!data.note.trim()) return warn('Cần ghi nhận việc đối chiếu điều kiện.');
      R.mutate(s => s.registrations.unshift({ id: R.utils.uid('registration'), horseId: data.horseId, raceId: race.id, status: 'Draft', evidence: null, reason: '', note: data.note.trim(), createdAt: R.utils.now() }), 'Lập đăng ký ' + horseName(data.horseId) + ' · ' + race.name);
      R.filters['racing:tab'] = 'registrations'; R.render(); R.ui.toast('Đã lưu hồ sơ nháp. Cập nhật sau khi nộp cho ban tổ chức.');
    }, { submitText: 'Lưu hồ sơ nháp' });
  };

  R.actions['race:registration'] = button => {
    const reg = registrationById(button.dataset.id); if (!reg || !horseVisible(reg.horseId)) return;
    const race = raceById(reg.raceId) || {};
    R.ui.modal('Hồ sơ · ' + horseName(reg.horseId), '<h3>' + E(race.name) + '</h3><p>' + E(race.event) + ' · ' + date(race.date) + '</p><p>' + badge(reg.status) + '</p><h4>Căn cứ ban tổ chức</h4><p>' + proofLabel(reg.evidence) + '</p><p>' + E(reg.note || '') + '</p>' + (reg.reason ? '<div class="alert warning">' + E(reg.reason) + '</div>' : '') + '<p class="small muted">Tệp được trình diễn bằng thông tin tên / loại / dung lượng trên trình duyệt; không được tải lên máy chủ.</p>', null);
  };

  R.actions['race:status'] = button => {
    if (!R.guard('race.edit')) return;
    const reg = registrationById(button.dataset.id); if (!reg || !horseVisible(reg.horseId)) return;
    R.ui.modal('Cập nhật phản hồi đăng ký', field('Trạng thái', select('status', ['Draft', 'Submitted', 'Accepted', 'Rejected', 'Cancelled'].map(status => option(status, ({ Draft: 'Nháp', Submitted: 'Đã nộp', Accepted: 'Được chấp thuận', Rejected: 'Bị từ chối', Cancelled: 'Đã hủy' })[status], reg.status)).join(''))) + field('Căn cứ / số xác nhận', text('reference', evidenceName(reg.evidence), 'maxlength="200"'), 'Bắt buộc khi chọn “Được chấp thuận”. Có thể chọn tệp thay thế.') + field('Tệp căn cứ (PDF, JPG, PNG)', '<input class="input" name="evidenceFile" type="file" accept="application/pdf,image/jpeg,image/png">') + field('Lý do / phản hồi', area('reason', reg.reason, 'maxlength="1000"')), async (data, form) => {
      if (!R.guard('race.edit')) return false;
      const live = registrationById(reg.id); if (!live) return warn('Hồ sơ không còn tồn tại.');
      if (get().results.some(item => item.registrationId === reg.id && ['Confirmed', 'Pending confirmation'].includes(item.status)) && data.status !== 'Accepted') return warn('Hồ sơ đã có kết quả. Hãy xử lý kết quả trước khi đổi trạng thái tham dự.');
      const proof = await readProof(form, 'evidenceFile', data.reference, reg.evidence); if (proof === false) return false;
      if (data.status === 'Accepted' && !evidenceName(proof)) return warn('Cần căn cứ chấp thuận từ ban tổ chức.');
      if (['Rejected', 'Cancelled'].includes(data.status) && !data.reason.trim()) return warn('Cần lý do từ chối hoặc hủy.');
      if (['Submitted', 'Accepted'].includes(data.status) && live.status !== data.status) { const error = eligibility(reg.horseId, reg.raceId, reg.id); if (error) return warn(error); }
      R.mutate(s => { const item = s.registrations.find(i => i.id === reg.id); Object.assign(item, { status: data.status, evidence: proof, reason: data.reason.trim(), updatedAt: R.utils.now() }); }, 'Cập nhật trạng thái đăng ký ' + horseName(reg.horseId));
      R.ui.toast('Đã cập nhật phản hồi.');
    }, { submitText: 'Lưu trạng thái' });
  };

  async function readProof(form, fieldName, reference, existing) {
    const file = form.elements[fieldName] && form.elements[fieldName].files[0];
    if (file) {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowed.includes(file.type)) return warn('Chỉ nhận bằng chứng PDF, JPG hoặc PNG.');
      if (file.size > (file.type === 'application/pdf' ? 20000000 : 10000000)) return warn('Tệp vượt giới hạn: ảnh 10 MB, PDF 20 MB.');
      return R.utils.fileMeta(file);
    }
    return reference && reference.trim() ? { name: reference.trim(), type: 'reference', size: 0 } : existing || null;
  }

  function resultForm(registrationId, source) {
    if (!R.guard('result.edit')) return;
    const reg = registrationById(registrationId); if (!reg || !horseVisible(reg.horseId)) return;
    const race = raceById(reg.raceId);
    if (reg.status !== 'Accepted' || !race || race.date > day()) return warn('Chỉ nhập kết quả cho lượt tham dự đã chấp thuận và đã đến ngày thi đấu.');
    const pending = get().results.find(r => r.registrationId === reg.id && r.status === 'Pending confirmation');
    if (pending) return warn('Lượt tham dự đang có kết quả chờ xác nhận.');
    const confirmed = currentResult(reg.id);
    const returned = source && source.status === 'Returned' ? source : null;
    const base = source || confirmed || {};
    const revision = !!confirmed;
    R.ui.modal((revision ? 'Tạo bản sửa kết quả' : 'Nhập kết quả thi đấu'), '<div class="alert info">' + E(horseName(reg.horseId)) + ' · ' + E(race.name) + (revision ? '. Bản chính thức hiện tại được giữ cho đến khi bản sửa được xác nhận.' : '. Kết quả sẽ được quản lý CLB kiểm tra.') + '</div><div class="form-grid">' + field('Thứ hạng', text('position', base.position || '', 'type="number" min="1" step="1" required')) + field('Thời gian hoàn thành', text('finishTime', base.finishTime || '', 'required maxlength="30" placeholder="01:42.08" pattern="[0-9]{1,3}:[0-5][0-9](\\.[0-9]{1,3})?"')) + '</div>' + field('Tên / số văn bản kết quả chính thức', text('reference', evidenceName(base.evidence), 'maxlength="200"'), 'Cần số xác nhận / tên bằng chứng hoặc tệp mới.') + field('Tệp bằng chứng', '<input class="input" name="evidenceFile" type="file" accept="application/pdf,image/jpeg,image/png">') + field('Nhận xét', area('notes', base.notes || '', 'maxlength="2000"')) + (revision || returned ? field('Lý do chỉnh sửa', area('revisionReason', '', 'required maxlength="500"')) : ''), async (data, form) => {
      if (!R.guard('result.edit')) return false;
      if (get().results.some(r => r.registrationId === reg.id && r.status === 'Pending confirmation')) return warn('Đã có bản gửi chờ xác nhận.');
      if (!Number.isInteger(Number(data.position)) || Number(data.position) < 1) return warn('Thứ hạng phải là số nguyên dương.');
      if (!/^\d{1,3}:[0-5]\d(?:\.\d{1,3})?$/.test(data.finishTime)) return warn('Nhập thời gian theo dạng phút:giây, ví dụ 01:42.08.');
      if ((revision || returned) && !String(data.revisionReason || '').trim()) return warn('Cần lý do chỉnh sửa.');
      const proof = await readProof(form, 'evidenceFile', data.reference, base.evidence); if (proof === false) return false;
      if (!evidenceName(proof)) return warn('Kết quả cần bằng chứng chính thức.');
      R.mutate(s => {
        const version = returned ? returned.version : Math.max(0, ...s.results.filter(r => r.registrationId === reg.id).map(r => Number(r.version) || 1)) + 1;
        const value = { id: returned ? returned.id : R.utils.uid('result'), registrationId: reg.id, version, position: Number(data.position), finishTime: data.finishTime, evidence: proof, notes: data.notes.trim(), status: 'Pending confirmation', reason: '', revisionReason: (data.revisionReason || '').trim(), createdAt: R.utils.now() };
        if (returned) Object.assign(s.results.find(r => r.id === returned.id), value); else s.results.unshift(value);
        notification(s, 'Kết quả thi đấu chờ xác nhận', horseName(reg.horseId) + ' · ' + race.name, 'racing', reg.horseId, ['manager']);
      }, 'Gửi kết quả thi đấu ' + horseName(reg.horseId));
      R.filters['racing:tab'] = 'results'; R.render(); R.ui.toast('Đã gửi kết quả để quản lý CLB xác nhận.');
    }, { wide: true, submitText: 'Gửi xác nhận' });
  }

  R.actions['race:result'] = button => resultForm(button.dataset.id, null);
  R.actions['race:revise'] = button => { const result = resultById(button.dataset.id); if (result && ['Confirmed', 'Returned'].includes(result.status)) resultForm(result.registrationId, result); };
  R.actions['race:result-detail'] = button => {
    const result = resultById(button.dataset.id), reg = result && registrationById(result.registrationId);
    if (!result || !reg || !horseVisible(reg.horseId) || (roles('owner') && result.status !== 'Confirmed')) return;
    const race = raceById(reg.raceId) || {};
    const history = roles('owner') ? '' : '<h4>Lịch sử phiên bản</h4>' + get().results.filter(r => r.registrationId === reg.id).sort((a, b) => b.version - a.version).map(r => '<div class="list-item"><span>v' + E(r.version) + ' · Hạng ' + E(r.position) + ' · ' + E(r.finishTime) + '</span>' + badge(r.status) + '</div>').join('');
    R.ui.modal('Thành tích · ' + horseName(reg.horseId), '<h3>' + E(race.name) + '</h3><div class="detail-grid"><div><div class="detail-label">Thứ hạng</div><div class="detail-value">#' + E(result.position) + '</div></div><div><div class="detail-label">Thời gian</div><div class="detail-value">' + E(result.finishTime) + '</div></div><div><div class="detail-label">Phiên bản</div><div class="detail-value">v' + E(result.version) + '</div></div></div><p>' + badge(result.status) + '</p><p>' + E(result.notes) + '</p><h4>Bằng chứng</h4><p>' + proofLabel(result.evidence) + '</p>' + (result.reason || result.revisionReason ? '<p class="small muted">' + E(result.reason || result.revisionReason) + '</p>' : '') + history + '<p class="small muted">Bản mẫu chỉ lưu thông tin tệp trong trình duyệt. Không có xác minh từ ban tổ chức thật.</p>', null, { wide: true });
  };

  R.actions['race:approve'] = button => {
    if (!R.guard('result.approve')) return;
    const result = resultById(button.dataset.id), reg = result && registrationById(result.registrationId); if (!result || !reg || result.status !== 'Pending confirmation') return;
    R.ui.modal('Xác nhận kết quả v' + result.version, '<div class="alert info">' + E(horseName(reg.horseId)) + ' · Hạng ' + E(result.position) + ' · ' + E(result.finishTime) + '</div><p>' + proofLabel(result.evidence) + '</p><p>Hãy đối chiếu bằng chứng trước khi xác nhận. Bản cũ sẽ được thay thế; tiền thưởng liên quan phải được đối chiếu lại.</p>' + field('Đã đối chiếu bằng chứng', '<span class="row"><input name="reviewed" type="checkbox" value="yes" required> Tôi đã kiểm tra đúng ngựa, nội dung và phiên bản.</span>'), data => {
      if (!R.guard('result.approve')) return false;
      const live = resultById(result.id); if (!live || live.status !== 'Pending confirmation' || !evidenceName(live.evidence)) return warn('Phiên bản không còn chờ xác nhận hoặc thiếu bằng chứng.');
      R.mutate(s => {
        const oldIds = s.results.filter(r => r.registrationId === reg.id && r.status === 'Confirmed').map(r => r.id);
        s.results.forEach(r => { if (oldIds.includes(r.id)) r.status = 'Superseded'; });
        s.prizes.forEach(p => { if (oldIds.includes(p.resultId) && !['Superseded'].includes(p.status)) p.status = 'Pending recheck'; });
        Object.assign(s.results.find(r => r.id === result.id), { status: 'Confirmed', confirmedAt: R.utils.now(), confirmedBy: 'Club Manager' });
        notification(s, 'Thành tích đã được xác nhận', horseName(reg.horseId) + ' · Hạng ' + result.position, 'racing', reg.horseId, ['trainer', 'owner']);
      }, 'Xác nhận kết quả v' + result.version + ' · ' + horseName(reg.horseId));
      R.ui.toast('Đã xác nhận kết quả. Các khoản thưởng bị ảnh hưởng đã chuyển chờ đối chiếu.');
    }, { submitText: 'Xác nhận kết quả' });
  };

  R.actions['race:return'] = button => {
    if (!R.guard('result.approve')) return;
    const result = resultById(button.dataset.id); if (!result || result.status !== 'Pending confirmation') return;
    R.ui.modal('Trả lại kết quả', field('Lý do cần chỉnh sửa', area('reason', '', 'required maxlength="500"')), data => {
      if (!R.guard('result.approve')) return false;
      if (!data.reason.trim()) return warn('Cần nhập lý do.');
      if (resultById(result.id).status !== 'Pending confirmation') return warn('Trạng thái kết quả đã thay đổi.');
      R.mutate(s => { Object.assign(s.results.find(r => r.id === result.id), { status: 'Returned', reason: data.reason.trim() }); const reg = registrationById(result.registrationId); notification(s, 'Kết quả cần chỉnh sửa', data.reason.trim(), 'racing', reg.horseId, ['trainer']); }, 'Trả lại kết quả thi đấu v' + result.version);
      R.ui.toast('Đã trả lại cho HLV.');
    }, { submitText: 'Trả lại kết quả' });
  };

  const categoryCode = value => ({ 'Dinh dưỡng': 'nutrition', 'Y tế': 'medical', 'Vận hành': 'operations', 'Khác': 'other' })[value] || value;
  const categoryLabel = value => ({ nutrition: 'Dinh dưỡng', medical: 'Y tế', operations: 'Vận hành', other: 'Khác' })[value] || value;
  const recordKey = item => item.recordId || item.id;
  function financeScope() {
    ensureDemo();
    const from = R.filters['finance:from'] || day().slice(0, 7) + '-01';
    const to = R.filters['finance:to'] || day();
    let horseId = R.filters['finance:horse'] || '';
    if (horseId && !horseVisible(horseId)) { horseId = ''; R.filters['finance:horse'] = ''; }
    const own = roles('owner');
    const permitted = item => {
      if (item.horseId && !horseVisible(item.horseId)) return false;
      if (!item.horseId && own) return false;
      if (horseId && item.horseId !== horseId) return false;
      if (item.date < from || item.date > to) return false;
      if (own) {
        const h = R.horse(item.horseId);
        if (R.isOwnerFinanceAllowed && !R.isOwnerFinanceAllowed(item.horseId, item.date)) return false;
        if (!R.isOwnerFinanceAllowed && h && h.ownershipFrom && item.date < h.ownershipFrom) return false;
        if (h && h.ownershipTo && item.date >= h.ownershipTo) return false;
      }
      return true;
    };
    const expenses = get().expenses.filter(permitted);
    const prizes = get().prizes.filter(permitted);
    const confirmedExpenses = expenses.filter(i => i.status === 'Confirmed');
    const confirmedPrizes = prizes.filter(i => i.status === 'Confirmed' && resultById(i.resultId) && resultById(i.resultId).status === 'Confirmed');
    const pendingExpenses = expenses.filter(i => i.status === 'Draft');
    const pendingPrizes = prizes.filter(i => ['Draft', 'Pending recheck'].includes(i.status));
    const totals = {};
    confirmedExpenses.forEach(i => { const t = totals[i.currency || 'VND'] || (totals[i.currency || 'VND'] = { expense: 0, prize: 0 }); t.expense += Number(i.amount); });
    confirmedPrizes.forEach(i => { const t = totals[i.currency || 'VND'] || (totals[i.currency || 'VND'] = { expense: 0, prize: 0 }); t.prize += Number(i.amount); });
    if (!Object.keys(totals).length) totals.VND = { expense: 0, prize: 0 };
    return { from, to, horseId, expenses, prizes, confirmedExpenses, confirmedPrizes, pendingExpenses, pendingPrizes, totals };
  }

  function financeTable(data) {
    const expenseRows = data.expenses.filter(i => !['Superseded', 'Voided'].includes(i.status));
    const prizeRows = data.prizes.filter(i => i.status !== 'Superseded');
    const rows = expenseRows.map(i => ({ ...i, kind: 'expense' })).concat(prizeRows.map(i => ({ ...i, kind: 'prize' }))).sort((a, b) => b.date.localeCompare(a.date));
    if (!rows.length) return R.ui.empty('wallet', 'Không có giao dịch trong kỳ', 'Điều chỉnh ngày hoặc phạm vi ngựa để xem dữ liệu.');
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Khoản mục</th><th>Ngựa / phạm vi</th><th>Ngày</th><th>Số tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows.map(item => {
      const isPrize = item.kind === 'prize';
      let actions = btn('Chi tiết', 'finance:detail', { id: item.id, kind: item.kind }, 'ghost', 'eye');
      if (roles('manager')) {
        actions += btn(item.status === 'Confirmed' ? 'Tạo bản sửa' : 'Chỉnh sửa', isPrize ? 'finance:prize-edit' : 'finance:expense-edit', { id: item.id }, 'secondary', 'edit');
        if (item.status === 'Draft' || item.status === 'Pending recheck') actions += btn(item.status === 'Pending recheck' ? 'Đối chiếu lại' : 'Xác nhận', 'finance:confirm', { id: item.id, kind: item.kind }, 'primary', 'check');
      }
      return '<tr><td><strong>' + E(isPrize ? item.noAward ? 'Xác nhận không có thưởng' : 'Tiền thưởng thi đấu' : item.title) + '</strong><div class="small muted">' + E(isPrize ? 'Tiền thưởng' : categoryLabel(item.category)) + ' · v' + E(item.version || 1) + '</div></td><td>' + E(horseName(item.horseId)) + (!item.horseId ? '<div class="small muted">Chưa phân bổ cho chủ ngựa</div>' : '') + '</td><td>' + date(item.date) + '</td><td><strong style="color:' + (isPrize ? 'var(--green,#174c3d)' : 'inherit') + '">' + (item.amount == null ? 'Chưa xác định' : fmt(item.amount, item.currency)) + '</strong></td><td>' + badge(item.status) + '</td><td><div class="row">' + actions + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function reportContent(data) {
    const byHorse = visibleHorses().filter(h => !data.horseId || h.id === data.horseId).map(h => {
      const expense = data.confirmedExpenses.filter(i => i.horseId === h.id).reduce((sum, i) => sum + Number(i.amount), 0);
      const prize = data.confirmedPrizes.filter(i => i.horseId === h.id).reduce((sum, i) => sum + Number(i.amount), 0);
      const pending = data.pendingExpenses.filter(i => i.horseId === h.id).length + data.pendingPrizes.filter(i => i.horseId === h.id).length;
      if (!expense && !prize && !pending) return '';
      return '<tr><td><strong>' + E(h.name) + '</strong><div class="muted small">' + E(h.code) + '</div></td><td>' + fmt(expense) + '</td><td>' + fmt(prize) + '</td><td>' + (pending ? '<span class="pill">' + pending + ' khoản</span>' : '<span class="muted">—</span>') + '</td></tr>';
    }).filter(Boolean);
    const club = data.confirmedExpenses.filter(i => !i.horseId).reduce((sum, i) => sum + Number(i.amount), 0);
    if (club && !roles('owner')) byHorse.push('<tr><td><strong>Chi phí chung CLB</strong><div class="small muted">Chưa phân bổ</div></td><td>' + fmt(club) + '</td><td>—</td><td>—</td></tr>');
    return '<div class="card"><div class="card-head"><div><h3 class="card-title">Báo cáo theo ngựa</h3><p class="small muted">' + date(data.from) + ' – ' + date(data.to) + ' · Chỉ bản đã xác nhận có hiệu lực · VND</p></div>' + R.ui.icon('chart', 22) + '</div>' + (byHorse.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Ngựa / phạm vi</th><th>Chi phí</th><th>Tiền thưởng</th><th>Chờ xử lý</th></tr></thead><tbody>' + byHorse.join('') + '</tbody></table></div>' : '<div class="card-body"><p class="muted">Chưa có dữ liệu trong kỳ.</p></div>') + '</div>';
  }

  R.pages.finance = function () {
    if (!roles('manager', 'owner')) return '<div class="page-head"><div><h1 class="page-title">Tài chính & báo cáo</h1><p class="page-subtitle">Các giá trị tiền được quản lý CLB nhập và đối chiếu.</p></div></div>' + R.ui.empty('shield', 'Phạm vi dành cho quản lý và chủ ngựa', 'Bạn có thể ghi nhận sử dụng vật tư hoặc điều trị tại nghiệp vụ tương ứng.');
    const data = financeScope(), totals = data.totals.VND || { expense: 0, prize: 0 };
    const tab = R.filters['finance:tab'] || 'report';
    return '<div class="page-head"><div><p class="label">TÀI CHÍNH & BÁO CÁO</p><h1 class="page-title">Minh bạch từng khoản mục</h1><p class="page-subtitle">' + (roles('owner') ? 'Chi phí và thành tích tài chính của ngựa thuộc sở hữu.' : 'Đối chiếu chứng từ, xác nhận giá trị và theo dõi vận hành.') + '</p></div><div class="page-actions">' + (roles('manager') ? btn('Ghi chi phí', 'finance:expense-new', {}, 'primary', 'plus') + btn('Ghi tiền thưởng', 'finance:prize-new', {}, 'secondary', 'trophy') : '') + '</div></div><div class="card section-gap"><div class="card-body"><div class="form-grid" style="grid-template-columns:1fr 1fr 1.4fr"><label class="field"><span class="label">Từ ngày</span><input class="input" type="date" value="' + E(data.from) + '" data-filter="finance:from"></label><label class="field"><span class="label">Đến ngày</span><input class="input" type="date" value="' + E(data.to) + '" data-filter="finance:to"></label><label class="field"><span class="label">Phạm vi</span><select class="select" data-filter="finance:horse">' + horseOptions(data.horseId, roles('owner') ? 'Tất cả ngựa của tôi' : 'Toàn CLB') + '</select></label></div></div></div>' + (data.from > data.to ? '<div class="alert danger">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</div>' : '') + '<div class="stats-row"><div class="stat-card"><div class="stat-label">Chi phí đã xác nhận</div><div class="stat-value" style="font-size:26px">' + fmt(totals.expense) + '</div><div class="stat-meta">Theo ngày nghiệp vụ trong kỳ</div></div><div class="stat-card"><div class="stat-label">Tiền thưởng đã xác nhận</div><div class="stat-value" style="font-size:26px">' + fmt(totals.prize) + '</div><div class="stat-meta">Gắn với kết quả có hiệu lực</div></div><div class="stat-card"><div class="stat-label">Chờ xác nhận / đối chiếu</div><div class="stat-value">' + (data.pendingExpenses.length + data.pendingPrizes.length) + '</div><div class="stat-meta">Chưa cộng vào tổng chính thức</div></div></div>' + (data.pendingPrizes.some(p => p.status === 'Pending recheck') ? '<div class="alert warning">Có tiền thưởng cần đối chiếu lại do thành tích đã thay đổi. Khoản này đang được loại khỏi tổng chính thức.</div>' : '') + '<div class="toolbar"><div class="tabs"><button class="tab' + (tab === 'report' ? ' active' : '') + '" data-action="finance:tab" data-id="report">Báo cáo tổng hợp</button><button class="tab' + (tab === 'transactions' ? ' active' : '') + '" data-action="finance:tab" data-id="transactions">Sổ khoản mục</button></div><div class="row">' + btn('CSV', 'finance:csv', {}, 'secondary', 'download') + btn('In báo cáo', 'finance:print', {}, 'ghost', 'file') + btn('Lập báo cáo', 'finance:report', {}, 'primary', 'chart') + '</div></div>' + (tab === 'transactions' ? '<div class="card">' + financeTable(data) + '</div>' : reportContent(data)) + '<p class="small muted section-gap">Bản trình diễn chỉ dùng VND. Dữ liệu lưu trên trình duyệt; tệp đính kèm chỉ lưu thông tin mô tả. Chi phí chung chưa phân bổ không xuất hiện trong báo cáo chủ ngựa.</p>';
  };

  R.actions['finance:tab'] = button => { R.filters['finance:tab'] = button.dataset.id; R.render(); };

  function expenseForm(id) {
    if (!R.guard('finance.edit')) return;
    const existing = id ? get().expenses.find(i => i.id === id) : null;
    if (id && !existing) return;
    const value = existing || {}, revision = value.status === 'Confirmed';
    const suggestions = (get().usage || []).slice(-4).map(i => '<div class="small muted">' + E(i.itemName) + ' · ' + E(i.quantity) + ' ' + E(i.unit) + ' · ' + E(horseName(i.horseId)) + '</div>').join('');
    R.ui.modal(revision ? 'Tạo bản sửa chi phí' : id ? 'Chỉnh chi phí nháp' : 'Ghi nhận chi phí', (revision ? '<div class="alert info">Bản đã xác nhận vẫn có hiệu lực cho đến khi bản sửa được xác nhận.</div>' : '') + '<div class="form-grid">' + field('Khoản chi', text('title', value.title, 'required maxlength="150"')) + field('Loại chi phí', select('category', [['nutrition', 'Dinh dưỡng'], ['medical', 'Y tế'], ['operations', 'Vận hành'], ['other', 'Khác']].map(([k, label]) => option(k, label, categoryCode(value.category))).join(''))) + field('Ngựa / phạm vi', select('horseId', horseOptions(value.horseId || '', 'Chi phí chung CLB (chưa phân bổ)'))) + field('Ngày nghiệp vụ', text('date', value.date || day(), 'type="date" required')) + field('Số tiền (VND)', text('amount', value.amount == null ? '' : String(value.amount), 'type="number" min="0" step="1" required')) + field('Tiền tệ', text('currency', 'VND', 'readonly')) + '</div>' + field('Số / tên chứng từ', text('reference', evidenceName(value.evidence), 'maxlength="200"')) + field('Tệp chứng từ', '<input class="input" type="file" name="evidenceFile" accept="application/pdf,image/jpeg,image/png">') + field('Ghi chú', area('note', value.note, 'maxlength="1000"')) + (revision ? field('Lý do chỉnh sửa', area('revisionReason', '', 'required maxlength="500"')) : '') + (suggestions ? '<div class="form-section"><h4>Ghi nhận sử dụng gần đây để đối chiếu</h4>' + suggestions + '</div>' : ''), async (data, form) => {
      if (!R.guard('finance.edit')) return false;
      if (!data.title.trim()) return warn('Cần tên khoản chi.');
      if (data.amount === '' || !Number.isSafeInteger(Number(data.amount)) || Number(data.amount) < 0) return warn('Số tiền VND phải là số nguyên không âm trong giới hạn hợp lệ.');
      if (data.horseId && !horseVisible(data.horseId)) return warn('Ngựa ngoài phạm vi được phép.');
      if (revision && !data.revisionReason.trim()) return warn('Cần lý do chỉnh sửa khoản đã xác nhận.');
      const proof = await readProof(form, 'evidenceFile', data.reference, value.evidence); if (proof === false) return false;
      const family = existing ? recordKey(existing) : R.utils.uid('expense');
      if (revision && get().expenses.some(i => recordKey(i) === family && i.status === 'Draft')) return warn('Khoản này đang có bản sửa nháp. Hãy hoàn tất bản đó trước.');
      R.mutate(s => {
        const entry = { id: revision || !existing ? R.utils.uid('expense') : existing.id, recordId: family, version: revision ? Math.max(...s.expenses.filter(i => recordKey(i) === family).map(i => i.version || 1)) + 1 : value.version || 1, horseId: data.horseId || null, category: data.category, title: data.title.trim(), date: data.date, amount: Number(data.amount), currency: 'VND', status: 'Draft', evidence: proof, note: data.note.trim(), revisionReason: (data.revisionReason || '').trim(), createdAt: R.utils.now() };
        if (existing && !revision) Object.assign(s.expenses.find(i => i.id === existing.id), entry); else s.expenses.unshift(entry);
      }, 'Lưu chi phí nháp ' + data.title.trim());
      R.filters['finance:tab'] = 'transactions'; R.render(); R.ui.toast('Đã lưu nháp. Cần đối chiếu chứng từ để xác nhận.');
    }, { wide: true, submitText: 'Lưu bản nháp' });
  }

  R.actions['finance:expense-new'] = () => expenseForm();
  R.actions['finance:expense-edit'] = button => expenseForm(button.dataset.id);

  function prizeForm(id) {
    if (!R.guard('finance.edit')) return;
    const existing = id ? get().prizes.find(i => i.id === id) : null;
    if (id && !existing) return;
    const confirmed = get().results.filter(i => i.status === 'Confirmed').filter(i => { const reg = registrationById(i.registrationId); return reg && horseVisible(reg.horseId); });
    if (!confirmed.length) return warn('Chưa có kết quả đã xác nhận để ghi tiền thưởng.');
    const current = existing && (currentResult(existing.registrationId) || resultById(existing.resultId));
    const resultId = current ? current.id : confirmed[0].id;
    const resultOptions = confirmed.map(result => { const reg = registrationById(result.registrationId), race = raceById(reg.raceId) || {}; return option(result.id, horseName(reg.horseId) + ' · ' + race.name + ' · v' + result.version, resultId); }).join('');
    const value = existing || {}, revision = value.status === 'Confirmed';
    R.ui.modal(value.status === 'Pending recheck' ? 'Đối chiếu thưởng theo kết quả mới' : revision ? 'Tạo bản sửa tiền thưởng' : 'Ghi nhận tiền thưởng', '<div class="alert info">Không có thưởng là một kết luận cần xác nhận. Số tiền bỏ trống không tự được hiểu là 0.</div>' + field('Kết quả đã xác nhận', select('resultId', resultOptions, 'required' + (existing ? ' disabled' : ''))) + (existing ? '<input type="hidden" name="resultId" value="' + E(resultId) + '">' : '') + '<div class="form-grid">' + field('Kết luận về tiền thưởng', select('award', option('yes', 'Có tiền thưởng', value.noAward ? 'no' : 'yes') + option('no', 'Xác nhận không có thưởng', value.noAward ? 'no' : 'yes'))) + field('Số tiền VND', text('amount', value.amount == null ? '' : String(value.amount), 'type="number" min="0" step="1"'), 'Có thưởng: bắt buộc số dương. Không thưởng: xác nhận rõ và lưu 0.') + field('Ngày nghiệp vụ', text('date', value.date || day(), 'type="date" required')) + '</div>' + field('Căn cứ thưởng / không thưởng', text('reference', evidenceName(value.evidence), 'maxlength="200"')) + field('Tệp căn cứ', '<input class="input" type="file" name="evidenceFile" accept="application/pdf,image/jpeg,image/png">') + (existing ? field('Lý do chỉnh sửa / đối chiếu', area('revisionReason', '', 'required maxlength="500"')) : ''), async (data, form) => {
      if (!R.guard('finance.edit')) return false;
      const result = resultById(data.resultId), reg = result && registrationById(result.registrationId);
      if (!result || result.status !== 'Confirmed' || !reg) return warn('Cần kết quả đã xác nhận đang có hiệu lực.');
      const noAward = data.award === 'no', amount = noAward ? 0 : Number(data.amount);
      if (!noAward && (data.amount === '' || !Number.isSafeInteger(amount) || amount <= 0)) return warn('Có thưởng phải nhập số tiền VND nguyên dương.');
      if (existing && !data.revisionReason.trim()) return warn('Cần lý do chỉnh sửa hoặc đối chiếu.');
      const proof = await readProof(form, 'evidenceFile', data.reference, value.evidence); if (proof === false) return false;
      if (!evidenceName(proof)) return warn('Cần căn cứ tiền thưởng hoặc xác nhận không có thưởng.');
      if (!existing && get().prizes.some(p => p.registrationId === reg.id && p.status !== 'Superseded')) return warn('Lượt tham dự đã có bản ghi thưởng. Hãy chỉnh sửa hoặc đối chiếu bản hiện có.');
      const family = existing ? recordKey(existing) : R.utils.uid('prize');
      if (revision && get().prizes.some(p => recordKey(p) === family && p.status === 'Draft')) return warn('Khoản thưởng đã có bản sửa nháp.');
      R.mutate(s => {
        const entry = { id: revision || !existing ? R.utils.uid('prize') : existing.id, recordId: family, resultId: result.id, registrationId: reg.id, horseId: reg.horseId, version: revision ? Math.max(...s.prizes.filter(p => recordKey(p) === family).map(p => p.version || 1)) + 1 : value.version || 1, amount, currency: 'VND', date: data.date, noAward, evidence: proof, revisionReason: (data.revisionReason || '').trim(), status: 'Draft', createdAt: R.utils.now() };
        if (existing && !revision) Object.assign(s.prizes.find(p => p.id === existing.id), entry); else s.prizes.unshift(entry);
      }, 'Lưu tiền thưởng nháp ' + horseName(reg.horseId));
      R.filters['finance:tab'] = 'transactions'; R.render(); R.ui.toast('Đã lưu khoản thưởng nháp. Xác nhận sau khi đối chiếu.');
    }, { submitText: 'Lưu bản nháp', wide: true });
  }

  R.actions['finance:prize-new'] = () => prizeForm();
  R.actions['finance:prize-edit'] = button => prizeForm(button.dataset.id);

  R.actions['finance:confirm'] = button => {
    if (!R.guard('finance.edit')) return;
    const kind = button.dataset.kind, key = kind === 'prize' ? 'prizes' : 'expenses';
    const item = get()[key].find(i => i.id === button.dataset.id); if (!item || !['Draft', 'Pending recheck'].includes(item.status)) return;
    if (item.status === 'Pending recheck') return prizeForm(item.id);
    R.ui.modal('Xác nhận khoản mục', '<div class="alert info"><strong>' + E(kind === 'prize' ? item.noAward ? 'Không có tiền thưởng' : 'Tiền thưởng thi đấu' : item.title) + '</strong><p>' + E(horseName(item.horseId)) + ' · ' + fmt(item.amount, item.currency) + ' · ' + date(item.date) + '</p></div><p>' + proofLabel(item.evidence) + '</p>' + field('Xác nhận kiểm tra', '<span class="row"><input name="reviewed" type="checkbox" value="yes" required> Đã đối chiếu đúng căn cứ, giá trị và phiên bản.</span>'), () => {
      if (!R.guard('finance.edit')) return false;
      const live = get()[key].find(i => i.id === item.id); if (!live || live.status !== 'Draft') return warn('Khoản mục đã thay đổi trạng thái.');
      if (!evidenceName(live.evidence)) return warn('Cần bổ sung chứng từ / căn cứ trước khi xác nhận.');
      if (live.amount == null || !Number.isSafeInteger(Number(live.amount)) || live.amount < 0) return warn('Giá trị tiền chưa hợp lệ.');
      if (kind === 'prize') {
        const result = resultById(live.resultId);
        if (!result || result.status !== 'Confirmed' || !currentResult(live.registrationId) || currentResult(live.registrationId).id !== live.resultId) return warn('Kết quả đã thay đổi. Cần đối chiếu lại khoản thưởng.');
        if (!live.noAward && live.amount <= 0) return warn('Có thưởng phải có số tiền dương.');
      }
      R.mutate(s => {
        s[key].forEach(i => { if (i.id !== live.id && recordKey(i) === recordKey(live) && ['Confirmed', 'Pending recheck'].includes(i.status)) i.status = 'Superseded'; });
        Object.assign(s[key].find(i => i.id === live.id), { status: 'Confirmed', confirmedAt: R.utils.now() });
      }, 'Xác nhận ' + (kind === 'prize' ? 'tiền thưởng' : 'chi phí') + ' · ' + horseName(live.horseId));
      R.ui.toast('Đã xác nhận. Báo cáo đã cập nhật bản có hiệu lực.');
    }, { submitText: 'Xác nhận khoản mục' });
  };

  R.actions['finance:detail'] = button => {
    if (!roles('manager', 'owner')) return;
    const key = button.dataset.kind === 'prize' ? 'prizes' : 'expenses';
    const item = get()[key].find(i => i.id === button.dataset.id);
    if (!item || (item.horseId && !horseVisible(item.horseId)) || (roles('owner') && !item.horseId)) return;
    if (roles('owner') && ((R.isOwnerFinanceAllowed && !R.isOwnerFinanceAllowed(item.horseId, item.date)) || (!R.isOwnerFinanceAllowed && R.horse(item.horseId)?.ownershipFrom > item.date))) return warn('Khoản mục nằm ngoài thời gian sở hữu của bạn.');
    const result = item.resultId && resultById(item.resultId);
    R.ui.modal('Chi tiết khoản mục', '<h3>' + E(item.title || (item.noAward ? 'Không có tiền thưởng' : 'Tiền thưởng thi đấu')) + '</h3><div class="detail-grid"><div><div class="detail-label">Phạm vi</div><div class="detail-value">' + E(horseName(item.horseId)) + '</div></div><div><div class="detail-label">Số tiền</div><div class="detail-value">' + fmt(item.amount, item.currency) + '</div></div><div><div class="detail-label">Ngày nghiệp vụ</div><div class="detail-value">' + date(item.date) + '</div></div><div><div class="detail-label">Phiên bản</div><div class="detail-value">v' + E(item.version || 1) + '</div></div></div><p>' + badge(item.status) + '</p>' + (result ? '<p class="small">Gắn với kết quả v' + E(result.version) + ' · ' + badge(result.status) + '</p>' : '') + '<p>' + E(item.note || item.revisionReason || '') + '</p><h4>Căn cứ</h4><p>' + proofLabel(item.evidence) + '</p><p class="small muted">Thông tin tệp được lưu trên trình duyệt cho bản trình diễn; không có kho chứng từ hoặc máy chủ thật.</p>', null);
  };

  function reportRows(data) {
    return data.confirmedExpenses.map(i => ({ type: 'Chi phí', name: i.title, horse: horseName(i.horseId), date: i.date, amount: i.amount, currency: i.currency, version: i.version || 1 })).concat(data.confirmedPrizes.map(i => ({ type: i.noAward ? 'Không thưởng' : 'Tiền thưởng', name: 'Thưởng thi đấu', horse: horseName(i.horseId), date: i.date, amount: i.amount, currency: i.currency, version: i.version || 1 })));
  }

  function reportAllowed() {
    if (!roles('manager', 'owner')) { R.ui.toast('Bạn không có quyền truy cập báo cáo tài chính.', 'error'); return false; }
    const data = financeScope();
    if (data.from > data.to) return warn('Kỳ báo cáo chưa hợp lệ.');
    return data;
  }

  R.actions['finance:csv'] = () => {
    const data = reportAllowed(); if (!data) return;
    const quote = value => '"' + String(value == null ? '' : value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    const rows = [['Loại', 'Khoản mục', 'Ngựa / phạm vi', 'Ngày nghiệp vụ', 'Số tiền', 'Tiền tệ', 'Phiên bản', 'Trạng thái']].concat(reportRows(data).map(i => [i.type, i.name, i.horse, i.date, i.amount, i.currency, i.version, 'Đã xác nhận']));
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'RTMS-bao-cao-' + data.from + '-' + data.to + '.csv'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    R.ui.toast('Đã xuất CSV theo đúng phạm vi và kỳ đang chọn.');
  };

  R.actions['finance:print'] = () => {
    const data = reportAllowed(); if (!data) return;
    const popup = window.open('', '_blank', 'width=1000,height=750'); if (!popup) return warn('Trình duyệt đã chặn cửa sổ in. Hãy cho phép cửa sổ bật lên.');
    const rows = reportRows(data);
    popup.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo RTMS</title><style>body{font:14px Arial,sans-serif;color:#18382d;margin:40px}h1{font-family:Georgia,serif}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{border-bottom:1px solid #ddd;text-align:left;padding:12px 8px}th{background:#f1f4ef}.muted{color:#777;font-size:12px}</style></head><body><p>RACEHORSE TRAINING & MANAGEMENT</p><h1>Báo cáo chi phí & tiền thưởng</h1><p>' + E(date(data.from)) + ' – ' + E(date(data.to)) + ' · ' + E(data.horseId ? horseName(data.horseId) : roles('owner') ? 'Ngựa thuộc sở hữu' : 'Toàn CLB') + '</p><table><thead><tr><th>Loại</th><th>Khoản mục</th><th>Phạm vi</th><th>Ngày</th><th>Số tiền</th></tr></thead><tbody>' + rows.map(i => '<tr><td>' + E(i.type) + '</td><td>' + E(i.name) + '</td><td>' + E(i.horse) + '</td><td>' + E(date(i.date)) + '</td><td>' + E(fmt(i.amount, i.currency)) + '</td></tr>').join('') + '</tbody></table><p>' + Object.entries(data.totals).map(([currency, total]) => 'Chi phí: ' + E(fmt(total.expense, currency)) + ' · Tiền thưởng: ' + E(fmt(total.prize, currency))).join('<br>') + '</p><p class="muted">Chỉ bản đã xác nhận có hiệu lực. ' + (data.pendingExpenses.length + data.pendingPrizes.length) + ' khoản đang chờ không cộng vào tổng. Dữ liệu giả lập, xuất từ bản giao diện trên trình duyệt.</p></body></html>');
    popup.document.close(); popup.focus(); setTimeout(() => popup.print(), 250);
  };

  R.actions['finance:report'] = () => {
    const data = reportAllowed(); if (!data) return;
    const scope = data.horseId ? horseName(data.horseId) : roles('owner') ? 'ngựa thuộc sở hữu của bạn' : 'toàn CLB';
    R.mutate(s => {
      if (!s.reportRuns) s.reportRuns = [];
      s.reportRuns.unshift({ id: R.utils.uid('report'), from: data.from, to: data.to, horseId: data.horseId || null, role: R.role(), generatedAt: R.utils.now(), entries: reportRows(data), pendingCount: data.pendingExpenses.length + data.pendingPrizes.length });
      notification(s, 'Báo cáo đã sẵn sàng', date(data.from) + ' – ' + date(data.to) + ' · ' + scope + '. Mở trang để xem dữ liệu theo quyền hiện tại.', 'finance', data.horseId || (roles('owner') && visibleHorses()[0] ? visibleHorses()[0].id : null), [R.role()]);
    }, 'Lập báo cáo tài chính ' + data.from + ' – ' + data.to);
    R.ui.toast('Đã lập báo cáo và thêm thông báo. Bạn có thể xuất CSV hoặc in.');
  };
})();
