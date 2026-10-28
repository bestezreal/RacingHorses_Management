(function () {
  'use strict';
  const R = window.RTMS;
  const E = R.utils.esc;
  const U = R.utils;
  const B = R.ui.btn;
  const badge = R.ui.badge;
  const S = () => R.getState();
  const trainer = () => R.role() === 'trainer';
  const vet = () => R.role() === 'vet';
  const groom = () => R.role() === 'groom';
  const owner = () => R.role() === 'owner';
  const horseName = id => R.horse(id)?.name || 'Ngựa không còn trong danh sách';
  const roleName = role => S().users.find(x => x.role === role && x.active !== false)?.name || role;
  const groomId = () => S().users.find(x => x.role === 'groom' && x.active !== false)?.id || 'groom-1';
  const visible = () => R.visibleHorses();
  const activeHorses = () => visible().filter(x => x.active !== false);
  const canSee = id => visible().some(x => x.id === id);
  const field = (label, html) => `<label class="field"><span>${label}</span>${html}</label>`;
  const input = (name, value = '', type = 'text', extra = '') => `<input class="input" name="${name}" type="${type}" value="${E(value ?? '')}" ${extra}>`;
  const area = (name, value = '', extra = '') => `<textarea class="textarea" name="${name}" rows="3" ${extra}>${E(value || '')}</textarea>`;
  const options = (items, selected) => items.map(x => `<option value="${E(x[0])}" ${String(x[0]) === String(selected) ? 'selected' : ''}>${E(x[1])}</option>`).join('');
  const select = (name, items, selected, extra = '') => `<select class="select" name="${name}" ${extra}>${options(items, selected)}</select>`;
  const horses = selected => select('horseId', activeHorses().map(h => [h.id, `${h.name} · ${h.code}`]), selected, 'required');
  const loadName = l => ({ light: 'Nhẹ', moderate: 'Vừa', heavy: 'Nặng' }[l] || l || '—');
  const typeName = t => ({ Vaccination: 'Tiêm phòng', Deworming: 'Tẩy giun', 'Hoof Check': 'Kiểm tra móng', Farrier: 'Kiểm tra móng' }[t] || t);
  const notify = (state, title, body, view, roles, horseId) => {
    state.notifications.unshift({ id: U.uid('n'), title, body, view, roles, horseId, read: false, createdAt: U.now() });
  };
  const err = text => { R.ui.toast(text, 'error'); return false; };
  const allowedHorse = id => canSee(id) && R.horse(id)?.active !== false;
  const sessionRows = () => S().sessions.filter(x => canSee(x.horseId) && (!groom() || x.assignedTo === groomId()));
  const sessionById = id => sessionRows().find(x => x.id === id);
  const health = h => `<div class="row">${badge(h.health)}${R.locked(h.id) ? '<span class="badge red">Khóa bài nặng</span>' : ''}</div>`;
  const filterHorse = (page, selected, allText = 'Tất cả chiến mã') => `<select class="select" data-filter="${page}:horse" aria-label="Lọc theo ngựa"><option value="">${allText}</option>${options(visible().map(h => [h.id, h.name]), selected)}</select>`;
  const readonly = () => '<span class="pill">Chế độ xem theo vai trò</span>';
  const card = (title, body, action = '') => `<section class="card"><div class="card-head"><h2 class="card-title">${title}</h2>${action}</div><div class="card-body">${body}</div></section>`;
  const empty = (title, description, action = '') => R.ui.empty('calendar', title, description, action);

  function checkSchedule(d, currentId) {
    if (!allowedHorse(d.horseId)) return 'Ngựa không còn được quản lý hoặc nằm ngoài phạm vi truy cập.';
    if (!d.date || !d.start || !d.end || d.end <= d.start) return 'Giờ kết thúc phải sau giờ bắt đầu.';
    if (d.load === 'heavy' && R.locked(d.horseId)) return 'Bác sĩ đang khóa bài tập nặng. Hãy chọn bài phù hợp hoặc chờ đánh giá lại.';
    if (!S().users.some(x => x.id === d.assignedTo && x.role === 'groom' && x.active !== false)) return 'Hãy chọn nhân viên đang hoạt động.';
    const conflict = S().sessions.find(x => x.id !== currentId && x.status !== 'Cancelled' && x.date === d.date &&
      (x.horseId === d.horseId || x.assignedTo === d.assignedTo) && d.start < x.end && x.start < d.end);
    if (conflict) return `Trùng lịch ${conflict.start}–${conflict.end} của ${horseName(conflict.horseId)} hoặc nhân viên phụ trách. Hai lịch tiếp giáp vẫn được chấp nhận.`;
    return '';
  }

  function planModal(id) {
    if (!R.guard('training.edit')) return;
    const p = S().plans.find(x => x.id === id);
    if (p && !canSee(p.horseId)) return err('Bạn không có quyền truy cập giáo án này.');
    if (!activeHorses().length) return err('Chưa có ngựa đang được quản lý để lập giáo án.');
    const body = `<div class="form-grid">${field('Chiến mã', horses(p?.horseId))}${field('Tên giáo án', input('title', p?.title, 'text', 'required maxlength="100" placeholder="Ví dụ: Giai đoạn tăng sức bền"'))}${field('Giai đoạn', input('stage', p?.stage || 'Xây dựng nền tảng', 'text', 'required maxlength="80"'))}${field('Cự ly mục tiêu (m)', input('distance', p?.distance || 1600, 'number', 'required min="1" step="1"'))}${field('Khối lượng', select('load', [['light','Nhẹ'],['moderate','Vừa'],['heavy','Nặng']], p?.load || 'moderate'))}${field('Mặt sân', select('surface', [['Cát','Cát'],['Cỏ','Cỏ'],['Tổng hợp','Tổng hợp']], p?.surface || 'Cát'))}${field('Từ ngày', input('from', p?.from || U.today(), 'date', 'required'))}${field('Đến ngày', input('to', p?.to || U.addDays(14), 'date', 'required'))}</div>${field('Mục tiêu & ghi chú', area('note', p?.note))}<div class="alert info">Giáo án là hướng dẫn chuyên môn. Hệ thống sẽ kiểm tra lịch và khóa y tế khi tạo hoặc bắt đầu từng buổi tập.</div>`;
    R.ui.modal(p ? 'Điều chỉnh giáo án' : 'Lập giáo án mới', body, d => {
      if (!R.guard('training.edit')) return false;
      if (!allowedHorse(d.horseId)) return err('Hồ sơ ngựa không hợp lệ hoặc đã ngừng quản lý.');
      if (!d.title.trim() || !d.stage.trim() || Number(d.distance) <= 0) return err('Hãy nhập đủ tên, giai đoạn và cự ly hợp lệ.');
      if (d.to < d.from) return err('Ngày kết thúc không được trước ngày bắt đầu.');
      R.mutate(state => {
        if (p) {
          p.history = [...(p.history || []), { ...p, history: undefined, revisedAt: U.now() }];
          Object.assign(p, d, { distance: Number(d.distance) });
        } else state.plans.push({ ...d, id: U.uid('plan'), distance: Number(d.distance) });
      }, `${p ? 'Điều chỉnh' : 'Tạo'} giáo án ${d.title} · ${horseName(d.horseId)}`);
      R.ui.toast(p ? 'Đã lưu phiên bản điều chỉnh.' : 'Giáo án đã sẵn sàng để xếp lịch.');
    }, { wide: true, submitText: p ? 'Lưu điều chỉnh' : 'Tạo giáo án', subtitle: 'Lập kế hoạch theo từng ngựa và giai đoạn.' });
  }

  function sessionModal(id, planId) {
    if (!R.guard('training.edit')) return;
    const s = id ? sessionById(id) : null;
    if (id && !s) return err('Buổi tập không tồn tại trong phạm vi truy cập.');
    if (s && ['Completed', 'Cancelled', 'In progress'].includes(s.status)) return err('Chỉ điều chỉnh lịch chưa diễn ra hoặc đang tạm dừng.');
    const plan = S().plans.find(x => x.id === (planId || s?.planId));
    const availablePlans = S().plans.filter(x => allowedHorse(x.horseId));
    if (!availablePlans.length && !s) return err('Hãy lập giáo án trước khi xếp buổi tập.');
    const p = plan || availablePlans[0] || {};
    const planOptions = [...(s && !s.planId ? [['__manual', `${horseName(s.horseId)} · Lịch tập hiện có`]] : []), ...availablePlans.map(x => [x.id, `${horseName(x.horseId)} · ${x.title}`])];
    const body = `<div class="form-grid">${field('Giáo án', select('planId', planOptions, s && !s.planId ? '__manual' : p.id, 'required'))}${field('Tên buổi tập', input('title', s?.title || p.title, 'text', 'required maxlength="100"'))}${field('Ngày tập', input('date', s?.date || U.today(), 'date', 'required'))}${field('Nhân viên phụ trách', select('assignedTo', S().users.filter(x => x.role === 'groom' && x.active !== false).map(x => [x.id, x.name]), s?.assignedTo || groomId(), 'required'))}${field('Bắt đầu', input('start', s?.start || '06:00', 'time', 'required'))}${field('Kết thúc', input('end', s?.end || '07:00', 'time', 'required'))}${field('Khối lượng', select('load', [['light','Nhẹ'],['moderate','Vừa'],['heavy','Nặng']], s?.load || p.load))}${field('Cự ly (m)', input('distance', s?.distance || p.distance, 'number', 'required min="1"'))}${field('Mặt sân', input('surface', s?.surface || p.surface, 'text', 'required'))}</div>${field('Ghi chú điều phối', area('notes', s?.notes))}<div class="alert info">Kiểm tra trùng lịch theo cả ngựa và nhân viên. Buổi tập đang chờ điều chỉnh chỉ được lên lịch lại sau khi đáp ứng hạn chế y tế.</div>`;
    R.ui.modal(s ? 'Điều chỉnh lịch tập' : 'Xếp lịch buổi tập', body, d => {
      if (!R.guard('training.edit')) return false;
      const currentPlan = S().plans.find(x => x.id === d.planId);
      if (!currentPlan && !(s && d.planId === '__manual')) return err('Giáo án không còn tồn tại.');
      const data = { ...d, planId: currentPlan?.id || '', horseId: currentPlan?.horseId || s.horseId, distance: Number(d.distance) };
      const message = checkSchedule(data, s?.id);
      if (message) return err(message);
      if (!d.title.trim() || Number(d.distance) <= 0) return err('Tên buổi tập và cự ly phải hợp lệ.');
      if (currentPlan && (d.date < currentPlan.from || d.date > currentPlan.to)) return err('Ngày tập phải nằm trong thời gian áp dụng của giáo án.');
      R.mutate(state => {
        if (s) {
          s.history = [...(s.history || []), { ...s, history: undefined, revisedAt: U.now() }];
          Object.assign(s, data, { status: 'Scheduled', holdReason: '' });
        } else state.sessions.push({ ...data, id: U.uid('session'), status: 'Scheduled', assessment: '', metrics: {}, video: null });
        notify(state, 'Lịch tập đã cập nhật', `${horseName(data.horseId)} · ${data.date}, ${data.start}–${data.end}`, 'training', ['groom'], data.horseId);
      }, `${s ? 'Điều chỉnh' : 'Xếp'} lịch tập ${data.title}`);
      R.ui.toast('Đã công bố lịch và phân công nhân viên.');
    }, { wide: true, submitText: 'Công bố lịch' });
  }

  const telemetry = { running: false, key: '', points: [], lastAt: 0, sequence: 0 };
  function selectedSession() {
    const list = sessionRows();
    return list.find(x => x.id === R.filters['training:live']) || list.find(x => x.status === 'In progress') || list[0];
  }
  function ensureTelemetry() {
    const ss = selectedSession();
    const key = ss?.id || '';
    if (key !== telemetry.key) {
      telemetry.key = key; telemetry.points = []; telemetry.lastAt = 0; telemetry.running = false; telemetry.sequence = 0;
    }
    return ss;
  }
  function sample() {
    const ss = ensureTelemetry();
    if (!ss) return;
    telemetry.sequence++;
    const t = telemetry.sequence;
    const heartRate = Math.round(104 + 21 * Math.sin(t / 5) + Math.sin(t * 1.7) * 5);
    const speed = Math.round((27 + 8 * Math.sin(t / 7) + Math.cos(t) * 1.8) * 10) / 10;
    telemetry.lastAt = Date.now();
    telemetry.points.push({ heartRate, speed, measuredAt: U.now(), seq: t });
    telemetry.points = telemetry.points.slice(-36);
  }
  function livePanel() {
    const ss = ensureTelemetry();
    const last = telemetry.points[telemetry.points.length - 1];
    const age = telemetry.lastAt ? Math.floor((Date.now() - telemetry.lastAt) / 1000) : null;
    const stale = age !== null && age > 10;
    const points = telemetry.points;
    const path = key => points.map((p, i) => `${i ? 'L' : 'M'}${18 + i * (660 / 35)},${key === 'heartRate' ? 180 - (p.heartRate - 65) * 1.1 : 180 - p.speed * 3.1}`).join(' ');
    const signal = telemetry.running ? '<span class="badge green">Đang phát mô phỏng</span>' : stale ? '<span class="badge amber">Dữ liệu đã cũ</span>' : '<span class="badge">Chưa phát / đã tạm dừng</span>';
    return `<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><div>${signal}<p class="muted small">${age === null ? 'Chưa có phép đo mới' : `Phép đo cuối: ${age} giây trước`} · Dữ liệu mô phỏng 1 gói/giây</p></div><div class="row" style="gap:24px"><div><span class="muted small">Nhịp tim</span><div class="stat-value">${last ? last.heartRate : '—'} <span class="small muted">bpm</span></div></div><div><span class="muted small">Vận tốc</span><div class="stat-value">${last ? last.speed : '—'} <span class="small muted">km/h</span></div></div></div></div><svg viewBox="0 0 700 205" role="img" aria-label="Biểu đồ nhịp tim và vận tốc mô phỏng" style="display:block;width:100%;height:auto;min-height:150px"><defs><linearGradient id="rtmsChartWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#467361" stop-opacity=".13"/><stop offset="1" stop-color="#467361" stop-opacity="0"/></linearGradient></defs>${[35,80,125,170].map(y => `<line x1="18" x2="682" y1="${y}" y2="${y}" stroke="#e7ebe5" stroke-dasharray="4 5"/>`).join('')}${points.length ? `<path d="${path('heartRate')} L${18 + (points.length - 1) * (660 / 35)},190 L18,190 Z" fill="url(#rtmsChartWash)"/><path d="${path('heartRate')}" stroke="#255443" fill="none" stroke-width="3" stroke-linejoin="round"/><path d="${path('speed')}" stroke="#b28e4d" fill="none" stroke-width="2.5" stroke-linejoin="round"/>` : '<text x="350" y="105" text-anchor="middle" fill="#8b958e" font-size="14">Chọn “Phát mô phỏng” để quan sát</text>'}<text x="18" y="204" fill="#8b958e" font-size="11">36 phép đo gần nhất · đường xanh: nhịp tim · đường vàng: vận tốc</text></svg>${stale ? '<div class="alert warning">Hơn 10 giây không có dữ liệu mới. Giá trị cũ không phản ánh tình trạng hiện tại; thiếu dữ liệu không có nghĩa là an toàn.</div>' : ''}${ss ? `<div class="row" style="gap:8px;flex-wrap:wrap">${trainer() ? B(telemetry.running ? 'Tạm dừng luồng' : 'Phát mô phỏng', 'train:telemetry-toggle', {}, 'secondary', telemetry.running ? 'pause' : 'play') + B('Lấy mẫu mới', 'train:telemetry-refresh', {}, 'ghost', 'reset') + B('Lưu quan sát', 'train:telemetry-save', { id: ss.id }, 'ghost', 'check') + B('Thử cảnh báo mẫu', 'train:demo-alert', { id: ss.id }, 'ghost', 'warning') : readonly()}</div>` : ''}<p class="small muted" style="margin-bottom:0">Dữ liệu tổng hợp để thử giao diện, không kết nối cảm biến và không sử dụng ngưỡng chẩn đoán y tế.</p>`;
  }
  setInterval(() => {
    const panel = document.querySelector('[data-telemetry-panel]');
    if (!panel) return;
    if (telemetry.running) sample();
    panel.innerHTML = livePanel();
  }, 1000);

  function sessionDetail(id) {
    const s = sessionById(id);
    if (!s) return err('Không thể mở buổi tập này.');
    const video = s.video;
    const body = `<div class="row" style="justify-content:space-between">${badge(s.status)}${health(R.horse(s.horseId))}</div><div class="detail-grid section-gap">${[['Chiến mã',horseName(s.horseId)],['Lịch dự kiến',`${U.date(s.date)} · ${s.start}–${s.end}`],['Bài tập',`${loadName(s.load)} · ${s.distance || '—'} m · ${s.surface || '—'}`],['Nhân viên',S().users.find(x => x.id === s.assignedTo)?.name || 'Chưa phân công'],['Nhịp tim ghi nhận',s.metrics?.heartRate ? `${s.metrics.heartRate} bpm${s.metrics.simulated ? ' · mô phỏng' : ''}` : 'Chưa có'],['Vận tốc ghi nhận',s.metrics?.speed ? `${s.metrics.speed} km/h` : 'Chưa có']].map(x => `<div><div class="detail-label">${x[0]}</div><div class="detail-value">${E(x[1])}</div></div>`).join('')}</div>${s.holdReason ? `<div class="alert warning">${E(s.holdReason)}</div>` : ''}${s.medicalAlert ? `<div class="alert danger"><strong>Bác sĩ vừa khóa bài nặng trong lúc buổi tập diễn ra.</strong><br>${E(s.medicalAlert.reason)}<br>HLV cần kiểm tra, tạm dừng hoặc ghi nhận cách xử lý.</div>` : ''}<h3>Nhận xét huấn luyện viên</h3><p>${E(s.assessment || 'Chưa có đánh giá chuyên môn.')}</p><p class="muted">${E(s.notes || '')}</p>${s.alertHandling ? `<h3>Xử lý cảnh báo</h3><p>${E(s.alertHandling)}</p>` : ''}${video ? `<div class="alert info">${R.ui.icon('file')} Video được ghi nhận: <strong>${E(video.name || video)}</strong>${video.size ? ` · ${(video.size / 1000000).toFixed(1)} MB` : ''}. Bản mẫu lưu thông tin tệp; không tải video lên máy chủ.</div>` : '<p class="muted small">Không có video đính kèm. Video không phải điều kiện bắt buộc để đánh giá.</p>'}${s.assignmentStatus ? `<p class="small">Xác nhận nhân viên: ${badge(s.assignmentStatus)} ${E(s.groomNote || '')}</p>` : ''}${s.history?.length ? `<p class="muted small">Đã lưu ${s.history.length} phiên bản thay đổi của buổi tập.</p>` : ''}`;
    R.ui.modal(s.title, body, null, { wide: true, subtitle: `${horseName(s.horseId)} · Hồ sơ huấn luyện` });
  }

  function assessmentModal(id) {
    if (!R.guard('training.edit')) return;
    const s = sessionById(id);
    if (!s) return err('Buổi tập không còn tồn tại.');
    if (!['Completed','Paused','In progress'].includes(s.status)) return err('Chỉ ghi đánh giá khi buổi tập đã bắt đầu.');
    const body = `<div class="form-grid">${field('Nhịp tim ghi nhận (bpm)', input('heartRate', s.metrics?.heartRate || '', 'number', 'min="1" step="1"'))}${field('Vận tốc ghi nhận (km/h)', input('speed', s.metrics?.speed ?? '', 'number', 'min="0" step="0.1"'))}</div>${field('Đánh giá chuyên môn', area('assessment', s.assessment, 'required maxlength="2000"'))}${field('Ghi chú buổi tập', area('notes', s.notes))}${field('Xử lý cảnh báo (nếu có)', area('alertHandling', s.alertHandling))}${field('Video buổi tập · MP4, tối đa 100 MB', '<input class="input" type="file" name="video" accept="video/mp4">')}<p class="muted small">${s.video ? `Đã ghi nhận: ${E(s.video.name || s.video)}. Bỏ trống để giữ nguyên.` : 'Chỉ lưu thông tin video trong trình duyệt của bản mẫu; không có dịch vụ tải lên.'}</p>${s.assessment ? field('Lý do điều chỉnh', input('revisionReason', '', 'text', 'required maxlength="500"')) : ''}`;
    R.ui.modal('Đánh giá & kết quả buổi tập', body, async (d, form) => {
      if (!R.guard('training.edit')) return false;
      if (!d.assessment.trim()) return err('Hãy nhập đánh giá chuyên môn.');
      const file = form.elements.video?.files?.[0];
      if (file && (!/\.mp4$/i.test(file.name) || (file.type && file.type !== 'video/mp4') || file.size > 100000000)) return err('Video phải là MP4 và không quá 100 MB.');
      const meta = file ? await U.fileMeta(file) : s.video;
      if (!R.guard('training.edit')) return false;
      R.mutate(() => {
        s.history = [...(s.history || []), { assessment: s.assessment, metrics: { ...s.metrics }, video: s.video, revisedAt: U.now(), reason: d.revisionReason || 'Đánh giá lần đầu' }];
        s.assessment = d.assessment.trim(); s.notes = d.notes; s.alertHandling = d.alertHandling; s.video = meta || null;
        s.metrics = { ...(s.metrics || {}), heartRate: d.heartRate === '' ? null : Number(d.heartRate), speed: d.speed === '' ? null : Number(d.speed), recordedAt: U.now() };
      }, `Lưu đánh giá buổi tập · ${horseName(s.horseId)}`);
      R.ui.toast('Đã lưu đánh giá và lịch sử phiên bản.');
    }, { wide: true, submitText: 'Lưu đánh giá', subtitle: `${horseName(s.horseId)} · ${U.date(s.date)}` });
  }

  R.pages.training = function () {
    const tab = R.filters['training:tab'] || 'sessions';
    const horse = R.filters['training:horse'] || '';
    const status = R.filters['training:status'] || '';
    const all = sessionRows();
    const sessions = all.filter(s => (!horse || s.horseId === horse) && (!status || s.status === status)).sort((a,b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    const plans = S().plans.filter(x => canSee(x.horseId) && (!horse || x.horseId === horse));
    const completed = all.filter(x => x.status === 'Completed').length;
    const heads = `<div class="page-head"><div><div class="label">HIỆU SUẤT & PHÁT TRIỂN</div><h1 class="page-title">Trung tâm huấn luyện</h1><p class="page-subtitle">Mỗi giáo án là một hành trình. Mỗi buổi tập đều có dữ liệu để nhìn lại.</p></div><div class="page-actions">${trainer() ? B('Lập giáo án','train:plan-new',{},'secondary','plus') + B('Xếp lịch tập','train:session-new',{},'primary','calendar') : readonly()}</div></div>`;
    const stats = `<div class="stats-row"><div class="stat-card"><span class="stat-label">Buổi tập</span><div class="stat-value">${all.length}</div><span class="stat-meta">Trong phạm vi được truy cập</span></div><div class="stat-card"><span class="stat-label">Đã hoàn tất</span><div class="stat-value">${completed}</div><span class="stat-meta">${all.length ? Math.round(completed / all.length * 100) : 0}% tổng số buổi</span></div><div class="stat-card"><span class="stat-label">Đang diễn ra</span><div class="stat-value">${all.filter(x => x.status === 'In progress').length}</div><span class="stat-meta">Theo dõi tiến trình trực tiếp</span></div><div class="stat-card"><span class="stat-label">Chờ điều chỉnh</span><div class="stat-value">${all.filter(x => x.status === 'On hold').length}</div><span class="stat-meta">Cần HLV xem xét lịch tập</span></div></div>`;
    const tabs = `<div class="toolbar section-gap"><div class="tabs">${[['sessions','Lịch & buổi tập'],['plans','Giáo án'],['live','Theo dõi mô phỏng']].map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" data-action="train:tab" data-id="${t[0]}">${t[1]}</button>`).join('')}</div>${filterHorse('training',horse)}</div>`;
    if (tab === 'live') {
      const ss = ensureTelemetry();
      return heads + stats + tabs + card('Nhịp chuyển động', `<div class="toolbar">${field('Buổi tập theo dõi', `<select class="select" data-filter="training:live">${options(all.map(x => [x.id,`${horseName(x.horseId)} · ${x.title}`]),ss?.id)}</select>`) }<span class="pill">DỮ LIỆU MÔ PHỎNG</span></div><div data-telemetry-panel>${livePanel()}</div>`);
    }
    if (tab === 'plans') return heads + stats + tabs + (plans.length ? `<div class="grid-2">${plans.map(p => {
      const related = all.filter(x => x.planId === p.id); const done = related.filter(x => x.status === 'Completed').length;
      return card(`<span class="muted small">${E(horseName(p.horseId))}</span><br>${E(p.title)}`, `<div class="row" style="justify-content:space-between"><span class="pill">${E(p.stage)}</span><span class="badge">${loadName(p.load)}</span></div><div class="detail-grid section-gap">${[['Cự ly',`${p.distance} m`],['Mặt sân',p.surface],['Bắt đầu',U.date(p.from)],['Kết thúc',U.date(p.to)]].map(x => `<div><div class="detail-label">${x[0]}</div><div class="detail-value">${E(x[1])}</div></div>`).join('')}</div><p class="muted">${E(p.note || 'Chưa có ghi chú bổ sung.')}</p><div class="row" style="justify-content:space-between"><span class="small">${done}/${related.length} buổi hoàn tất</span><span class="small muted">${related.length ? Math.round(done/related.length*100) : 0}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${related.length ? done/related.length*100 : 0}%"></div></div>${trainer() ? `<div class="row section-gap">${B('Điều chỉnh','train:plan-edit',{id:p.id},'ghost','edit')}${B('Xếp buổi tập','train:plan-schedule',{id:p.id},'secondary','calendar')}</div>` : ''}`);
    }).join('')}</div>` : empty('Chưa có giáo án', 'Giáo án theo giai đoạn sẽ xuất hiện tại đây.', trainer() ? B('Lập giáo án','train:plan-new',{},'primary','plus') : ''));
    const statusFilter = `<select class="select" data-filter="training:status" aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>${options([['Scheduled','Đã xếp lịch'],['In progress','Đang diễn ra'],['On hold','Chờ điều chỉnh'],['Paused','Tạm dừng'],['Completed','Hoàn tất'],['Cancelled','Đã hủy']],status)}</select>`;
    const rows = sessions.map(s => `<tr><td><strong>${E(s.title)}</strong><div class="small muted">${E(horseName(s.horseId))} · ${loadName(s.load)}</div></td><td>${U.date(s.date)}<div class="small muted">${E(s.start)}–${E(s.end)}</div></td><td>${E(S().users.find(x => x.id === s.assignedTo)?.name || '—')}</td><td>${badge(s.status)}${s.assignmentStatus === 'Completed' ? '<div class="small muted">Nhân viên đã xác nhận</div>' : ''}</td><td><div class="row" style="gap:4px;flex-wrap:wrap">${B('Chi tiết','train:view',{id:s.id},'ghost','eye')}${trainer() && ['Scheduled','On hold','Paused'].includes(s.status) ? B('Lịch','train:session-edit',{id:s.id},'ghost','edit') : ''}${trainer() && ['Scheduled','Paused'].includes(s.status) ? B(s.status === 'Paused' ? 'Tiếp tục':'Bắt đầu','train:start',{id:s.id},'secondary','play') : ''}${trainer() && s.status === 'In progress' ? B('Tạm dừng','train:pause',{id:s.id},'ghost','pause') + B('Hoàn tất','train:complete',{id:s.id},'secondary','check') : ''}${trainer() && ['Completed','Paused','In progress'].includes(s.status) ? B('Đánh giá','train:assessment',{id:s.id},'ghost','file') : ''}${trainer() && ['Scheduled','On hold','Paused'].includes(s.status) ? B('Hủy','train:cancel',{id:s.id},'ghost','x') : ''}${groom() && s.assignedTo === groomId() && ['In progress','Paused','Completed'].includes(s.status) && !s.assignmentStatus ? B('Xác nhận','train:confirm',{id:s.id},'secondary','check') : ''}</div></td></tr>`).join('');
    return heads + stats + tabs + card('Kế hoạch trên đường chạy', `<div class="toolbar">${statusFilter}<p class="small muted">${sessions.length} buổi tập · Hạn chế y tế được kiểm tra trước mỗi lần bắt đầu.</p></div>${rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Buổi tập / chiến mã</th><th>Lịch</th><th>Phân công</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Không có buổi tập phù hợp','Thử đổi bộ lọc hoặc xếp một lịch tập mới.')}`);
  };

  R.actions['train:tab'] = b => { R.filters['training:tab'] = b.dataset.id; R.render(); };
  R.actions['train:plan-new'] = () => planModal();
  R.actions['train:plan-edit'] = b => planModal(b.dataset.id);
  R.actions['train:plan-schedule'] = b => sessionModal(null,b.dataset.id);
  R.actions['train:session-new'] = () => sessionModal();
  R.actions['train:session-edit'] = b => sessionModal(b.dataset.id);
  R.actions['train:view'] = b => sessionDetail(b.dataset.id);
  R.actions['train:assessment'] = b => assessmentModal(b.dataset.id);
  R.actions['train:start'] = b => {
    if (!R.guard('session.run')) return;
    const s = sessionById(b.dataset.id);
    if (!s || !['Scheduled','Paused'].includes(s.status)) return err('Buổi tập chưa sẵn sàng để bắt đầu.');
    const message = checkSchedule(s,s.id); if (message) return err(message);
    R.ui.modal('Bắt đầu buổi tập?', `<p><strong>${E(horseName(s.horseId))}</strong> · ${E(s.title)}</p><p class="muted">HLV chịu trách nhiệm kiểm tra điều kiện thực tế. Dữ liệu mô phỏng không thay thế đánh giá chuyên môn.</p>`, () => {
      if (!R.guard('session.run')) return false;
      const blocked = checkSchedule(s,s.id); if (blocked) return err(blocked);
      R.mutate(() => { s.status = 'In progress'; s.actualStart = s.actualStart || U.now(); }, `Bắt đầu buổi tập · ${horseName(s.horseId)}`);
      R.ui.toast('Buổi tập đang diễn ra.');
    }, { submitText: 'Bắt đầu' });
  };
  ['pause','cancel'].forEach(action => {
    R.actions[`train:${action}`] = b => {
      if (!R.guard('session.run')) return;
      const s = sessionById(b.dataset.id);
      if (!s || (action === 'pause' && s.status !== 'In progress') || ['Completed','Cancelled'].includes(s.status)) return err('Không thể áp dụng thao tác cho trạng thái hiện tại.');
      R.ui.modal(action === 'pause' ? 'Tạm dừng buổi tập' : 'Hủy lịch tập', field('Lý do',area('reason','','required maxlength="500"')),d => {
        if (!R.guard('session.run')) return false;
        if (!d.reason.trim()) return err('Hãy ghi lý do để lưu lịch sử.');
        R.mutate(() => { s.status = action === 'pause' ? 'Paused' : 'Cancelled'; s.statusReason = d.reason; s.alertHandling = d.reason; }, `${action === 'pause' ? 'Tạm dừng' : 'Hủy'} buổi tập · ${horseName(s.horseId)}`);
        R.ui.toast('Đã cập nhật trạng thái buổi tập.');
      }, { submitText: action === 'pause' ? 'Tạm dừng' : 'Xác nhận hủy' });
    };
  });
  R.actions['train:complete'] = b => {
    if (!R.guard('session.run')) return;
    const s = sessionById(b.dataset.id);
    if (!s || !['In progress','Paused'].includes(s.status)) return err('Buổi tập chưa bắt đầu hoặc đã kết thúc.');
    R.ui.modal('Hoàn tất buổi tập', `${field('Nhận xét sau buổi tập',area('assessment',s.assessment,'required maxlength="2000"'))}${field('Xử lý cảnh báo / ghi chú',area('alertHandling',s.alertHandling))}`, d => {
      if (!R.guard('session.run')) return false;
      if (!d.assessment.trim()) return err('Hãy nhập nhận xét trước khi hoàn tất.');
      R.mutate(() => { s.status = 'Completed'; s.actualEnd = U.now(); s.assessment = d.assessment; s.alertHandling = d.alertHandling; },`Hoàn tất buổi tập · ${horseName(s.horseId)}`);
      R.ui.toast('Đã cập nhật tiến độ huấn luyện.');
    },{submitText:'Hoàn tất buổi tập'});
  };
  R.actions['train:confirm'] = b => {
    if (!R.guard('task.complete')) return;
    const s = sessionById(b.dataset.id);
    if (!groom() || !s || s.assignedTo !== groomId() || s.assignmentStatus) return err('Công việc không thuộc phân công hoặc đã được xác nhận.');
    R.ui.modal('Xác nhận công việc được phân công', `${field('Kết quả thực hiện',select('outcome',[['Completed','Đã thực hiện'],['Not completed','Chưa thực hiện']], 'Completed'))}${field('Ghi chú / lý do chưa thực hiện',area('note'))}`,d => {
      if (!R.guard('task.complete')) return false;
      if (s.assignmentStatus) return err('Công việc đã được xác nhận.');
      if (d.outcome === 'Not completed' && !d.note.trim()) return err('Hãy nêu lý do chưa thực hiện.');
      R.mutate(state => { s.assignmentStatus = d.outcome; s.assignmentConfirmedAt = U.now(); s.groomNote = d.note; notify(state,'Nhân viên đã phản hồi',`${horseName(s.horseId)} · ${s.title}`,'training',['trainer'],s.horseId); },`Xác nhận phân công tập · ${horseName(s.horseId)}`);
      R.ui.toast('Đã gửi phản hồi cho HLV. HLV sẽ ghi kết quả chuyên môn.');
    },{submitText:'Gửi xác nhận'});
  };
  R.actions['train:telemetry-toggle'] = () => { if (!R.guard('training.edit')) return; ensureTelemetry(); if (!telemetry.key) return err('Chưa có buổi tập để theo dõi.'); telemetry.running = !telemetry.running; if (telemetry.running) sample(); R.render(); };
  R.actions['train:telemetry-refresh'] = () => { if (!R.guard('training.edit')) return; sample(); R.render(); };
  R.actions['train:telemetry-save'] = b => {
    if (!R.guard('training.edit')) return;
    const s = sessionById(b.dataset.id); const last = telemetry.points[telemetry.points.length-1];
    if (!s || !last || Date.now()-telemetry.lastAt > 10000) return err('Hãy lấy một phép đo mô phỏng mới trước khi lưu.');
    R.mutate(state => { s.metrics = {...last,simulated:true,recordedAt:U.now()}; state.measurements.push({id:U.uid('measure'),horseId:s.horseId,sessionId:s.id,...last,source:'Simulated'}); },`Lưu quan sát mô phỏng · ${horseName(s.horseId)}`);
    R.ui.toast('Đã lưu quan sát có nhãn mô phỏng; tổng quan đã cập nhật.');
  };
  R.actions['train:demo-alert'] = b => {
    if (!R.guard('training.edit')) return; const s = sessionById(b.dataset.id); if (!s) return;
    R.mutate(state => { notify(state,'Cảnh báo thử giao diện',`${horseName(s.horseId)}: tình huống tổng hợp, không dựa trên ngưỡng y tế. HLV xem xét và ghi cách xử lý.`,'training',['trainer'],s.horseId); s.demoAlert = {at:U.now(),synthetic:true}; },'Phát cảnh báo mẫu tổng hợp (không phải cảnh báo y tế)');
    R.ui.toast('Đã tạo cảnh báo thử trong trung tâm thông báo.','info');
  };

  const regions = [['neck','Cổ'],['shoulder','Vai'],['back','Lưng'],['front-leg','Chân trước'],['hind-leg','Chân sau']];
  const regionKey = key => regions.some(x => x[0] === key) ? key : /trước/i.test(key || '') ? 'front-leg' : /sau/i.test(key || '') ? 'hind-leg' : /vai/i.test(key || '') ? 'shoulder' : /lưng/i.test(key || '') ? 'back' : /cổ/i.test(key || '') ? 'neck' : key;
  const regionName = key => regions.find(x => x[0] === regionKey(key))?.[1] || key || 'Chưa đánh dấu';
  function injuryMap(horseId) {
    const front = R.filters['medical:angle'] === 'front';
    const region = R.filters['medical:region'] || 'shoulder';
    const records = S().medicalRecords.filter(x => x.horseId === horseId && x.region).map(x => ({ ...x, region: regionKey(x.region) }));
    const coords = front ? {neck:[240,95],shoulder:[217,150],back:[241,178],'front-leg':[211,247],'hind-leg':[270,247]} : {neck:[365,101],shoulder:[315,145],back:[232,113],'front-leg':[315,225],'hind-leg':[167,227]};
    const silhouette = front ? '<ellipse cx="240" cy="160" rx="61" ry="68" fill="url(#horseShade)"/><path d="M208 109 Q207 39 220 27 L226 56 L252 56 L260 27 Q276 39 272 109 L258 132 L221 132Z" fill="url(#horseShade)"/><ellipse cx="240" cy="99" rx="29" ry="37" fill="#6e8376"/><path d="M192 187 L206 285 L221 285 L227 197 M253 197 L261 285 L276 285 L287 187" fill="#73877a"/><path d="M205 284 L223 284 M260 284 L279 284" stroke="#3c5448" stroke-width="9" stroke-linecap="round"/>' : '<path d="M129 139 Q91 120 91 191 Q94 164 112 164" fill="none" stroke="#5c7467" stroke-width="13" stroke-linecap="round"/><ellipse cx="229" cy="149" rx="109" ry="56" fill="url(#horseShade)"/><path d="M299 130 L337 56 L382 58 L399 90 L371 105 L350 163Z" fill="url(#horseShade)"/><path d="M339 59 L343 30 L357 54 L376 34 L381 61" fill="#556f60"/><path d="M148 173 L144 273 L163 273 L185 182 M185 183 L197 271 L212 271 L212 191 M293 184 L304 274 L321 274 L324 175 M320 176 L341 268 L357 268 L343 150" fill="#718779"/><path d="M139 274 L165 274 M194 273 L214 273 M303 276 L324 276 M339 270 L360 270" stroke="#3c5448" stroke-width="9" stroke-linecap="round"/><circle cx="373" cy="75" r="3" fill="#233e31"/>';
    return `<div class="toolbar"><div class="tabs"><button class="tab ${!front?'active':''}" data-action="med:angle" data-id="side">Góc nghiêng</button><button class="tab ${front?'active':''}" data-action="med:angle" data-id="front">Góc trước</button></div><span class="pill">MÔ HÌNH MINH HỌA</span></div><svg viewBox="0 0 480 310" style="width:100%;max-height:320px;display:block" role="img" aria-label="Sơ đồ minh họa vị trí chấn thương trên ngựa"><defs><linearGradient id="horseShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b3c0b4"/><stop offset=".5" stop-color="#82998a"/><stop offset="1" stop-color="#526e5d"/></linearGradient></defs><ellipse cx="245" cy="292" rx="170" ry="10" fill="#e3e8df"/>${silhouette}${regions.map(([key,label]) => { const [x,y]=coords[key]; const count=records.filter(r=>r.region===key).length; return `<g data-action="med:region" data-id="${key}" role="button" tabindex="0" aria-label="Chọn ${label}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${region===key?15:11}" fill="${count?'#b97158':region===key?'#b59352':'#f8f6ee'}" fill-opacity=".95" stroke="${region===key?'#fff':'#466352'}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" fill="${count?'white':'#254a38'}"/></g>`;}).join('')}</svg><div class="row" style="gap:6px;flex-wrap:wrap">${regions.map(([key,label])=>`<button class="btn ${region===key?'btn-secondary':'btn-ghost'}" data-action="med:region" data-id="${key}">${label}${records.some(x=>x.region===key)?' ·':''}</button>`).join('')}</div><p class="small muted">Đang chọn: <strong>${E(regionName(region))}</strong>. Mô hình minh họa 2.5D để thử đánh dấu vị trí, không phải tài sản giải phẫu lâm sàng.</p>${vet()?B('Ghi hồ sơ tại vị trí này','med:record-new',{horse:horseId,region},'secondary','plus'):''}`;
  }

  function medicalRecordModal(id, horseId, region, incidentId) {
    if (!R.guard('medical.edit')) return;
    const record = S().medicalRecords.find(x=>x.id===id);
    if (record && !canSee(record.horseId)) return err('Hồ sơ nằm ngoài phạm vi truy cập.');
    const h = record?.horseId || horseId || activeHorses()[0]?.id;
    if (!h) return err('Chưa có hồ sơ ngựa đang hoạt động.');
    const body=`<div class="form-grid">${field('Chiến mã',horses(h))}${field('Ngày khám',input('date',record?.date||U.today(),'date','required'))}${field('Trạng thái sức khỏe',select('health',[['Eligible','Đủ điều kiện'],['Monitoring','Cần theo dõi'],['Injured','Chấn thương'],['Quarantined','Cách ly']],R.horse(h)?.health))}${field('Vị trí trên mô hình',select('region',[['','Không đánh dấu'],...regions],regionKey(record?.region)||region||''))}${field('Thuốc / vật tư đã sử dụng',input('medicine',record?.medicine||'','text','maxlength="100"'))}${field('Số lượng sử dụng',input('quantity',record?.quantity||'','number','min="0.001" step="0.001"'))}${field('Đơn vị',input('unit',record?.unit||'liều','text','maxlength="30"'))}${field('Cân nặng ghi nhận (kg)',input('weight',R.horse(h)?.weight||'','number','min="0.1" step="0.1"'))}</div>${field('Chẩn đoán',area('diagnosis',record?.diagnosis,'required maxlength="2000"'))}${field('Phác đồ / đơn thuốc',area('treatment',record?.treatment,'required maxlength="2000"'))}${field('Theo dõi & diễn biến phục hồi',area('notes',record?.notes))}${record?field('Lý do cập nhật hồ sơ',input('reason','','text','required maxlength="500"')):''}<div class="alert info">Chỉ bác sĩ cập nhật chuyên môn. Ghi số lượng vật tư làm căn cứ đối chiếu; giá trị tiền do quản lý CLB ghi nhận.</div>`;
    R.ui.modal(record?'Cập nhật hồ sơ khám':'Ghi nhận khám & điều trị',body,d=>{
      if(!R.guard('medical.edit'))return false;
      if(!allowedHorse(d.horseId))return err('Ngựa không còn hoạt động hoặc ngoài phạm vi truy cập.');
      if(!d.diagnosis.trim()||!d.treatment.trim())return err('Hãy nhập chẩn đoán và phác đồ điều trị.');
      if(d.medicine.trim()&&!(Number(d.quantity)>0))return err('Thuốc đã sử dụng cần có số lượng lớn hơn 0.');
      if(!d.medicine.trim()&&d.quantity)return err('Hãy ghi tên thuốc/vật tư tương ứng với số lượng.');
      const rid=record?.id||U.uid('medical');
      R.mutate(state=>{
        const data={...d,id:rid,vetName:roleName('vet'),quantity:d.quantity?Number(d.quantity):null,status:record?.status||'Open',modelVersion:'illustrative-horse-v1',updatedAt:U.now()};
        if(record){record.history=[...(record.history||[]),{...record,history:undefined,revisedAt:U.now(),revisionReason:d.reason}];Object.assign(record,data);}else state.medicalRecords.push(data);
        const horse=state.horses.find(x=>x.id===d.horseId);horse.health=d.health;horse.ready=d.health==='Eligible';if(d.weight)horse.weight=Number(d.weight);
        state.usage=state.usage.filter(x=>x.sourceId!==rid);
        if(d.medicine.trim())state.usage.push({id:U.uid('usage'),horseId:d.horseId,itemName:d.medicine,quantity:Number(d.quantity),unit:d.unit||'liều',sourceId:rid,date:d.date,source:'medical'});
        if(incidentId){const incident=state.incidents.find(x=>x.id===incidentId);if(incident){incident.status='Reviewing';incident.medicalRecordId=rid;}}
        notify(state,'Hồ sơ sức khỏe đã cập nhật',`${horseName(d.horseId)} · Bác sĩ đã ghi nhận đánh giá mới.`,'medical',['trainer'],d.horseId);
      },`${record?'Cập nhật':'Tạo'} hồ sơ khám · ${horseName(d.horseId)}`);
      R.ui.toast('Đã lưu hồ sơ chuyên môn và ghi nhận sử dụng vật tư.');
    },{wide:true,submitText:'Lưu hồ sơ',subtitle:'Tài liệu nghiệp vụ minh họa · không phải chỉ dẫn điều trị thực tế.'});
  }

  function medicalRecordView(id){
    const rec=S().medicalRecords.find(x=>x.id===id&&canSee(x.horseId));
    if(!vet()||!rec)return err('Hồ sơ khám chi tiết dành cho bác sĩ thú y.');
    R.ui.modal(`Hồ sơ ${horseName(rec.horseId)}`,`${badge(rec.status)}<div class="detail-grid section-gap"><div><div class="detail-label">Ngày khám</div><div class="detail-value">${U.date(rec.date)}</div></div><div><div class="detail-label">Bác sĩ</div><div class="detail-value">${E(rec.vetName)}</div></div><div><div class="detail-label">Vị trí ghi nhận</div><div class="detail-value">${E(regionName(rec.region))}</div></div><div><div class="detail-label">Thuốc / lượng sử dụng</div><div class="detail-value">${E(rec.medicine||'Không ghi nhận')} ${rec.quantity?`${E(rec.quantity)} ${E(rec.unit||'liều')}`:''}</div></div></div><h3>Chẩn đoán</h3><p>${E(rec.diagnosis)}</p><h3>Phác đồ & điều trị</h3><p>${E(rec.treatment)}</p><h3>Diễn biến phục hồi</h3><p>${E(rec.notes||'Chưa có ghi chú bổ sung.')}</p>${rec.history?.length?`<p class="muted small">${rec.history.length} phiên bản điều chỉnh đã được giữ lại.</p>`:''}`,null,{wide:true});
  }

  function lockModal(horseId){
    if(!R.guard('lock.edit'))return;
    const h=R.horse(horseId);if(!h||!canSee(horseId))return err('Hồ sơ ngựa không hợp lệ.');
    const lock=R.locked(horseId);
    const affected=S().sessions.filter(x=>x.horseId===horseId&&x.load==='heavy'&&!['Completed','Cancelled'].includes(x.status));
    R.ui.modal(lock?'Đánh giá lại & gỡ khóa':'Khóa huấn luyện khẩn cấp',`<div class="alert ${lock?'info':'warning'}"><strong>${E(h.name)}</strong><br>${lock?'Gỡ khóa không tự khôi phục lịch đang chờ điều chỉnh. HLV phải xem xét và xếp lại từng buổi.':`Khóa áp dụng cho bài nặng. Có ${affected.length} buổi chưa kết thúc cần xem xét; buổi đang chạy sẽ được cảnh báo cho HLV.`}</div>${lock?field('Kết quả đánh giá lại',area('reassessment','','required maxlength="1000"')):''}${field(lock?'Lý do gỡ khóa':'Lý do & hạn chế chuyên môn',area('reason','','required maxlength="1000"'))}`,d=>{
      if(!R.guard('lock.edit'))return false;
      if(!d.reason.trim()||(lock&&!d.reassessment.trim()))return err('Hãy ghi đầy đủ kết quả đánh giá và lý do.');
      const current=R.locked(horseId);
      if(Boolean(current)!==Boolean(lock))return err('Trạng thái khóa đã thay đổi. Hãy mở lại để kiểm tra.');
      R.mutate(state=>{
        if(lock){lock.active=false;lock.releasedAt=U.now();lock.releaseReason=d.reason;lock.reassessment=d.reassessment;notify(state,'Bác sĩ đã gỡ khóa huấn luyện',`${h.name}: HLV cần đánh giá lại và xếp lại lịch đang chờ.`,'training',['trainer'],horseId);}
        else{state.locks.push({id:U.uid('lock'),horseId,active:true,reason:d.reason,createdAt:U.now(),scope:'heavy',createdBy:roleName('vet')});state.sessions.filter(x=>x.horseId===horseId&&x.load==='heavy').forEach(x=>{if(['Scheduled','On hold'].includes(x.status)){x.status='On hold';x.holdReason=`Bác sĩ khóa bài nặng: ${d.reason}`;}else if(x.status==='In progress'){x.medicalAlert={at:U.now(),reason:d.reason};notify(state,'Cần xử lý buổi tập đang diễn ra',`${h.name}: bác sĩ vừa khóa bài nặng. HLV kiểm tra, tạm dừng hoặc ghi cách xử lý.`,'training',['trainer'],horseId);}});notify(state,'Khóa huấn luyện đã áp dụng',`${h.name}: các bài nặng chưa bắt đầu được giữ lại chờ điều chỉnh.`,'training',['trainer','groom'],horseId);}
      },`${lock?'Gỡ':'Đặt'} khóa huấn luyện · ${h.name}`);
      R.ui.toast(lock?'Đã gỡ khóa. Lịch chờ vẫn cần HLV điều chỉnh.':'Đã khóa bài nặng và thông báo cho HLV.');
    },{submitText:lock?'Xác nhận gỡ khóa':'Áp dụng khóa',subtitle:'Quyền quyết định thuộc bác sĩ. Không tự thay đổi chẩn đoán hoặc lịch sử buổi tập.'});
  }

  function scheduleModal(){
    if(!R.guard('medical.schedule'))return;
    R.ui.modal('Lập lịch y tế định kỳ',`<div class="form-grid">${field('Chiến mã',horses())}${field('Loại chăm sóc',select('type',[['Vaccination','Tiêm phòng'],['Deworming','Tẩy giun'],['Hoof Check','Kiểm tra móng']], 'Vaccination'))}${field('Ngày thực hiện',input('date',U.addDays(2),'date','required'))}</div>${field('Ghi chú',area('notes'))}`,d=>{
      if(!R.guard('medical.schedule'))return false;
      if(!allowedHorse(d.horseId))return err('Ngựa không hợp lệ hoặc đã ngừng quản lý.');
      R.mutate(state=>{state.medicalSchedules.push({...d,id:U.uid('schedule'),status:'Pending'});notify(state,'Lịch y tế mới',`${horseName(d.horseId)} · ${typeName(d.type)} · ${U.date(d.date)}`,'medical',['vet'],d.horseId);},`Lập lịch ${typeName(d.type)} · ${horseName(d.horseId)}`);
      R.ui.toast('Đã thêm lịch y tế và thông báo trong ứng dụng.');
    },{submitText:'Thêm lịch'});
  }

  function incidentView(id){
    const incident=S().incidents.find(x=>x.id===id&&canSee(x.horseId));if(!incident)return err('Báo cáo không khả dụng.');
    if(!vet()&&!groom())return err('Báo cáo sự cố chi tiết dành cho nhân viên phụ trách và bác sĩ.');
    const image=incident.image?.preview||incident.image;
    const picture=typeof image==='string'&&image.startsWith('data:image/')?`<img src="${E(image)}" alt="Hình ảnh sự cố" style="max-width:100%;max-height:280px;object-fit:contain;border-radius:12px">`:'';
    R.ui.modal(`Báo cáo · ${horseName(incident.horseId)}`,`${badge(incident.status)}<p class="muted">${U.date(incident.date)} · ${E(incident.reporter||'Nhân viên chăm sóc')}</p><p>${E(incident.description)}</p>${picture}${incident.medicalRecordId?'<div class="alert success">Đã liên kết hồ sơ khám để theo dõi xử lý.</div>':''}${vet()?`<div class="row section-gap">${incident.status==='Submitted'?B('Tiếp nhận','med:incident-accept',{id},'secondary','check'):''}${B('Tạo hồ sơ khám','med:incident-record',{id},'secondary','plus')}${incident.status!=='Closed'?B('Kết thúc xử lý','med:incident-close',{id},'ghost','check'):''}</div>`:''}`,null,{wide:true});
  }

  R.pages.medical=function(){
    let tab=R.filters['medical:tab']||'overview';if(!vet()&&tab!=='overview')tab='overview';
    const selected=R.filters['medical:horse']||'';
    const list=visible().filter(h=>!selected||h.id===selected);
    const activeLocks=visible().filter(h=>R.locked(h.id));
    const records=S().medicalRecords.filter(x=>canSee(x.horseId)&&(!selected||x.horseId===selected));
    const schedules=S().medicalSchedules.filter(x=>canSee(x.horseId)&&(!selected||x.horseId===selected)).sort((a,b)=>a.date.localeCompare(b.date));
    const incidents=S().incidents.filter(x=>canSee(x.horseId)&&(!selected||x.horseId===selected));
    const head=`<div class="page-head"><div><div class="label">SỨC KHỎE LÀ NỀN TẢNG</div><h1 class="page-title">Chăm sóc sức khỏe</h1><p class="page-subtitle">Hồ sơ liền mạch, hạn chế rõ ràng và sự an tâm trong từng quyết định.</p></div><div class="page-actions">${vet()?B('Lịch y tế','med:schedule-new',{},'secondary','calendar')+B('Ghi hồ sơ khám','med:record-new',{},'primary','plus'):readonly()}</div></div>`;
    const stats=`<div class="stats-row"><div class="stat-card"><span class="stat-label">Đủ điều kiện</span><div class="stat-value">${visible().filter(h=>h.health==='Eligible').length}</div><span class="stat-meta">Trạng thái do bác sĩ ghi nhận</span></div><div class="stat-card"><span class="stat-label">Cần theo dõi</span><div class="stat-value">${visible().filter(h=>h.health==='Monitoring').length}</div><span class="stat-meta">Theo dõi diễn biến định kỳ</span></div><div class="stat-card"><span class="stat-label">Khóa bài nặng</span><div class="stat-value">${activeLocks.length}</div><span class="stat-meta">Hạn chế áp dụng ở lịch tập</span></div><div class="stat-card"><span class="stat-label">${vet()?'Sự cố mới':'Trong phạm vi của bạn'}</span><div class="stat-value">${vet()?incidents.filter(x=>x.status==='Submitted').length:visible().length}</div><span class="stat-meta">${vet()?'Chờ bác sĩ tiếp nhận':'Chiến mã được phép theo dõi'}</span></div></div>`;
    const tabs=`<div class="toolbar section-gap"><div class="tabs">${[['overview','Tổng quan'],...(vet()?[['records','Hồ sơ khám'],['schedules','Lịch y tế'],['incidents','Sự cố chuồng trại']]:[])].map(t=>`<button class="tab ${tab===t[0]?'active':''}" data-action="med:tab" data-id="${t[0]}">${t[1]}${t[0]==='incidents'&&incidents.some(x=>x.status==='Submitted')?' ·':''}</button>`).join('')}</div>${filterHorse('medical',selected)}</div>`;
    if(tab==='records')return head+stats+tabs+card('Khám, điều trị & phục hồi',records.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Chiến mã / ngày khám</th><th>Chẩn đoán</th><th>Vị trí</th><th>Đợt điều trị</th><th></th></tr></thead><tbody>${records.slice().reverse().map(rec=>`<tr><td><strong>${E(horseName(rec.horseId))}</strong><div class="small muted">${U.date(rec.date)}</div></td><td>${E(rec.diagnosis)}</td><td>${E(regionName(rec.region))}</td><td>${badge(rec.status)}</td><td><div class="row">${B('Xem','med:record-view',{id:rec.id},'ghost','eye')}${B('Sửa','med:record-edit',{id:rec.id},'ghost','edit')}${rec.status==='Open'?B('Đóng đợt','med:record-close',{id:rec.id},'secondary','check'):''}</div></td></tr>`).join('')}</tbody></table></div>`:empty('Chưa có hồ sơ khám','Ghi nhận khám và điều trị để bắt đầu lịch sử sức khỏe.'));
    if(tab==='schedules')return head+stats+tabs+card('Không bỏ lỡ một lịch chăm sóc nào',schedules.length?schedules.map(x=>`<div class="list-item"><div class="list-main"><div class="list-title">${E(typeName(x.type))} · ${E(horseName(x.horseId))}</div><div class="list-meta">${U.date(x.date)}${x.date<U.today()&&['Planned','Pending'].includes(x.status)?' · Đã quá lịch, cần xem xét':''} ${x.notes?' · '+E(x.notes):''}</div></div><div class="list-actions">${badge(x.status)}${['Planned','Pending'].includes(x.status)?B('Hoàn thành','med:schedule-complete',{id:x.id},'secondary','check')+B('Hủy','med:schedule-cancel',{id:x.id},'ghost','x'):''}</div></div>`).join(''):empty('Chưa có lịch y tế','Thêm lịch tiêm phòng, tẩy giun hoặc kiểm tra móng.'));
    if(tab==='incidents')return head+stats+tabs+card('Báo cáo từ chuồng trại',incidents.length?incidents.slice().reverse().map(x=>`<div class="list-item"><div class="list-main"><div class="list-title">${E(horseName(x.horseId))}</div><div class="list-meta">${E(x.description)}<br>${U.date(x.date)} · ${E(x.reporter||'Nhân viên chăm sóc')}</div></div><div class="list-actions">${badge(x.status)}${B('Mở báo cáo','med:incident-view',{id:x.id},'secondary','eye')}</div></div>`).join(''):empty('Không có sự cố được báo cáo','Báo cáo từ luồng chăm sóc sẽ xuất hiện ở đây.'));
    const overview=`<div class="grid-${owner()?'3':'2'}">${list.map(h=>card(`<div class="row"><span class="horse-thumb">${R.ui.icon('horse',24)}</span><span>${E(h.name)}<span class="small muted" style="display:block">${E(h.code)} · Chuồng ${E(h.stable||'—')}</span></span></div>`,`${health(h)}<div class="detail-grid section-gap"><div><div class="detail-label">Cân nặng</div><div class="detail-value">${E(h.weight||'—')} kg</div></div><div><div class="detail-label">Sẵn sàng thi đấu</div><div class="detail-value">${h.ready===true?'Sẵn sàng':h.ready===false?'Cần đánh giá':E(h.ready||'Chờ đánh giá')}</div></div></div>${vet()?`<div class="row section-gap" style="flex-wrap:wrap">${B('Khám & cập nhật','med:record-new',{horse:h.id},'ghost','plus')}${B(R.locked(h.id)?'Đánh giá gỡ khóa':'Khóa bài nặng','med:lock',{id:h.id},R.locked(h.id)?'secondary':'ghost','shield')}${B('Xem vị trí','med:map-horse',{id:h.id},'ghost','eye')}</div>`:R.locked(h.id)?'<p class="small muted">Hạn chế y tế đang có hiệu lực. Chỉ bác sĩ được đặt hoặc gỡ khóa.</p>':''}`)).join('')}</div>`;
    if(!vet())return head+stats+tabs+overview+`<div class="alert info section-gap">${owner()?'Bạn đang xem chỉ số sức khỏe của ngựa thuộc sở hữu. Chẩn đoán, đơn thuốc và thao tác chuyên môn do bác sĩ quản lý.':'Thông tin hiển thị theo vai trò. Hồ sơ khám chi tiết và quyết định điều trị dành cho bác sĩ thú y.'}</div>`;
    const mapHorse=list.find(x=>x.id===(R.filters['medical:mapHorse']||selected))||list[0];
    return head+stats+tabs+overview+(mapHorse?`<div class="grid-2 section-gap">${card(`Bản đồ chấn thương · ${E(mapHorse.name)}`,injuryMap(mapHorse.id))}${card('Diễn biến tại vị trí được chọn',records.filter(x=>x.horseId===mapHorse.id&&regionKey(x.region)===(R.filters['medical:region']||'shoulder')).map(x=>`<div class="timeline"><strong>${U.date(x.date)}</strong><p>${E(x.diagnosis)}</p><p class="small muted">${E(x.notes||x.treatment)}</p>${B('Hồ sơ liên quan','med:record-view',{id:x.id},'ghost','arrow')}</div>`).join('')||'<p class="muted">Chọn một vùng trên mô hình để xem diễn biến. Chưa có hồ sơ tại vùng hiện tại.</p>')}</div>`:'');
  };

  R.actions['med:tab']=b=>{R.filters['medical:tab']=b.dataset.id;R.render();};
  R.actions['med:angle']=b=>{R.filters['medical:angle']=b.dataset.id;R.render();};
  R.actions['med:region']=b=>{R.filters['medical:region']=b.dataset.id;R.render();};
  R.actions['med:map-horse']=b=>{if(!vet())return;R.filters['medical:mapHorse']=b.dataset.id;R.render();setTimeout(()=>document.querySelector('svg[aria-label="Sơ đồ minh họa vị trí chấn thương trên ngựa"]')?.scrollIntoView({behavior:'smooth',block:'center'}),40);};
  R.actions['med:record-new']=b=>medicalRecordModal(null,b?.dataset.horse,b?.dataset.region);
  R.actions['med:record-edit']=b=>medicalRecordModal(b.dataset.id);
  R.actions['med:record-view']=b=>medicalRecordView(b.dataset.id);
  R.actions['med:lock']=b=>lockModal(b.dataset.id);
  R.actions['med:schedule-new']=()=>scheduleModal();
  R.actions['med:record-close']=b=>{
    if(!R.guard('medical.edit'))return;const rec=S().medicalRecords.find(x=>x.id===b.dataset.id&&canSee(x.horseId));if(!rec||rec.status!=='Open')return err('Đợt điều trị đã đóng hoặc không tồn tại.');
    R.ui.modal('Đóng đợt điều trị',`${field('Kết luận theo dõi / lý do kết thúc',area('reason','','required maxlength="1000"'))}<div class="alert info">Đóng đợt điều trị không tự gỡ khóa huấn luyện hoặc đổi trạng thái sức khỏe.</div>`,d=>{if(!R.guard('medical.edit'))return false;if(!d.reason.trim())return err('Hãy nhập kết luận theo dõi.');R.mutate(()=>{rec.status='Closed';rec.closedAt=U.now();rec.closeReason=d.reason;},`Đóng đợt điều trị · ${horseName(rec.horseId)}`);R.ui.toast('Đã đóng đợt điều trị và giữ nguyên lịch sử.');},{submitText:'Đóng đợt điều trị'});
  };
  ['complete','cancel'].forEach(action=>{R.actions[`med:schedule-${action}`]=b=>{
    if(!R.guard('medical.schedule'))return;const schedule=S().medicalSchedules.find(x=>x.id===b.dataset.id&&canSee(x.horseId));if(!schedule||!['Planned','Pending'].includes(schedule.status))return err('Lịch đã được xử lý.');
    R.ui.modal(action==='complete'?'Xác nhận đã thực hiện':'Hủy lịch y tế',action==='cancel'?field('Lý do hủy',area('reason','','required')):`<p>${E(typeName(schedule.type))} · <strong>${E(horseName(schedule.horseId))}</strong></p>${field('Ghi chú thực hiện',area('reason'))}`,d=>{if(!R.guard('medical.schedule'))return false;if(action==='cancel'&&!d.reason.trim())return err('Hãy nhập lý do hủy.');R.mutate(()=>{schedule.status=action==='complete'?'Completed':'Cancelled';schedule.completedAt=action==='complete'?U.now():null;schedule.reason=d.reason;},`${action==='complete'?'Hoàn thành':'Hủy'} lịch ${typeName(schedule.type)} · ${horseName(schedule.horseId)}`);R.ui.toast('Đã cập nhật lịch y tế.');},{submitText:action==='complete'?'Xác nhận thực hiện':'Hủy lịch'});
  };});
  R.actions['med:incident-view']=b=>incidentView(b.dataset.id);
  R.actions['med:incident-accept']=b=>{
    if(!R.guard('medical.edit'))return;const incident=S().incidents.find(x=>x.id===b.dataset.id&&canSee(x.horseId));if(!incident||incident.status!=='Submitted')return err('Báo cáo đã được tiếp nhận hoặc không tồn tại.');
    R.ui.closeModal();R.mutate(state=>{incident.status='Reviewing';incident.acceptedAt=U.now();notify(state,'Bác sĩ đã tiếp nhận sự cố',`${horseName(incident.horseId)} · Báo cáo đang được xem xét.`,'care',['groom'],incident.horseId);},`Tiếp nhận sự cố · ${horseName(incident.horseId)}`);R.ui.toast('Đã tiếp nhận báo cáo.');
  };
  R.actions['med:incident-record']=b=>{
    if(!R.guard('medical.edit'))return;const incident=S().incidents.find(x=>x.id===b.dataset.id&&canSee(x.horseId));if(!incident)return;R.ui.closeModal();medicalRecordModal(null,incident.horseId,'',incident.id);
  };
  R.actions['med:incident-close']=b=>{
    if(!R.guard('medical.edit'))return;const incident=S().incidents.find(x=>x.id===b.dataset.id&&canSee(x.horseId));if(!incident)return;R.ui.closeModal();R.ui.modal('Kết thúc xử lý sự cố',field('Kết quả xử lý',area('reason','','required maxlength="1000"')),d=>{if(!R.guard('medical.edit'))return false;if(!d.reason.trim())return err('Hãy ghi kết quả xử lý.');R.mutate(()=>{incident.status='Closed';incident.closeReason=d.reason;incident.closedAt=U.now();},`Kết thúc xử lý sự cố · ${horseName(incident.horseId)}`);R.ui.toast('Đã lưu kết quả xử lý.');},{submitText:'Kết thúc xử lý'});
  };
})();
