(function () {
  'use strict';
  const R = window.RTMS, U = R.utils, Q = R.ui;
  const esc = U.esc, B = Q.btn, I = Q.icon;
  const meals = { morning: 'Bữa sáng', noon: 'Bữa trưa', evening: 'Bữa tối' };
  const taskTypes = { feeding: 'Cho ăn', cleaning: 'Vệ sinh chuồng', bathing: 'Tắm & chăm sóc', recovery: 'Chăm sóc phục hồi' };
  const arr = (key) => R.getState()[key] || [];
  const currentUser = () => arr('users').find(x => x.role === R.role() && x.active !== false) || { id: R.role() + '-1', name: R.role() };
  const fail = text => { Q.toast(text, 'error'); return false; };
  const visible = id => R.hasHorse(id);
  const horseName = id => { const h = R.horse(id); return h ? h.name : 'Ngựa không còn khả dụng'; };
  const value = (name, fallback) => R.filters['care:' + name] || fallback || '';
  const notify = (s, title, body, roles, horseId) => {
    s.notifications.push({ id: U.uid('n'), title: title, body: body, view: 'care', roles: roles, horseId: horseId, read: false, createdAt: U.now() });
  };
  const field = (label, control) => '<label class="field"><span class="label">' + label + '</span>' + control + '</label>';
  const input = (name, val, attrs) => '<input class="input" name="' + name + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '>';
  const text = (name, val, attrs) => '<textarea class="textarea" name="' + name + '" ' + (attrs || '') + '>' + esc(val || '') + '</textarea>';
  const select = (name, options, val, attrs) => '<select class="select" name="' + name + '" ' + (attrs || '') + '>' + options.map(x => '<option value="' + esc(x[0]) + '"' + (x[0] === val ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>';
  const horseOptions = () => R.visibleHorses().filter(x => x.active !== false).map(x => [x.id, x.name + ' · ' + x.code]);
  const horseFilter = () => '<select class="select" aria-label="Lọc theo ngựa" data-filter="care:horse"><option value="all">Tất cả ngựa được phép xem</option>' + horseOptions().map(x => '<option value="' + x[0] + '"' + (value('horse', 'all') === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>';
  const filterMatch = id => visible(id) && (value('horse', 'all') === 'all' || value('horse') === id);
  const before = day => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const effectiveEnd = d => d.supersededFrom && (!d.to || before(d.supersededFrom) < d.to) ? before(d.supersededFrom) : d.to;
  const approved = d => ['Approved', 'Superseded'].includes(d.status);
  const effective = (d, day) => approved(d) && d.from <= day && (!effectiveEnd(d) || day <= effectiveEnd(d));
  const dietState = d => d.supersededFrom && d.supersededFrom <= U.today() ? 'Superseded' : d.status;
  const mealOf = t => t.meal || (arr('diets').find(d => d.id === t.dietId) || {}).meal || (t.time < '10:00' ? 'morning' : t.time < '15:00' ? 'noon' : 'evening');
  const liveDiet = t => arr('diets').filter(d => d.horseId === t.horseId && d.meal === mealOf(t) && effective(d, t.date)).sort((a,b) => b.version - a.version)[0];
  const token = d => JSON.stringify([d.id, d.version, d.revision || 0, d.status, d.from, d.to, d.items]);
  const canTask = t => R.can('task.complete') && t.assignee === currentUser().id && visible(t.horseId);
  const taskGuard = t => !!t && R.guard('task.complete') && (t.assignee === currentUser().id || fail('Công việc này không được phân công cho bạn.')) && (visible(t.horseId) || fail('Bạn không có quyền với ngựa này.'));
  const taskStatus = s => Q.badge(s);
  const dateRange = d => U.date(d.from) + ' → ' + (effectiveEnd(d) ? U.date(effectiveEnd(d)) : 'Đến khi thay thế');
  const dietSummary = d => (d.items || []).map(x => esc(x.name) + ' ' + esc(x.quantity) + ' ' + esc(x.unit)).join(' · ');
  const empty = (title, desc) => Q.empty('leaf', title, desc || 'Thử thay đổi bộ lọc để xem thêm thông tin.');
  const section = (title, desc, body, actions) => '<section class="card"><div class="card-head"><div><h2 class="card-title">' + title + '</h2>' + (desc ? '<p class="muted small">' + desc + '</p>' : '') + '</div>' + (actions || '') + '</div>' + body + '</section>';
  const rows = (heads, body) => '<div class="table-wrap"><table class="data-table"><thead><tr>' + heads.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';

  function taskList() {
    const day = value('date', U.today());
    const tasks = arr('tasks').filter(t => filterMatch(t.horseId) && t.date === day && (value('taskStatus', 'all') === 'all' || t.status === value('taskStatus')));
    const all = arr('tasks').filter(t => filterMatch(t.horseId) && t.date === day && t.status !== 'Cancelled');
    const done = all.filter(t => t.status === 'Completed').length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    const options = [['all','Tất cả trạng thái'],['Pending','Chưa thực hiện'],['Completed','Đã hoàn thành'],['Not completed','Chưa hoàn thành'],['Cancelled','Đã hủy']];
    const toolbar = '<div class="toolbar">' + horseFilter() + '<input class="input" type="date" aria-label="Ngày chăm sóc" value="' + esc(day) + '" data-filter="care:date"><select class="select" aria-label="Trạng thái công việc" data-filter="care:taskStatus">' + options.map(x => '<option value="' + x[0] + '"' + (value('taskStatus', 'all') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>';
    const progress = '<div class="card-body"><div class="row"><span class="small muted">Tiến độ công việc · ' + U.date(day) + '</span><strong>' + done + '/' + all.length + ' đã hoàn thành</strong></div><div class="progress-track" style="margin-top:12px"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';
    const body = tasks.sort((a,b) => a.time.localeCompare(b.time)).map(t => {
      const d = t.status === 'Completed' ? arr('diets').find(x => x.id === t.dietId) : liveDiet(t);
      const feeding = t.type === 'feeding' ? '<div class="small ' + (d ? 'muted' : '') + '" style="' + (d ? '' : 'color:var(--danger,#a94d3e)') + '">' + (d ? meals[mealOf(t)] + ' · Khẩu phần v' + d.version : 'Chưa có khẩu phần hợp lệ · Chặn cho ăn') + '</div>' : '';
      const staff = arr('users').find(x => x.id === t.assignee);
      let actions = B('Chi tiết', 'care:taskView', {id:t.id}, 'ghost', 'eye');
      if (canTask(t) && ['Pending','Not completed'].includes(t.status)) {
        if (t.type !== 'feeding' || d) actions += B('Hoàn thành', 'care:complete', {id:t.id}, 'secondary', 'check');
        actions += B('Báo chưa làm', 'care:incomplete', {id:t.id}, 'ghost');
      }
      return '<tr><td><strong>' + esc(t.time) + '</strong></td><td><div class="list-title">' + esc(t.title) + '</div><div class="small muted">' + esc(taskTypes[t.type] || t.type) + '</div></td><td><strong>' + esc(horseName(t.horseId)) + '</strong>' + feeding + '</td><td>' + esc(staff ? staff.name : t.assignee) + '</td><td>' + taskStatus(t.status) + '</td><td><div class="row" style="flex-wrap:wrap">' + actions + '</div></td></tr>';
    }).join('');
    return section('Nhịp chăm sóc trong ngày', 'Mỗi bữa ăn gắn với một phiên bản khẩu phần đã được bác sĩ duyệt.', toolbar + progress + (body ? rows(['Giờ','Công việc','Ngựa & dinh dưỡng','Phụ trách','Trạng thái',''],body) : empty('Chưa có công việc trong ngày này')), R.allowed('trainer','manager') ? B('Thêm công việc','care:taskNew',{},'secondary','plus') : '');
  }

  function dietList() {
    const diets = arr('diets').filter(d => filterMatch(d.horseId) && (value('dietStatus','all') === 'all' || dietState(d) === value('dietStatus'))).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const options = [['all','Tất cả phiên bản'],['Approved','Đã duyệt'],['Pending review','Chờ bác sĩ duyệt'],['Draft','Bản nháp'],['Returned','Trả lại'],['Superseded','Đã thay thế']];
    const toolbar = '<div class="toolbar">' + horseFilter() + '<select class="select" aria-label="Trạng thái khẩu phần" data-filter="care:dietStatus">' + options.map(x => '<option value="' + x[0] + '"' + (value('dietStatus','all') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>';
    const body = diets.map(d => {
      let actions = B('Xem phiên bản','care:dietView',{id:d.id},'ghost','eye');
      if (R.can('diet.edit')) {
        if (['Draft','Returned','Pending review'].includes(d.status)) actions += B('Chỉnh sửa','care:dietEdit',{id:d.id},'secondary','edit');
        else actions += B('Điều chỉnh','care:dietEdit',{id:d.id},'secondary','plus');
        if (['Draft','Returned'].includes(d.status)) actions += B('Gửi duyệt','care:dietSubmit',{id:d.id},'secondary','arrow');
      }
      if (R.can('diet.approve') && d.status === 'Pending review') actions += B('Xem xét','care:dietReview',{id:d.id},'primary','shield');
      return '<tr><td><strong>' + esc(horseName(d.horseId)) + '</strong><div class="small muted">' + meals[d.meal] + '</div></td><td><strong>Phiên bản ' + d.version + '</strong><div class="small muted">' + esc((d.items || []).length) + ' thành phần</div></td><td><div class="small">' + esc(dateRange(d)) + '</div>' + (effective(d,U.today()) ? '<div class="small" style="color:var(--green,#27634b)">Đang áp dụng hôm nay</div>' : '') + '</td><td>' + Q.badge(dietState(d)) + (d.reason ? '<div class="small muted">' + esc(d.reason) + '</div>' : '') + '</td><td><div class="row" style="flex-wrap:wrap">' + actions + '</div></td></tr>';
    }).join('');
    return '<div class="alert info">' + I('shield') + '<div><strong>Rõ phiên bản, đúng bữa ăn.</strong><div class="small">HLV lập khẩu phần → bác sĩ duyệt → nhân viên thực hiện. Điều chỉnh khẩu phần đã duyệt sẽ tạo phiên bản mới; bữa đã hoàn thành luôn giữ lịch sử.</div></div></div>' + section('Khẩu phần & lịch sử duyệt','Phiên bản đã duyệt có thể bắt đầu trong tương lai.',toolbar + (body ? rows(['Ngựa / bữa','Phiên bản','Hiệu lực','Trạng thái',''],body) : empty('Chưa có khẩu phần phù hợp')), R.can('diet.edit') ? B('Lập khẩu phần','care:dietNew',{},'primary','plus') : '');
  }

  function supplyList() {
    const incidents = arr('incidents').filter(x => filterMatch(x.horseId)).slice().reverse();
    const requests = arr('requests').slice().reverse();
    const materials = arr('supplies').filter(x => x.active !== false);
    const incidentsBody = incidents.map(x => '<div class="list-item"><div class="list-main"><div class="list-title">' + esc(horseName(x.horseId)) + ' ' + Q.badge(x.status) + '</div><p>' + esc(x.description) + '</p><div class="list-meta">' + U.date(x.date) + ' · ' + esc(x.reporter || 'Nhân viên chăm sóc') + '</div>' + (x.image ? '<div class="small muted">Có hình ảnh / thông tin tệp đính kèm</div>' : '') + '</div><div class="list-actions">' + B('Xem','care:incidentView',{id:x.id},'ghost','eye') + (R.can('medical.edit') && x.status !== 'Closed' ? B(x.status === 'Submitted' ? 'Tiếp nhận' : 'Đóng sự cố','care:incidentState',{id:x.id},'secondary') : '') + '</div></div>').join('');
    const requestRows = requests.map(x => '<tr><td><strong>' + esc(x.itemName) + '</strong><div class="small muted">' + esc(x.reason) + '</div></td><td>' + esc(x.quantity) + ' ' + esc(x.unit) + '</td><td>' + Q.badge(x.status) + '</td><td>' + (R.can('catalog.manage') && x.status !== 'Closed' ? B(x.status === 'Submitted' ? 'Tiếp nhận' : 'Đóng đề xuất','care:requestState',{id:x.id},'secondary') : '<span class="small muted">' + esc(x.closeComment || 'Theo dõi trong ứng dụng') + '</span>') + '</td></tr>').join('');
    const materialRows = materials.map(x => '<tr><td><strong>' + esc(x.name) + '</strong></td><td>' + esc({Feed:'Thức ăn',Medicine:'Y tế',Equipment:'Dụng cụ'}[x.type] || x.type) + '</td><td>' + esc(x.unit) + '</td><td>' + esc(x.area || 'Toàn CLB') + '</td></tr>').join('');
    const usage = arr('usage').filter(x => filterMatch(x.horseId)).slice().reverse().slice(0,20);
    const usageRows = usage.map(x => '<tr><td>' + esc(horseName(x.horseId)) + '</td><td>' + esc(x.itemName) + '</td><td>' + esc(x.quantity) + ' ' + esc(x.unit) + '</td><td><span class="small">' + U.date(x.date) + '</span><div class="small muted">Nguồn: ' + esc(x.sourceId) + '</div></td></tr>').join('');
    return '<div class="toolbar">' + horseFilter() + '</div><div class="grid-2">' +
      section('Theo dõi sự cố', 'Dấu hiệu thực tế để bác sĩ tiếp nhận và đánh giá.', incidentsBody || empty('Chưa có sự cố'),R.can('incident.create') ? B('Báo sự cố','care:incidentNew',{},'secondary','plus') : '') +
      section('Đề xuất bổ sung','Quản lý CLB tiếp nhận và ghi kết quả xử lý.',requestRows ? rows(['Vật tư','Số lượng','Trạng thái',''],requestRows) : empty('Chưa có đề xuất'),R.can('supplies.request') ? B('Tạo đề xuất','care:requestNew',{},'secondary','plus') : '') + '</div><div class="section-gap"></div>' +
      section('Danh mục vật tư','Danh sách sử dụng trong công việc; không phải số dư kho hay đơn mua hàng.',materialRows ? rows(['Vật tư','Nhóm','Đơn vị','Khu vực'],materialRows) : empty('Chưa có vật tư')) +
      '<div class="section-gap"></div>' + section('Lượng sử dụng gần đây','Ghi nhận thực tế theo công việc / điều trị. Quản lý đối chiếu chi phí tại mục Tài chính.',usageRows ? rows(['Ngựa','Vật tư','Lượng thực tế','Ngày / nguồn'],usageRows) : empty('Chưa có ghi nhận sử dụng'));
  }

  R.pages.care = function () {
    const tab = R.role() === 'owner' && value('tab','tasks') === 'supplies' ? 'tasks' : value('tab','tasks');
    const tasks = arr('tasks').filter(t => visible(t.horseId) && t.date === U.today());
    const pending = tasks.filter(t => t.status === 'Pending').length, complete = tasks.filter(t => t.status === 'Completed').length;
    const waiting = arr('diets').filter(d => visible(d.horseId) && d.status === 'Pending review').length;
    const stat = (label,num,meta,icon) => '<div class="stat-card"><div class="stat-label">' + I(icon) + ' ' + label + '</div><div class="stat-value">' + num + '</div><div class="stat-meta">' + meta + '</div></div>';
    return '<div class="page-head"><div><div class="label">CHĂM SÓC & DINH DƯỠNG</div><h1 class="page-title">Từng chi tiết, mỗi ngày</h1><p class="page-subtitle">Chăm sóc có kế hoạch. Dinh dưỡng có kiểm duyệt. Lịch sử luôn rõ ràng.</p></div><div class="page-actions">' + (R.can('incident.create') ? B('Báo sự cố','care:incidentNew',{},'secondary','plus') : '') + '</div></div><div class="stats-row">' +
      stat('Công việc còn chờ',pending,'Trong ngày ' + U.date(U.today()),'clock') + stat('Đã chăm sóc',complete,'Công việc đã xác nhận','check') + stat('Khẩu phần chờ duyệt',waiting,'Đúng phiên bản trước khi áp dụng','leaf') + '</div>' +
      '<div class="tabs" role="tablist" aria-label="Chăm sóc"><button class="tab ' + (tab === 'tasks' ? 'active' : '') + '" data-action="care:tab" data-tab="tasks" role="tab" aria-selected="' + (tab==='tasks') + '">Công việc hôm nay</button><button class="tab ' + (tab==='diets'?'active':'') + '" data-action="care:tab" data-tab="diets" role="tab" aria-selected="' + (tab==='diets') + '">Khẩu phần dinh dưỡng</button><button class="tab ' + (tab==='supplies'?'active':'') + '"' + (R.role()==='owner'?' disabled aria-disabled="true" title="Dành cho nhân sự CLB"':'') + ' data-action="care:tab" data-tab="supplies" role="tab" aria-selected="' + (tab==='supplies') + '">Vật tư & sự cố</button></div>' +
      (tab === 'diets' ? dietList() : tab === 'supplies' ? supplyList() : taskList());
  };
  R.actions['care:tab'] = b => { R.filters['care:tab'] = b.dataset.tab; R.render(); };

  function dietDetail(d) {
    return '<div class="detail-grid"><div><div class="detail-label">Ngựa</div><div class="detail-value">' + esc(horseName(d.horseId)) + '</div></div><div><div class="detail-label">Bữa / phiên bản</div><div class="detail-value">' + meals[d.meal] + ' · v' + d.version + '</div></div><div><div class="detail-label">Hiệu lực</div><div class="detail-value">' + esc(dateRange(d)) + '</div></div><div><div class="detail-label">Trạng thái</div>' + Q.badge(dietState(d)) + '</div></div><div class="section-gap"></div>' + rows(['Thành phần','Khối lượng','Đơn vị'],(d.items || []).map(x => '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.quantity) + '</td><td>' + esc(x.unit) + '</td></tr>').join('')) + '<p class="small muted">Người lập: ' + esc(d.author || 'HLV trưởng') + ' · Người duyệt: ' + esc(d.reviewer || 'Chưa có') + '</p>' + (d.reason ? '<div class="alert info">' + esc(d.reason) + '</div>' : '');
  }
  R.actions['care:dietView'] = b => { const d=arr('diets').find(x=>x.id===b.dataset.id); if(d && visible(d.horseId)) Q.modal('Khẩu phần dinh dưỡng · v'+d.version,dietDetail(d),null,{wide:true}); };
  function itemFields(item,index) {
    return '<div class="form-grid" data-diet-line="' + index + '">' + field('Thành phần ' + (index+1),input('itemName_'+index,item.name,'maxlength="100" placeholder="Ví dụ: Yến mạch"')) + field('Số lượng',input('itemQty_'+index,item.quantity,'type="number" min="0.001" max="9999" step="0.001"')) + field('Đơn vị',select('itemUnit_'+index,[['kg','kg'],['g','g'],['lít','lít'],['ml','ml'],['phần','phần']],item.unit || 'kg')) + '</div>';
  }
  R.actions['care:addItem'] = b => { const wrap=b.closest('form').querySelector('[data-diet-items]'); const i=wrap.querySelectorAll('[data-diet-line]').length; if(i>=10)return fail('Tối đa 10 thành phần cho mỗi phiên bản.'); wrap.insertAdjacentHTML('beforeend',itemFields({},i)); };
  function dietEditor(id) {
    if(!R.guard('diet.edit')) return;
    const prior=id && arr('diets').find(x=>x.id===id);
    if(prior && !visible(prior.horseId)) return fail('Không có quyền với ngựa này.');
    const editing=prior && ['Draft','Returned','Pending review'].includes(prior.status);
    const expected=prior ? token(prior) : null;
    const d=prior || {horseId:horseOptions()[0] && horseOptions()[0][0],meal:'morning',from:U.today(),to:'',items:[{}]};
    const body='<div class="alert info"><div>'+(editing?'Chỉnh sửa sẽ đưa phiên bản về bản nháp và yêu cầu gửi duyệt lại.':'Khẩu phần mới phải được bác sĩ duyệt trước khi cho ăn. Điều chỉnh bản đã duyệt sẽ tạo phiên bản mới.')+'</div></div><div class="form-grid">'+field('Ngựa',select('horseId',horseOptions(),d.horseId,'required'))+field('Bữa ăn',select('meal',Object.entries(meals),d.meal,'required'))+field('Từ ngày',input('from',editing?d.from:(prior?U.addDays(1):U.today()),'type="date" required min="'+U.today()+'"'))+field('Đến ngày (không bắt buộc)',input('to',editing?d.to:'','type="date"'))+'</div><div class="form-section"><h3>Thành phần khẩu phần</h3><div data-diet-items>'+((d.items||[]).length?d.items:[{}]).map(itemFields).join('')+'</div>'+B('Thêm thành phần','care:addItem',{},'ghost','plus')+'</div>'+field('Ghi chú',text('note',d.note,'maxlength="2000"'))+field('Sau khi lưu',select('saveAs',[['Draft','Lưu bản nháp'],['Pending review','Gửi bác sĩ duyệt']],'Draft'));
    Q.modal(editing?'Chỉnh sửa khẩu phần':'Lập phiên bản khẩu phần',body,(data,form)=>{
      if(!R.guard('diet.edit')) return false;
      if(!visible(data.horseId)) return fail('Ngựa ngoài phạm vi được phép.');
      if(data.from<U.today())return fail('Phiên bản mới cần bắt đầu từ hôm nay hoặc tương lai.');
      if(data.to && data.to<data.from)return fail('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
      const items=[];
      for(let i=0;i<10;i++){const name=(data['itemName_'+i]||'').trim(),raw=data['itemQty_'+i]; if(!name && !raw)continue; const n=Number(raw); if(!name||!raw||!(n>0)||!Number.isFinite(n)) return fail('Mỗi thành phần cần tên và lượng lớn hơn 0.'); items.push({name:name,quantity:n,unit:data['itemUnit_'+i]||'kg'});}
      if(!items.length)return fail('Cần ít nhất một thành phần.');
      if(editing && (data.horseId!==prior.horseId||data.meal!==prior.meal))return fail('Để đổi ngựa hoặc bữa ăn, hãy lập một khẩu phần mới.'); if(editing){const live=arr('diets').find(x=>x.id===prior.id);if(!live||token(live)!==expected)return fail('Phiên bản đã thay đổi. Đóng và mở lại để chỉnh sửa.');}
      R.mutate(s=>{
        let target=editing?s.diets.find(x=>x.id===prior.id):null;
        if(!target){target={id:U.uid('diet'),version:Math.max(0,...s.diets.filter(x=>x.horseId===data.horseId&&x.meal===data.meal).map(x=>x.version))+1,createdAt:U.now()};s.diets.push(target);}
        Object.assign(target,{horseId:data.horseId,meal:data.meal,from:data.from,to:data.to||'',items:items,status:data.saveAs,author:currentUser().name,reviewer:'',reason:'',note:(data.note||'').trim(),revision:(target.revision||0)+1});
        if(data.saveAs==='Pending review')notify(s,'Khẩu phần cần xem xét',horseName(data.horseId)+' · '+meals[data.meal]+' · v'+target.version,['vet'],data.horseId);
      },(editing?'Chỉnh sửa':'Tạo')+' khẩu phần '+horseName(data.horseId));
      Q.toast(data.saveAs==='Pending review'?'Đã gửi bác sĩ duyệt đúng phiên bản.':'Đã lưu bản nháp.');
    },{wide:true,submitText:'Lưu khẩu phần'});
  }
  R.actions['care:dietNew']=()=>dietEditor();
  R.actions['care:dietEdit']=b=>dietEditor(b.dataset.id);
  R.actions['care:dietSubmit']=b=>{
    if(!R.guard('diet.edit'))return;const d=arr('diets').find(x=>x.id===b.dataset.id);
    if(!d||!visible(d.horseId)||!['Draft','Returned'].includes(d.status))return fail('Phiên bản không còn ở trạng thái gửi duyệt.');
    if(!(d.items||[]).length)return fail('Khẩu phần cần có thành phần trước khi gửi.');
    R.mutate(s=>{const target=s.diets.find(x=>x.id===d.id);target.status='Pending review';target.revision=(target.revision||0)+1;notify(s,'Khẩu phần chờ duyệt',horseName(d.horseId)+' · v'+d.version,['vet'],d.horseId);},'Gửi duyệt khẩu phần v'+d.version);
    Q.toast('Đã chuyển bác sĩ xem xét.');
  };
  R.actions['care:dietReview']=b=>{
    if(!R.guard('diet.approve'))return;const d=arr('diets').find(x=>x.id===b.dataset.id);
    if(!d||!visible(d.horseId)||d.status!=='Pending review')return fail('Phiên bản không còn chờ duyệt.');
    const expected=token(d);
    Q.modal('Xem xét khẩu phần · v'+d.version,dietDetail(d)+'<div class="divider"></div>'+field('Quyết định',select('decision',[['Approved','Duyệt phiên bản này'],['Returned','Trả lại để chỉnh sửa']],'Approved'))+field('Lý do / nhận xét',text('reason','','maxlength="500" placeholder="Bắt buộc khi trả lại"'))+'<div class="alert warning"><div>Khi bản mới bắt đầu, phiên bản cũ cùng bữa sẽ kết thúc hiệu lực. Bữa đã hoàn thành vẫn giữ phiên bản cũ.</div></div>',data=>{
      if(!R.guard('diet.approve'))return false;
      const live=arr('diets').find(x=>x.id===d.id);
      if(!live||token(live)!==expected||live.status!=='Pending review')return fail('Phiên bản đã thay đổi trong lúc xem xét. Vui lòng mở lại bản hiện tại.');
      if(data.decision==='Returned'&&!data.reason.trim())return fail('Cần lý do trả lại.');
      if(data.decision==='Approved'){
        if(d.from<U.today())return fail('Ngày bắt đầu đã qua. Hãy trả lại để HLV cập nhật ngày.');
        const blockers=arr('diets').filter(x=>x.id!==d.id&&x.horseId===d.horseId&&x.meal===d.meal&&approved(x)&&x.from<= (d.to||'9999-12-31')&&(!effectiveEnd(x)||effectiveEnd(x)>=d.from)&&x.from>=d.from);
        if(blockers.length)return fail('Trùng với phiên bản đã duyệt cùng ngày hoặc trong tương lai. Cần điều chỉnh khoảng hiệu lực trước.');
      }
      R.mutate(s=>{
        const target=s.diets.find(x=>x.id===d.id);
        if(data.decision==='Approved'){
          s.diets.filter(x=>x.id!==d.id&&x.horseId===d.horseId&&x.meal===d.meal&&approved(x)&&x.from<d.from&&(!effectiveEnd(x)||effectiveEnd(x)>=d.from)).forEach(x=>{
            x.effectiveHistory=x.effectiveHistory||[];x.effectiveHistory.push({replacedFrom:d.from,by:target.id,time:U.now()});x.supersededFrom=d.from;
            if(d.from<=U.today())x.status='Superseded';
          });
        }
        target.status=data.decision;target.reviewer=currentUser().name;target.reason=data.reason.trim();target.reviewedAt=U.now();target.revision=(target.revision||0)+1;
        notify(s,data.decision==='Approved'?'Khẩu phần đã được duyệt':'Khẩu phần cần điều chỉnh',horseName(d.horseId)+' · '+meals[d.meal]+' · v'+d.version,['trainer','groom'],d.horseId);
      },(data.decision==='Approved'?'Duyệt':'Trả lại')+' khẩu phần '+horseName(d.horseId)+' v'+d.version);
      Q.toast(data.decision==='Approved'?'Đã duyệt. Hệ thống áp dụng đúng khoảng hiệu lực.':'Đã trả lại HLV kèm lý do.');
    },{wide:true,submitText:'Xác nhận quyết định'});
  };

  R.actions['care:taskNew']=()=>{
    if(!R.allowed('trainer','manager'))return fail('Chỉ HLV hoặc quản lý được phân công công việc.');
    if(!R.guard(R.role()==='trainer'?'training.edit':'horse.edit'))return;
    Q.modal('Thêm công việc chăm sóc','<div class="form-grid">'+field('Ngựa',select('horseId',horseOptions(),'','required'))+field('Loại công việc',select('type',Object.entries(taskTypes),'feeding'))+field('Ngày',input('date',U.today(),'type="date" required'))+field('Giờ',input('time','06:30','type="time" required'))+field('Người thực hiện',select('assignee',arr('users').filter(x=>x.role==='groom'&&x.active!==false).map(x=>[x.id,x.name]),'groom-1','required'))+field('Bữa ăn (nếu cho ăn)',select('meal',Object.entries(meals),'morning'))+'</div>'+field('Tên công việc',input('title','','required maxlength="100" placeholder="Ví dụ: Cho ăn sau buổi tập"')),data=>{
      if(!R.allowed('trainer','manager')||!R.guard(R.role()==='trainer'?'training.edit':'horse.edit'))return false;
      if(!visible(data.horseId))return fail('Ngựa không hợp lệ.');
      R.mutate(s=>{const t={id:U.uid('task'),horseId:data.horseId,title:data.title.trim(),type:data.type,date:data.date,time:data.time,assignee:data.assignee,status:'Pending',meal:data.meal,createdAt:U.now()};if(t.type==='feeding'){const d=liveDiet(t);t.dietId=d?d.id:null;}s.tasks.push(t);notify(s,'Công việc chăm sóc mới',horseName(t.horseId)+' · '+t.title,['groom'],t.horseId);},'Phân công chăm sóc '+horseName(data.horseId));
      Q.toast('Đã thêm công việc. Bữa ăn được kiểm tra khẩu phần trước khi thực hiện.');
    },{submitText:'Phân công'});
  };
  R.actions['care:taskView']=b=>{
    const t=arr('tasks').find(x=>x.id===b.dataset.id);if(!t||!visible(t.horseId))return fail('Không thể xem công việc này.');
    const d=t.status==='Completed'?arr('diets').find(x=>x.id===t.dietId):liveDiet(t);
    const used=arr('usage').filter(x=>x.sourceId===t.id);
    Q.modal(t.title,'<div class="detail-grid"><div><div class="detail-label">Ngựa</div><strong>'+esc(horseName(t.horseId))+'</strong></div><div><div class="detail-label">Lịch</div>'+U.date(t.date)+' · '+esc(t.time)+'</div><div><div class="detail-label">Trạng thái</div>'+Q.badge(t.status)+'</div><div><div class="detail-label">Ghi nhận</div>'+esc(t.completedAt?new Date(t.completedAt).toLocaleString('vi-VN'):t.note||'Chưa thực hiện')+'</div></div>'+(t.type==='feeding'?'<div class="section-gap"></div>'+(d?dietDetail(d):'<div class="alert warning">Chưa có khẩu phần đã duyệt còn hiệu lực. Không được xác nhận cho ăn.</div>'):'')+(used.length?'<h3>Lượng thực tế đã ghi nhận</h3><p>'+used.map(x=>esc(x.itemName)+': '+esc(x.quantity)+' '+esc(x.unit)).join('<br>')+'</p>':''),null,{wide:true});
  };
  R.actions['care:complete']=b=>{
    const t=arr('tasks').find(x=>x.id===b.dataset.id);if(!taskGuard(t))return;
    if(t.status==='Completed')return Q.toast('Công việc này đã được xác nhận trước đó.','info');
    if(!['Pending','Not completed'].includes(t.status))return fail('Công việc không thể hoàn thành ở trạng thái này.');
    const d=t.type==='feeding'?liveDiet(t):null;
    if(t.type==='feeding'&&!d)return fail('Chưa có khẩu phần đã duyệt còn hiệu lực. Không thể xác nhận cho ăn.');
    let body='<div class="alert info"><div><strong>'+esc(horseName(t.horseId))+'</strong> · '+esc(t.title)+'<div class="small">'+U.date(t.date)+' · '+esc(t.time)+'</div></div></div>';
    if(d)body+='<p><strong>'+meals[d.meal]+' · Khẩu phần v'+d.version+'</strong></p>'+(d.items||[]).map((x,i)=>'<div class="form-grid">'+field(esc(x.name)+' · lượng thực tế',input('qty_'+i,x.quantity,'type="number" min="0.001" max="9999" step="0.001" required'))+'<div class="field"><span class="label">Đơn vị</span><strong>'+esc(x.unit)+'</strong></div></div>').join('');
    else body+='<div class="form-grid">'+field('Vật tư sử dụng (không bắt buộc)',select('supply',[['','Không ghi nhận vật tư']].concat(arr('supplies').filter(x=>x.active!==false).map(x=>[x.id,x.name+' · '+x.unit])),''))+field('Lượng thực tế',input('quantity','','type="number" min="0.001" max="9999" step="0.001"'))+'</div>';
    body+=field('Ghi chú',text('note','','maxlength="2000"'));
    Q.modal('Xác nhận hoàn thành',body,data=>{
      const live=arr('tasks').find(x=>x.id===t.id);if(!taskGuard(live))return false;
      if(live.status==='Completed'){Q.toast('Đã được ghi nhận. Không tạo thêm lượt hoàn thành.','info');return;}
      if(!['Pending','Not completed'].includes(live.status))return fail('Trạng thái công việc đã thay đổi.');
      const current=live.type==='feeding'?liveDiet(live):null;
      if(live.type==='feeding'&&(!current||current.id!==d.id))return fail('Khẩu phần áp dụng đã thay đổi. Vui lòng mở lại để kiểm tra.');
      const uses=[];
      if(current){for(let i=0;i<current.items.length;i++){const n=Number(data['qty_'+i]);if(!(n>0)||!Number.isFinite(n))return fail('Lượng thực tế cần lớn hơn 0.');uses.push({itemName:current.items[i].name,quantity:n,unit:current.items[i].unit});}}
      else if(data.supply){const supply=arr('supplies').find(x=>x.id===data.supply&&x.active!==false);const n=Number(data.quantity);if(!supply||!(n>0)||!Number.isFinite(n))return fail('Chọn vật tư và lượng sử dụng lớn hơn 0.');uses.push({itemName:supply.name,quantity:n,unit:supply.unit,supplyId:supply.id});}
      R.mutate(s=>{const target=s.tasks.find(x=>x.id===t.id);target.status='Completed';target.completedAt=U.now();target.note=(data.note||'').trim();if(current)target.dietId=current.id;uses.forEach(x=>s.usage.push(Object.assign({id:U.uid('usage'),horseId:t.horseId,sourceId:t.id,date:t.date,recordedBy:currentUser().id},x)));},'Hoàn thành chăm sóc '+horseName(t.horseId)+' · '+t.title);
      Q.toast('Đã ghi nhận hoàn thành và lượng sử dụng thực tế.');
    },{submitText:'Xác nhận hoàn thành'});
  };
  R.actions['care:incomplete']=b=>{
    const t=arr('tasks').find(x=>x.id===b.dataset.id);if(!taskGuard(t))return;
    if(!['Pending','Not completed'].includes(t.status))return fail('Không thể sửa trạng thái công việc này.');
    Q.modal('Ghi nhận chưa hoàn thành','<p><strong>'+esc(horseName(t.horseId))+'</strong> · '+esc(t.title)+'</p>'+field('Lý do',text('reason','','required maxlength="500" placeholder="Ví dụ: Vật tư chưa đủ, ngựa cần được bác sĩ kiểm tra…"')),data=>{
      const live=arr('tasks').find(x=>x.id===t.id);if(!taskGuard(live))return false;if(live.status==='Completed')return fail('Công việc đã hoàn thành. Không thể ghi đè.');
      if(!data.reason.trim())return fail('Cần ghi rõ lý do.');
      R.mutate(s=>{const target=s.tasks.find(x=>x.id===t.id);target.status='Not completed';target.note=data.reason.trim();notify(s,'Công việc chưa hoàn thành',horseName(t.horseId)+' · '+data.reason.trim(),['trainer','manager'],t.horseId);},'Báo chăm sóc chưa hoàn thành '+horseName(t.horseId));
      Q.toast('Đã ghi lý do và thông báo người phụ trách.');
    },{submitText:'Gửi ghi nhận'});
  };

  R.actions['care:incidentNew']=()=>{
    if(!R.guard('incident.create'))return;
    Q.modal('Báo sự cố chăm sóc','<div class="alert info"><div>Báo dấu hiệu quan sát được; bác sĩ sẽ đánh giá chuyên môn.</div></div>'+field('Ngựa',select('horseId',horseOptions(),'','required'))+field('Dấu hiệu / sự cố',text('description','','required maxlength="2000" placeholder="Mô tả điều bạn quan sát và thời điểm…"'))+field('Hình ảnh (không bắt buộc)','<input class="input" type="file" name="image" accept="image/jpeg,image/png">')+'<p class="small muted">Ảnh tối đa 10 MB. Bản mẫu lưu thông tin tệp; ảnh đến 1 MB có bản xem trước tại trình duyệt.</p>',async(data,form)=>{
      if(!R.guard('incident.create'))return false;if(!visible(data.horseId))return fail('Ngựa ngoài phân công của bạn.');if(!data.description.trim())return fail('Cần mô tả sự cố.');
      const file=form.elements.image.files[0];let image=null;
      if(file){if(!['image/jpeg','image/png'].includes(file.type)||file.size>10000000)return fail('Chọn ảnh JPG/PNG tối đa 10 MB.');image=await U.fileMeta(file);}
      if(!R.guard('incident.create')||!visible(data.horseId))return false;
      R.mutate(s=>{s.incidents.push({id:U.uid('incident'),horseId:data.horseId,date:U.today(),occurredAt:U.now(),description:data.description.trim(),image:image,status:'Submitted',reporter:currentUser().name});notify(s,'Có báo cáo sự cố mới',horseName(data.horseId)+' · '+data.description.trim(),['vet','trainer','manager'],data.horseId);},'Báo sự cố '+horseName(data.horseId));
      Q.toast('Đã gửi sự cố để bác sĩ tiếp nhận.');
    },{submitText:'Gửi báo cáo'});
  };
  R.actions['care:incidentView']=b=>{
    const x=arr('incidents').find(i=>i.id===b.dataset.id);if(!x||!visible(x.horseId))return fail('Không thể xem báo cáo này.');
    const image=x.image;const preview=image&&(image.preview|| (typeof image==='string'&&image.startsWith('data:image/')?image:''));
    Q.modal('Báo cáo sự cố · '+horseName(x.horseId),Q.badge(x.status)+'<p>'+esc(x.description)+'</p><p class="small muted">'+U.date(x.date)+' · '+esc(x.reporter)+'</p>'+(preview?'<img src="'+esc(preview)+'" alt="Hình ảnh sự cố do nhân viên gửi" style="max-width:100%;max-height:360px;object-fit:contain;border-radius:12px">':'')+(image&&typeof image==='object'?'<p class="small muted">'+esc(image.name)+' · '+Math.ceil(image.size/1000)+' KB'+(!preview?' · Chỉ lưu thông tin tệp trong bản mẫu':'')+'</p>':'')+(x.closeNote?'<div class="alert info">'+esc(x.closeNote)+'</div>':''),null,{wide:true});
  };
  R.actions['care:incidentState']=b=>{
    if(!R.guard('medical.edit'))return;const x=arr('incidents').find(i=>i.id===b.dataset.id);if(!x||!visible(x.horseId)||x.status==='Closed')return fail('Báo cáo không còn khả dụng.');
    const next=x.status==='Submitted'?'Reviewing':'Closed', expected=x.status;
    Q.modal(next==='Reviewing'?'Tiếp nhận sự cố':'Đóng sự cố','<p><strong>'+esc(horseName(x.horseId))+'</strong> · '+esc(x.description)+'</p>'+field('Ghi nhận xử lý',text('note','','maxlength="1000"'+(next==='Closed'?' required':''))),data=>{
      if(!R.guard('medical.edit'))return false;const live=arr('incidents').find(i=>i.id===x.id);if(!live||live.status!==expected)return fail('Trạng thái đã thay đổi. Hãy mở lại.');
      if(next==='Closed'&&!data.note.trim())return fail('Cần ghi kết quả xử lý.');
      R.mutate(s=>{const target=s.incidents.find(i=>i.id===x.id);target.status=next;target.receivingVet=currentUser().name;target.closeNote=(data.note||'').trim();},(next==='Reviewing'?'Tiếp nhận':'Đóng')+' sự cố '+horseName(x.horseId));
      Q.toast('Đã cập nhật báo cáo. Hồ sơ khám được quản lý tại mục Y tế.');
    },{submitText:'Xác nhận'});
  };
  R.actions['care:requestNew']=()=>{
    if(!R.guard('supplies.request'))return;
    Q.modal('Đề xuất bổ sung vật tư','<div class="form-grid">'+field('Vật tư',select('supplyId',arr('supplies').filter(x=>x.active!==false).map(x=>[x.id,x.name+' · '+x.unit]),'','required'))+field('Số lượng',input('quantity','','type="number" min="0.001" max="9999" step="0.001" required'))+'</div>'+field('Lý do / khu vực',text('reason','','required maxlength="500"')),data=>{
      if(!R.guard('supplies.request'))return false;const item=arr('supplies').find(x=>x.id===data.supplyId&&x.active!==false),n=Number(data.quantity);if(!item||!(n>0)||!Number.isFinite(n)||!data.reason.trim())return fail('Cần vật tư, lượng lớn hơn 0 và lý do.');
      R.mutate(s=>{s.requests.push({id:U.uid('request'),supplyId:item.id,itemName:item.name,quantity:n,unit:item.unit,reason:data.reason.trim(),area:item.area,requestedBy:currentUser().id,status:'Submitted',date:U.today()});notify(s,'Đề xuất vật tư mới',item.name+' · '+n+' '+item.unit,['manager']);},'Đề xuất bổ sung '+item.name);
      Q.toast('Đã chuyển đề xuất cho quản lý CLB.');
    },{submitText:'Gửi đề xuất'});
  };
  R.actions['care:requestState']=b=>{
    if(!R.guard('catalog.manage'))return;const x=arr('requests').find(i=>i.id===b.dataset.id);if(!x||x.status==='Closed')return fail('Đề xuất đã đóng hoặc không tồn tại.');
    const next=x.status==='Submitted'?'Acknowledged':'Closed',expected=x.status;
    Q.modal(next==='Acknowledged'?'Tiếp nhận đề xuất':'Đóng đề xuất','<p><strong>'+esc(x.itemName)+'</strong> · '+esc(x.quantity)+' '+esc(x.unit)+'</p><p>'+esc(x.reason)+'</p>'+field('Ghi chú xử lý',text('note','','maxlength="500"'+(next==='Closed'?' required':''))),data=>{
      if(!R.guard('catalog.manage'))return false;const live=arr('requests').find(i=>i.id===x.id);if(!live||live.status!==expected)return fail('Đề xuất đã thay đổi.');
      if(next==='Closed'&&!data.note.trim())return fail('Cần ghi kết quả xử lý trước khi đóng.');
      R.mutate(s=>{const target=s.requests.find(i=>i.id===x.id);target.status=next;target.closeComment=(data.note||'').trim();target.handledBy=currentUser().name;target.updatedAt=U.now();},(next==='Closed'?'Đóng':'Tiếp nhận')+' đề xuất '+x.itemName);
      Q.toast('Đã cập nhật đề xuất. Đây là ghi nhận xử lý, không phát sinh đơn mua hàng.');
    },{submitText:'Xác nhận'});
  };
})();


