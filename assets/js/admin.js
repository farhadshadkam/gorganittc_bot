/* منطق پنل ادمین — داشبورد، ثبت‌نام‌ها، دوره‌ها، پیام بله، گزارش‌ها، تنظیمات */
(function () {
  'use strict';

  var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';
  var DEMO = !API_URL || API_URL.indexOf('PASTE_') === 0;
  var TOKEN = localStorage.getItem('maharat_token') || '';
  var ADMIN_NAME = localStorage.getItem('maharat_admin') || '';
  var STATUSES = ['منتظر', 'ثبت‌نام شده', 'انصراف داده', 'جواب نداده', 'سایر'];
  var STATUS_CLASS = { 'منتظر': 'b-wait', 'ثبت‌نام شده': 'b-reg', 'انصراف داده': 'b-withdraw', 'جواب نداده': 'b-noans', 'سایر': 'b-other' };
  var STATUS_ICON = { 'منتظر': '⏳', 'ثبت‌نام شده': '✅', 'انصراف داده': '🚫', 'جواب نداده': '📵', 'سایر': '📌' };
  var REGS = [], COURSES = [], DASH = null, SELECTED = {}, DETAIL_REG = null, BC_IDS = null;
  var REQ_STATUSES = [ // دقیقاً هم‌خوان با REQ_STATUSES در Utils.gs بک‌اند
    'فعلاً بررسی نشده',
    'بررسی شد؛ در اسرع وقت برگزار می‌شود',
    'بررسی شد؛ به‌دلیل نبود مربی فعلاً قابل برگزاری نیست و در برنامه‌ریزی قرار می‌گیرد',
    'به‌دلیل ضوابط سازمان و مرکز، متأسفانه قابل برگزاری نیست'
  ];
  var REQS = [], REQ_DETAIL = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fa(n) { return String(n === 0 ? '۰' : n || '').replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function fixMobile(s) { var m = String(s || '').replace(/\D/g, ''); if (m.length === 10 && m.charAt(0) === '9') m = '0' + m; return m; }
  function badge(st) { return '<span class="badge ' + (STATUS_CLASS[st] || 'b-noans') + '">' + (STATUS_ICON[st] || '') + ' ' + esc(st) + '</span>'; }
  function showErr(id, msg) { var a = $(id); a.textContent = '⚠️ ' + msg; a.className = 'alert alert-err show'; }
  function showOk(id, msg) { var a = $(id); a.textContent = '✅ ' + msg; a.className = 'alert alert-ok show'; setTimeout(function () { a.className = 'alert alert-ok'; }, 4000); }
  function closeModal(id) { $(id).classList.remove('show'); }
  window.closeModal = closeModal;

  /* ================= API ================= */
  function api(action, data) {
    if (DEMO) return demoApi(action, data);
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action, token: TOKEN }, data || {}))
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (r && r.auth === false) { logout(); throw new Error(r.error || 'نشست منقضی شد'); }
      return r;
    });
  }

  /* داده نمونه برای حالت نمایشی */
  var D_COURSES = [
    { id: 'C100', title: 'آموزش خیاطی مقدماتی', category: 'خانگی', capacity: 20, start_date: '1404/09/05', schedule: 'شنبه و دوشنبه ۹ تا ۱۱', status: 'در حال ثبت‌نام', description: 'از صفر تا صد', active_regs: 8, gender: 'ویژه بانوان', cost: '۵۰۰ هزار تومان', hours: '۲۴ ساعت', duration: 'حدود ۲ ماه' },
    { id: 'C101', title: 'مهارت‌های ICDL (رایانه)', category: 'رایانه‌ای', capacity: 15, start_date: '1404/09/10', schedule: 'یکشنبه و سه‌شنبه ۱۶ تا ۱۸', status: 'در حال ثبت‌نام', description: 'ICDL', active_regs: 11, gender: 'مشترک', cost: '۸۰۰ هزار تومان', hours: '۴۸ ساعت', duration: 'حدود ۲/۵ ماه' },
    { id: 'C102', title: 'آشپزی و شیرینی‌پزی', category: 'خانگی', capacity: 12, start_date: '1404/09/15', schedule: 'چهارشنبه ۹ تا ۱۲', status: 'به‌زودی', description: 'کاربردی', active_regs: 4, gender: 'ویژه بانوان', cost: 'رایگان', hours: '۳۰ ساعت', duration: 'حدود ۱ ماه' }
  ];
  var D_NAMES = [['زهرا', 'محمدی', 'زن', '09121112233', 'تهران'], ['فاطمه', 'احمدی', 'زن', '09351234567', 'کرج'], ['علی', 'رضایی', 'مرد', '09193334455', 'تهران'], ['حسین', 'کریمی', 'مرد', '09127778899', 'شهریار'], ['مریم', 'حسینی', 'زن', '09365556677', 'اسلامشهر'], ['سمیرا', 'قاسمی', 'زن', '09104445566', 'تهران']];
  var D_STATUS = ['منتظر', 'منتظر', 'ثبت‌نام شده', 'منتظر', 'انصراف داده', 'جواب نداده'];
  function demoRegs() {
    return D_NAMES.map(function (n, i) {
      var c = D_COURSES[i % 3];
      return {
        reg_id: 'RG' + (100 + i), reg_code: 'R-' + (10001 + i), national_code: '001086789' + i,
        first_name: n[0], last_name: n[1], gender: n[2], mobile: n[3], city: n[4],
        address: 'خیابان نمونه، کوچه ۳', postal_code: '123456789' + (i % 10), birth_date: '136' + (5 + i % 5) + '/0' + (1 + i % 9) + '/1' + (i % 9),
        education: 'دیپلم', field: 'علوم تجربی', employment: 'خانه‌دار', chat_id: i % 2 ? '123456789' : '',
        course_id: c.id, course_title: c.title, status: D_STATUS[i],
        source: i % 2 ? 'bot' : 'web', note: '', created_at: '1404/08/1' + (i + 1) + ' 10:2' + i + ':00', updated_at: '1404/08/1' + (i + 1) + ' 10:2' + i + ':00'
      };
    });
  }
  function demoApi(action, d) {
    d = d || {};
    function ok(r) { return new Promise(function (res) { setTimeout(function () { res(Object.assign({ ok: true }, r || {})); }, 250); }); }
    switch (action) {
      case 'login': return ok({ name: d.name || 'مدیر' });
      case 'dashboard': {
        var regs = demoRegs();
        var totals = { all: regs.length };
        STATUSES.forEach(function (s) { totals[s] = regs.filter(function (r) { return r.status === s; }).length; });
        return ok({
          totals: totals, statuses: STATUSES,
          byCourse: D_COURSES.map(function (c) {
            var counts = {}; STATUSES.forEach(function (s) { counts[s] = regs.filter(function (r) { return r.course_id === c.id && r.status === s; }).length; });
            return { id: c.id, title: c.title, category: c.category, capacity: c.capacity, status: c.status, start_date: c.start_date, total: regs.filter(function (r) { return r.course_id === c.id; }).length, counts: counts };
          }),
          recent: demoRegs().slice(0, 5).reverse()
        });
      }
      case 'listRegs': return ok({ rows: demoRegs().filter(function (r) { return (!d.status || r.status === d.status) && (!d.course_id || r.course_id === d.course_id) && (!d.source || r.source === d.source); }), statuses: STATUSES });
      case 'getCourses': return ok({ rows: D_COURSES });
      case 'saveCourse': return ok({});
      case 'deleteCourse': return ok({});
      case 'setStatus': case 'bulkSetStatus': case 'moveReg': return ok({});
      case 'broadcast': return ok({ total: 4, sent: 2, failed: 2, failures: [{ reg_code: 'R-10003', name: 'علی رضایی', reason: 'بدون حساب بله' }, { reg_code: 'R-10005', name: 'مریم حسینی', reason: 'بدون حساب بله' }] });
      case 'getBroadcasts': return ok({ rows: [{ id: 'B1001', ts: '1404/08/18 09:30', admin: 'مدیر', text: 'دوره خیاطی شنبه آغاز می‌شود.', filter_desc: 'دوره: C100 | وضعیت: منتظر', total: 4, sent: 2, failed: 2 }] });
      case 'getLogs': return ok({ rows: [{ ts: '1404/08/18 09:30', actor: 'مدیر', action: 'ارسال پیام بله', detail: 'موفق: ۲ ناموفق: ۲' }, { ts: '1404/08/17 14:10', actor: 'کارشناس ثبت‌نام', action: 'تغییر وضعیت', detail: 'R-10005 ← ثبت‌نام شده' }] });
      case 'getUsers': return ok({ rows: demoRegs().map(function (r) { return { id: r.reg_id, first_name: r.first_name, last_name: r.last_name, national_code: r.national_code, mobile: r.mobile, gender: r.gender, city: r.city, education: r.education, employment: r.employment, source: r.source, created_at: r.created_at, reg_count: 1, chat_id: r.chat_id }; }) });
      case 'getSettings': return ok({ settings: { center_name: 'مرکز آموزش مهارتی (نمونه)', center_phone: '۰۲۱-۱۲۳۴۵۶۷۸', center_address: 'تهران، خیابان نمونه', bot_username: 'MyCenterBot', admin_group_chat_id: '', bot_token_set: true } });
      case 'saveSettings': return ok({});
      case 'getRequests': return ok({ rows: [
        { id: 'Q1001', title: 'تعمیرات موبایل', category: 'فنی', first_name: 'علی', last_name: 'رضایی', national_code: '0012345679', mobile: '09193334455', chat_id: '', source: 'web', status: REQ_STATUSES[0], admin_note: '', handled_by: '', created_at: '1404/08/18 10:20', updated_at: '1404/08/18 10:20' },
        { id: 'Q1002', title: 'گلدوزی و سوزن‌دوزی', category: 'خانگی', first_name: 'زهرا', last_name: 'محمدی', national_code: '0020867891', mobile: '09121112233', chat_id: '123456789', source: 'bot', status: REQ_STATUSES[2], admin_note: 'در انتظار معرفی مربی', handled_by: 'کارشناس ثبت‌نام', created_at: '1404/08/17 14:00', updated_at: '1404/08/18 09:00' }
      ], statuses: REQ_STATUSES });
      case 'setRequest': return ok({});
      case 'getCategories': return ok({ categories: ['خانگی', 'رایانه‌ای', 'فنی', 'هنری'] });
      case 'categoryReport': return ok({ rows: [
        { key: 'خانگی', label: 'خانگی', courses: 2, capacity: 32, regs: 12, soon: 1, closed: 0, requests: 1 },
        { key: 'رایانه‌ای', label: 'رایانه‌ای', courses: 1, capacity: 15, regs: 11, soon: 0, closed: 0, requests: 0 },
        { key: 'فنی', label: 'فنی', courses: 1, capacity: 10, regs: 0, soon: 1, closed: 0, requests: 1 }
      ] });
      case 'botStatus': return ok({ configured: true, bot: { username: 'MyCenterBot', first_name: 'ربات ثبت‌نام' } });
      case 'listAdmins': return ok({ rows: [{ id: 'A10', name: 'مدیر', role: 'مدیر', created_at: '1404/08/01' }, { id: 'A11', name: 'کارشناس ثبت‌نام', role: 'اپراتور', created_at: '1404/08/01' }] });
      case 'saveAdmin': return ok({});
      case 'deleteAdmin': return ok({});
      default: return ok({});
    }
  }

  /* ================= احراز هویت ================= */
  window.doLogin = function () {
    var name = $('loginName').value.trim(), code = $('loginCode').value.trim();
    if (!name || !code) { showErr('loginAlert', 'نام و کد کاربری را وارد کنید.'); return; }
    $('loginBtn').disabled = true;
    api('login', { name: name, code: code }).then(function (r) {
      $('loginBtn').disabled = false;
      if (!r.ok) { showErr('loginAlert', r.error || 'ورود ناموفق بود.'); return; }
      TOKEN = r.token || TOKEN;
      ADMIN_NAME = r.name || name;
      localStorage.setItem('maharat_token', TOKEN);
      localStorage.setItem('maharat_admin', ADMIN_NAME);
      enterApp();
    }).catch(function (e) { $('loginBtn').disabled = false; showErr('loginAlert', e.message); });
  };

  function logout() {
    TOKEN = '';
    localStorage.removeItem('maharat_token');
    $('appView').classList.remove('show');
    $('loginView').style.display = 'flex';
  }
  window.logout = logout;

  function enterApp() {
    $('loginView').style.display = 'none';
    $('appView').classList.add('show');
    $('adminName').textContent = '👤 ' + ADMIN_NAME;
    boot();
  }

  /* ================= راه‌اندازی ================= */
  window.boot = function () {
    fillStatusSelects();
    api('dashboard').then(function (r) {
      if (!r.ok) return;
      DASH = r;
      renderDashboard();
    });
    api('getCourses').then(function (r) {
      if (!r.ok) return;
      COURSES = r.rows;
      fillCourseSelects();
      renderCourses();
    });
    loadRegs();
    if ($('page-settings').classList.contains('show')) loadSettings();
    if ($('page-reports').classList.contains('show')) loadReports();
    fillReqStatusSelects();
  };

  function fillReqStatusSelects() {
    ['fReqStatus'].forEach(function (id) {
      var sel = $(id), val = sel.value;
      if (sel.options.length > 1) return;
      REQ_STATUSES.forEach(function (s) {
        var o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o);
      });
      sel.value = val;
    });
  }

  function fillStatusSelects() {
    ['fStatus', 'bulkStatus', 'bcStatus'].forEach(function (id) {
      var sel = $(id), val = sel.value;
      if (sel.options.length > 1) return;
      STATUSES.forEach(function (s) {
        var o = document.createElement('option'); o.value = s; o.textContent = (STATUS_ICON[s] || '') + ' ' + s; sel.appendChild(o);
      });
      sel.value = val;
    });
  }

  function fillCourseSelects() {
    ['fCourse', 'bcCourse'].forEach(function (id) {
      var sel = $(id), val = sel.value;
      sel.innerHTML = '<option value="">' + (id === 'fCourse' ? 'همه دوره‌ها' : 'همه دوره‌ها') + '</option>';
      COURSES.forEach(function (c) {
        var o = document.createElement('option'); o.value = c.id; o.textContent = c.title; sel.appendChild(o);
      });
      sel.value = val;
    });
  }

  window.showPage = function (name) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('show'); });
    document.querySelectorAll('.nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-page') === name); });
    $('page-' + name).classList.add('show');
    if (name === 'broadcast') updateBcCount();
    if (name === 'reports') loadReports();
    if (name === 'settings') loadSettings();
    if (name === 'courses') renderCourses();
    if (name === 'requests') loadRequests();
    if (name === 'catreport') loadCategoryReport();
  };

  /* ================= داشبورد ================= */
  function renderDashboard() {
    var t = DASH.totals;
    var kpis = [
      { k: '', lbl: 'کل ثبت‌نام‌ها', num: t.all, cls: '' },
      { k: 'منتظر', lbl: '⏳ منتظر', num: t['منتظر'], cls: 'k-wait' },
      { k: 'ثبت‌نام شده', lbl: '✅ ثبت‌نام شده', num: t['ثبت‌نام شده'], cls: 'k-reg' },
      { k: 'انصراف داده', lbl: '🚫 انصراف داده', num: t['انصراف داده'], cls: 'k-withdraw' },
      { k: 'جواب نداده', lbl: '📵 جواب نداده', num: t['جواب نداده'], cls: 'k-noans' },
      { k: 'سایر', lbl: '📌 سایر', num: t['سایر'], cls: 'k-other' }
    ];
    $('kpiRow').innerHTML = kpis.map(function (x) {
      return '<div class="kpi ' + x.cls + '" onclick="gotoRegs(' + JSON.stringify(x.k) + ')"><div class="num">' + fa(x.num) + '</div><div class="lbl">' + x.lbl + '</div></div>';
    }).join('');

    $('courseStats').innerHTML = (DASH.byCourse || []).map(function (c) {
      var pct = c.capacity ? Math.min(100, Math.round((c.counts['منتظر'] + c.counts['ثبت‌نام شده']) * 100 / c.capacity)) : 0;
      var stBadge = { 'در حال ثبت‌نام': 'b-open', 'به‌زودی': 'b-soon', 'بسته': 'b-closed' }[c.status] || 'b-closed';
      return '<div class="cstat">' +
        '<h4>' + esc(c.title) + '</h4>' +
        '<div class="sub"><span class="badge ' + stBadge + '">' + esc(c.status) + '</span> ظرفیت: ' + fa(c.capacity) + (c.start_date ? ' | شروع: ' + esc(c.start_date) : '') + '</div>' +
        '<div class="mini-row">' + STATUSES.map(function (s) {
          return '<div class="mini" onclick="gotoRegs(' + JSON.stringify(s) + ',' + JSON.stringify(c.id) + ')"><b>' + fa(c.counts[s]) + '</b><span>' + (STATUS_ICON[s] || '') + ' ' + s + '</span></div>';
        }).join('') + '</div>' +
        '<div class="cap-bar"><div style="width:' + pct + '%"></div></div>' +
        '<div style="font-size:11.5px; color:var(--muted)">مجموع: ' + fa(c.total) + ' نفر</div>' +
        '</div>';
    }).join('') || '<div class="card">هنوز دوره‌ای ثبت نشده است. از «بانک دوره‌ها» دوره اضافه کنید.</div>';

    $('recentTbl').innerHTML = '<thead><tr><th>کد</th><th>نام</th><th>موبایل</th><th>دوره</th><th>وضعیت</th><th>منبع</th><th>تاریخ</th></tr></thead><tbody>' +
      (DASH.recent || []).map(function (r) {
        return '<tr><td>' + esc(r.reg_code) + '</td><td>' + esc(r.first_name + ' ' + r.last_name) + '</td><td dir="ltr">' + esc(fixMobile(r.mobile)) + '</td><td>' + esc(r.course_title) + '</td><td>' + badge(r.status) + '</td><td>' + srcBadge(r.source) + '</td><td>' + esc(r.created_at) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function srcBadge(s) {
    return s === 'bot' ? '<span class="badge b-bot">🤖 بات</span>' : '<span class="badge b-web">🌐 وب</span>';
  }
  window.srcBadge = srcBadge;

  window.gotoRegs = function (status, courseId) {
    showPage('regs');
    $('fStatus').value = status || '';
    $('fCourse').value = courseId || '';
    loadRegs();
  };

  /* ================= ثبت‌نام‌ها ================= */
  window.loadRegs = function () {
    api('listRegs', { status: $('fStatus').value, course_id: $('fCourse').value, source: $('fSource').value, q: $('qSearch').value })
      .then(function (r) {
        if (!r.ok) { showErr('regsAlert', r.error); return; }
        REGS = r.rows;
        SELECTED = {};
        renderRegs();
      });
  };

  function renderRegs() {
    var rows = REGS.map(function (r) {
      var opts = STATUSES.map(function (s) { return '<option' + (s === r.status ? ' selected' : '') + '>' + s + '</option>'; }).join('');
      return '<tr>' +
        '<td><input type="checkbox" ' + (SELECTED[r.reg_id] ? 'checked' : '') + ' onchange="toggleSel(\'' + r.reg_id + '\', this.checked)" style="cursor:pointer; width:16px; height:16px"></td>' +
        '<td style="cursor:pointer; font-weight:700; color:var(--primary)" onclick="openDetail(\'' + r.reg_id + '\')">' + esc(r.reg_code) + '</td>' +
        '<td>' + esc(r.first_name + ' ' + r.last_name) + '<br><small style="color:var(--muted)">' + esc(r.city) + '</small></td>' +
        '<td>' + esc(r.national_code) + '<br><small style="color:var(--muted)" dir="ltr">' + esc(fixMobile(r.mobile)) + '</small></td>' +
        '<td>' + esc(r.course_title) + '</td>' +
        '<td><select class="input" style="padding:4px 8px; font-size:12.5px; min-width:120px" onchange="quickStatus(\'' + r.reg_id + '\', this.value)">' + opts + '</select></td>' +
        '<td>' + srcBadge(r.source) + '</td>' +
        '<td style="white-space:nowrap; font-size:12px; color:var(--muted)">' + esc(r.created_at) + '</td>' +
        '</tr>';
    }).join('');
    $('regsTbl').innerHTML = '<thead><tr><th><input type="checkbox" onchange="toggleAll(this.checked)" style="cursor:pointer"></th><th>کد</th><th>نام</th><th>کدملی/موبایل</th><th>دوره</th><th>وضعیت</th><th>منبع</th><th>تاریخ ثبت</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:30px">موردی یافت نشد</td></tr>') + '</tbody>';
    updateBulkbar();
  }

  window.toggleSel = function (id, checked) { if (checked) SELECTED[id] = true; else delete SELECTED[id]; updateBulkbar(); };
  window.toggleAll = function (checked) {
    REGS.forEach(function (r) { if (checked) SELECTED[r.reg_id] = true; else delete SELECTED[r.reg_id]; });
    renderRegs();
  };
  function updateBulkbar() {
    var n = Object.keys(SELECTED).length;
    $('bulkbar').classList.toggle('show', n > 0);
    $('selCount').textContent = fa(n) + ' مورد انتخاب شده';
  }

  window.quickStatus = function (regId, status) {
    api('setStatus', { reg_id: regId, status: status }).then(function (r) {
      if (!r.ok) { showErr('regsAlert', r.error); loadRegs(); return; }
      loadRegs();
    });
  };

  window.applyBulkStatus = function () {
    var status = $('bulkStatus').value;
    if (!status) { alert('وضعیت مقصد را انتخاب کنید.'); return; }
    if (!confirm('تغییر وضعیت ' + fa(Object.keys(SELECTED).length) + ' مورد به «' + status + '»؟')) return;
    api('bulkSetStatus', { reg_ids: Object.keys(SELECTED), status: status }).then(function (r) {
      if (!r.ok) { showErr('regsAlert', r.error); return; }
      SELECTED = {};
      loadRegs();
    });
  };

  window.openDetail = function (regId) {
    var r = REGS.filter(function (x) { return x.reg_id === regId; })[0];
    if (!r) return;
    DETAIL_REG = r;
    var row = function (k, v) { return '<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">' + k + '</span><span style="font-weight:700">' + (v || '—') + '</span></div>'; };
    var courseOpts = COURSES.map(function (c) { return '<option value="' + esc(c.id) + '"' + (String(c.id) === String(r.course_id) ? ' selected' : '') + '>' + esc(c.title) + '</option>'; }).join('');
    $('detailBody').innerHTML =
      '<div style="margin-bottom:14px">' + badge(r.status) + ' ' + srcBadge(r.source) + ' <span style="font-size:12px; color:var(--muted)">| ثبت: ' + esc(r.created_at) + '</span></div>' +
      row('کد رهگیری', esc(r.reg_code)) + row('جنسیت', esc(r.gender)) +
      row('نام و نام‌خانوادگی', esc(r.first_name + ' ' + r.last_name)) + row('کد ملی', esc(r.national_code)) +
      row('موبایل', esc(fixMobile(r.mobile))) + row('شهر', esc(r.city)) +
      row('محله/خیابان', esc(r.address)) + row('کد پستی', esc(r.postal_code)) +
      row('تاریخ تولد', esc(r.birth_date)) + row('مدرک تحصیلی', esc(r.education)) +
      row('رشته تحصیلی', esc(r.field)) + row('وضعیت اشتغال', esc(r.employment)) +
      row('حساب بله', r.chat_id ? '✅ متصل' : '—') + row('یادداشت', esc(r.note)) +
      '<div class="field" style="margin-top:16px"><label>انتقال به دوره دیگر (وضعیت به «منتظر» برمی‌گردد)</label>' +
      '<select class="input" id="d_course">' + courseOpts + '</select></div>' +
      '<div class="field"><label>یادداشت ادمین</label><input class="input" id="d_note" value="' + esc(r.note) + '"></div>';
    $('detailModal').classList.add('show');
  };

  window.saveDetail = function () {
    if (!DETAIL_REG) return;
    var newCourse = $('d_course').value, note = $('d_note').value;
    var p1 = (newCourse !== String(DETAIL_REG.course_id)) ?
      api('moveReg', { reg_id: DETAIL_REG.reg_id, course_id: newCourse }) : Promise.resolve({ ok: true });
    p1.then(function (r) {
      if (!r.ok) { alert(r.error); return; }
      if (note !== DETAIL_REG.note) {
        // یادداشت با تغییر وضعیت به همان وضعیت فعلی ذخیره می‌شود
        return api('setStatus', { reg_id: DETAIL_REG.reg_id, status: DETAIL_REG.status, note: note });
      }
      return { ok: true };
    }).then(function (r) {
      if (r && r.ok) { closeModal('detailModal'); loadRegs(); }
    });
  };

  /* ================= CSV ================= */
  window.exportCsv = function () {
    if (!REGS.length) { alert('داده‌ای برای خروجی نیست.'); return; }
    var head = ['کد رهگیری', 'جنسیت', 'نام', 'نام خانوادگی', 'کد ملی', 'موبایل', 'شهر', 'محله/خیابان', 'کد پستی', 'تاریخ تولد', 'مدرک', 'رشته', 'وضعیت اشتغال', 'دوره', 'وضعیت', 'منبع', 'یادداشت', 'تاریخ ثبت'];
    var lines = [head.join(',')];
    REGS.forEach(function (r) {
      lines.push([r.reg_code, r.gender, r.first_name, r.last_name, r.national_code, r.mobile, r.city, r.address, r.postal_code, r.birth_date, r.education, r.field, r.employment, r.course_title, r.status, r.source === 'bot' ? 'بات' : 'وب', r.note, r.created_at]
        .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(','));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'registrations.csv';
    a.click();
  };

  /* ================= دوره‌ها ================= */
  function renderCourses() {
    var stCls = { 'در حال ثبت‌نام': 'b-open', 'به‌زودی': 'b-soon', 'بسته': 'b-closed' };
    $('coursesTbl').innerHTML = '<thead><tr><th>عنوان</th><th>دسته</th><th>مخاطبان</th><th>هزینه / مدت</th><th>ظرفیت</th><th>ثبت‌نام فعال</th><th>شروع</th><th>زمان‌بندی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>' +
      (COURSES || []).map(function (c) {
        var dur = [c.hours, c.duration].filter(function (x) { return x; }).join(' — ');
        return '<tr><td style="font-weight:700">' + esc(c.title) + '</td><td>' + esc(c.category || '—') + '</td>' +
          '<td>' + (c.gender ? '<span class="badge b-gen">' + esc(c.gender) + '</span>' : '—') + '</td>' +
          '<td style="font-size:12px">' + (c.cost ? '💰 ' + esc(c.cost) : '—') + (dur ? '<br>⏱ ' + esc(dur) : '') + '</td>' +
          '<td>' + fa(c.capacity) + '</td>' +
          '<td><b style="color:var(--primary-dark)">' + fa(c.active_regs) + '</b></td><td>' + esc(c.start_date || '—') + '</td><td>' + esc(c.schedule || '—') + '</td>' +
          '<td><span class="badge ' + (stCls[c.status] || 'b-closed') + '">' + esc(c.status) + '</span></td>' +
          '<td style="white-space:nowrap"><button class="btn btn-sm btn-ghost" onclick="openCourseModal(\'' + esc(c.id) + '\')">✏️</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="delCourse(\'' + esc(c.id) + '\')">🗑</button></td></tr>';
      }).join('') + '</tbody>';
  }

  window.openCourseModal = function (id) {
    var c = COURSES.filter(function (x) { return x.id === String(id); })[0];
    $('courseModalTitle').textContent = c ? 'ویرایش دوره' : 'افزودن دوره';
    $('c_id').value = c ? c.id : '';
    $('c_title').value = c ? c.title : '';
    $('c_category').value = c ? (c.category || '') : '';
    $('c_capacity').value = c ? c.capacity : '';
    $('c_start_date').value = c ? (c.start_date || '') : '';
    $('c_schedule').value = c ? (c.schedule || '') : '';
    $('c_status').value = c ? c.status : 'در حال ثبت‌نام';
    $('c_description').value = c ? (c.description || '') : '';
    $('c_gender').value = c ? (c.gender || '') : '';
    $('c_cost').value = c ? (c.cost || '') : '';
    $('c_hours').value = c ? (c.hours || '') : '';
    $('c_duration').value = c ? (c.duration || '') : '';
    $('courseAlert').className = 'alert alert-err';
    refreshCatList(); // پیشنهاد گروه‌های موجود هنگام تایپ
    $('courseModal').classList.add('show');
  };

  window.saveCourse = function () {
    var course = {
      id: $('c_id').value || null, title: $('c_title').value, category: $('c_category').value,
      capacity: $('c_capacity').value, start_date: $('c_start_date').value,
      schedule: $('c_schedule').value, status: $('c_status').value, description: $('c_description').value, gender: $('c_gender').value, cost: $('c_cost').value, hours: $('c_hours').value, duration: $('c_duration').value
    };
    api('saveCourse', { course: course }).then(function (r) {
      if (!r.ok) { showErr('courseAlert', r.error); return; }
      closeModal('courseModal');
      api('getCourses').then(function (x) { if (x.ok) { COURSES = x.rows; fillCourseSelects(); renderCourses(); } });
    });
  };

  window.delCourse = function (id) {
    if (!confirm('این دوره حذف شود؟ (فقط دوره بدون ثبت‌نام فعال قابل حذف است)')) return;
    api('deleteCourse', { id: id }).then(function (r) {
      if (!r.ok) { alert(r.error); return; }
      api('getCourses').then(function (x) { if (x.ok) { COURSES = x.rows; fillCourseSelects(); renderCourses(); } });
    });
  };

  /* ================= درخواست‌های دوره ================= */
  function reqBadge(st) {
    var cls, ic;
    if (st === 'فعلاً بررسی نشده') { cls = 'b-wait'; ic = '⏳'; }
    else if (st.indexOf('اسرع وقت') > -1) { cls = 'b-reg'; ic = '✅'; }
    else if (st.indexOf('مربی') > -1) { cls = 'b-soon'; ic = '📅'; }
    else { cls = 'b-withdraw'; ic = '🚫'; }
    return '<span class="badge ' + cls + '">' + ic + ' ' + esc(st) + '</span>';
  }

  window.loadRequests = function () {
    api('getRequests', { status: $('fReqStatus').value, q: $('qReqSearch').value }).then(function (r) {
      if (!r.ok) { showErr('reqsAlert', r.error); return; }
      REQS = r.rows;
      renderRequests();
    });
  };

  function renderRequests() {
    $('reqTbl').innerHTML = '<thead><tr><th>کد</th><th>عنوان پیشنهادی</th><th>گروه</th><th>درخواست‌دهنده</th><th>وضعیت اقدام</th><th>منبع</th><th>تاریخ ثبت</th><th>عملیات</th></tr></thead><tbody>' +
      (REQS.length ? REQS.map(function (r) {
        return '<tr><td style="font-weight:700">' + esc(r.id) + '</td>' +
          '<td style="font-weight:700; color:var(--primary-dark)">' + esc(r.title) + '</td>' +
          '<td>' + esc(r.category || '—') + '</td>' +
          '<td>' + esc(r.first_name + ' ' + r.last_name) + '<br><small style="color:var(--muted)">' + esc(r.national_code) + ' | <span dir="ltr">' + esc(fixMobile(r.mobile)) + '</span></small></td>' +
          '<td>' + reqBadge(r.status) + '</td>' +
          '<td>' + srcBadge(r.source) + '</td>' +
          '<td style="white-space:nowrap; font-size:12px; color:var(--muted)">' + esc(r.created_at) + '</td>' +
          '<td><button class="btn btn-sm" onclick="openReqReview(\'' + esc(r.id) + '\')">بررسی</button></td></tr>';
      }).join('') : '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:30px">درخواستی ثبت نشده است</td></tr>') + '</tbody>';
  }

  /** پیشنهاد گروه‌های موجود در فیلد تایپ گروه (datalist) */
  function refreshCatList() {
    api('getCategories').then(function (r) {
      if (!r.ok) return;
      $('catList').innerHTML = (r.categories || []).map(function (c) {
        return '<option value="' + esc(c) + '">';
      }).join('');
    });
  }

  window.openReqReview = function (id) {
    var r = REQS.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    REQ_DETAIL = r;
    $('rq_id').value = r.id;
    $('rq_title').value = r.title;
    $('rq_who').innerHTML = '👤 <b>' + esc(r.first_name + ' ' + r.last_name) + '</b> | کد ملی: ' + esc(r.national_code) +
      ' | موبایل: <span dir="ltr">' + esc(fixMobile(r.mobile)) + '</span> | ' +
      (r.source === 'bot' ? '🤖 بات' : '🌐 وب‌سایت') +
      (r.handled_by ? ' | بررسی قبلی: ' + esc(r.handled_by) : '');
    $('rq_category').value = r.category || '';
    $('rq_status').innerHTML = REQ_STATUSES.map(function (s) {
      return '<option' + (s === r.status ? ' selected' : '') + '>' + esc(s) + '</option>';
    }).join('');
    $('rq_note').value = r.admin_note || '';
    $('reqReviewAlert').className = 'alert alert-err';
    refreshCatList();
    $('reqModal').classList.add('show');
  };

  window.saveReqReview = function () {
    if (!REQ_DETAIL) return;
    var category = $('rq_category').value.trim();
    if (category.length < 2) { showErr('reqReviewAlert', 'گروه/دسته دوره را وارد کنید (از لیست یا گروه جدید).'); return; }
    api('setRequest', {
      req_id: REQ_DETAIL.id,
      status: $('rq_status').value,
      category: category,
      note: $('rq_note').value
    }).then(function (r) {
      if (!r.ok) { showErr('reqReviewAlert', r.error); return; }
      closeModal('reqModal');
      loadRequests();
    });
  };

  /** ساخت سریع دوره از روی درخواست — فرم دوره با عنوان و گروه پیش‌پر می‌شود */
  window.makeCourseFromReq = function () {
    if (!REQ_DETAIL) return;
    var category = $('rq_category').value.trim();
    if (category.length < 2) { showErr('reqReviewAlert', 'اول گروه/دسته دوره را وارد کنید، بعد دوره را بسازید.'); return; }
    closeModal('reqModal');
    openCourseModal();
    $('c_title').value = REQ_DETAIL.title;
    $('c_category').value = category;
    $('c_capacity').value = '';
    $('c_start_date').value = '';
    $('c_schedule').value = '';
    $('c_description').value = 'بر اساس درخواست شماره ' + REQ_DETAIL.id;
    $('c_status').value = 'به‌زودی';
  };

  /* ================= گزارش گروه‌ها ================= */
  function loadCategoryReport() {
    api('categoryReport').then(function (r) {
      if (!r.ok) { showErr('catAlert', r.error); return; }
      $('catTbl').innerHTML = '<thead><tr><th>گروه</th><th>مجموع دوره</th><th>در حال ثبت‌نام</th><th>به‌زودی</th><th>بسته</th><th>ظرفیت کل</th><th>ثبت‌نام فعال</th><th>درخواست دوره</th></tr></thead><tbody>' +
        (r.rows.length ? r.rows.map(function (g) {
          return '<tr><td style="font-weight:700">' + esc(g.label) + '</td>' +
            '<td>' + fa(g.courses) + '</td>' +
            '<td><b style="color:var(--primary-dark)">' + fa(g.courses - g.soon - g.closed) + '</b></td>' +
            '<td>' + fa(g.soon) + '</td><td>' + fa(g.closed) + '</td>' +
            '<td>' + fa(g.capacity) + '</td>' +
            '<td><b style="color:var(--primary-dark)">' + fa(g.regs) + '</b></td>' +
            '<td>' + fa(g.requests) + '</td></tr>';
        }).join('') : '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:30px">گروهی ثبت نشده است</td></tr>') + '</tbody>';
    });
  }

  /* ================= پیام بله ================= */
  window.gotoBroadcastWithSelection = function () {
    BC_IDS = Object.keys(SELECTED);
    showPage('broadcast');
    $('bcSelHint').style.display = 'block';
    $('bcSelHint').textContent = '📌 حالت انتخاب دستی: ' + fa(BC_IDS.length) + ' نفر از صفحه ثبت‌نام‌ها انتخاب شده‌اند. (برای بازگشت به حالت فیلتر، صفحه را دوباره باز کنید)';
    updateBcCount();
  };

  window.updateBcCount = function () {
    var done = function (n) { $('bcCount').textContent = fa(n) + ' مخاطب'; };
    if (BC_IDS && BC_IDS.length) { done(BC_IDS.length); return; }
    api('listRegs', { course_id: $('bcCourse').value, status: $('bcStatus').value })
      .then(function (r) { done(r.ok ? r.rows.length : 0); });
  };

  window.sendBroadcast = function () {
    var text = $('bcText').value.trim();
    if (text.length < 5) { showErr('bcAlert', 'متن پیام را وارد کنید.'); return; }
    var body = { text: text };
    if (BC_IDS && BC_IDS.length) body.reg_ids = BC_IDS;
    else body.filter = { course_id: $('bcCourse').value, status: $('bcStatus').value };
    if (!confirm('ارسال پیام به ' + $('bcCount').textContent + ' آغاز شود؟')) return;
    $('bcSend').disabled = true; $('bcSend').textContent = '⏳ در حال ارسال... (این پنجره را نبندید)';
    api('broadcast', body).then(function (r) {
      $('bcSend').disabled = false; $('bcSend').textContent = '📤 ارسال پیام';
      if (!r.ok) { showErr('bcAlert', r.error); return; }
      showOk('bcAlertOk', 'ارسال کامل شد — موفق: ' + fa(r.sent) + ' | ناموفق: ' + fa(r.failed));
      $('bcResult').innerHTML = '<div class="card"><h4 style="margin-bottom:10px">گزارش ارسال</h4>' +
        '<div style="display:flex; gap:14px; margin-bottom:12px; font-size:14px"><span class="badge b-reg">موفق: ' + fa(r.sent) + '</span><span class="badge b-withdraw">ناموفق: ' + fa(r.failed) + '</span><span class="badge b-noans">مجموع: ' + fa(r.total) + '</span></div>' +
        ((r.failures || []).length ? '<div class="table-wrap"><table class="tbl" style="min-width:400px"><thead><tr><th>کد</th><th>نام</th><th>دلیل</th></tr></thead><tbody>' +
          r.failures.map(function (f) { return '<tr><td>' + esc(f.reg_code) + '</td><td>' + esc(f.name) + '</td><td style="color:var(--danger)">' + esc(f.reason) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
        '</div>';
      $('bcText').value = '';
      BC_IDS = null; $('bcSelHint').style.display = 'none';
    }).catch(function (e) {
      $('bcSend').disabled = false; $('bcSend').textContent = '📤 ارسال پیام';
      showErr('bcAlert', e.message || 'خطا در ارسال');
    });
  };

  /* ================= گزارش‌ها ================= */
  function loadReports() {
    api('getBroadcasts').then(function (r) {
      if (!r.ok) return;
      $('bcHistTbl').innerHTML = '<thead><tr><th>زمان</th><th>ادمین</th><th>مخاطبان</th><th>متن</th><th>موفق/ناموفق</th></tr></thead><tbody>' +
        (r.rows || []).map(function (b) {
          return '<tr><td style="white-space:nowrap">' + esc(b.ts) + '</td><td>' + esc(b.admin) + '</td><td style="font-size:12px">' + esc(b.filter_desc) + '</td><td style="max-width:260px">' + esc(String(b.text).substring(0, 60)) + '…</td><td><span class="badge b-reg">' + fa(b.sent) + '</span> <span class="badge b-withdraw">' + fa(b.failed) + '</span></td></tr>';
        }).join('') + '</tbody>';
    });
    api('getLogs', { limit: 100 }).then(function (r) {
      if (!r.ok) return;
      $('logsTbl').innerHTML = '<thead><tr><th>زمان</th><th>کاربر</th><th>عملیات</th><th>جزئیات</th></tr></thead><tbody>' +
        (r.rows || []).map(function (l) {
          return '<tr><td style="white-space:nowrap; font-size:12px">' + esc(l.ts) + '</td><td>' + esc(l.actor) + '</td><td>' + esc(l.action) + '</td><td style="font-size:12.5px">' + esc(l.detail) + '</td></tr>';
        }).join('') + '</tbody>';
    });
  }

  /* ================= تنظیمات ================= */
  function loadSettings() {
    api('getSettings').then(function (r) {
      if (!r.ok) return;
      var s = r.settings;
      $('s_center_name').value = s.center_name || '';
      $('s_center_phone').value = s.center_phone || '';
      $('s_center_address').value = s.center_address || '';
      $('s_bot_username').value = s.bot_username || '';
      $('s_admin_group_chat_id').value = s.admin_group_chat_id || '';
      $('tokenHint').textContent = s.bot_token_set ?
        '✅ توکن قبلاً ذخیره شده است. برای تغییر، توکن جدید را وارد و ذخیره کنید.' :
        'توکن فقط در گوگل‌شیت ذخیره می‌شود و هرگز در کد سایت قرار نمی‌گیرد. با ذخیره، Webhook خودکار تنظیم می‌شود.';
    });
    api('botStatus').then(function (r) {
      if (!r.ok) return;
      $('botStatusBox').innerHTML = r.configured ?
        '<span class="badge b-reg">✅ بات متصل: @' + esc(r.bot.username) + '</span>' :
        '<span class="badge b-withdraw">❌ ' + esc(r.message || 'بات تنظیم نشده') + '</span>';
    });
    api('listAdmins').then(function (r) {
      if (!r.ok) return;
      $('adminsTbl').innerHTML = '<thead><tr><th>نام</th><th>کد کاربری</th><th>نقش</th><th>عملیات</th></tr></thead><tbody>' +
        (r.rows || []).map(function (a) {
          return '<tr><td style="font-weight:700">' + esc(a.name) + '</td><td>•••••</td><td><span class="badge ' + (a.role === 'مدیر' ? 'b-reg' : 'b-noans') + '">' + esc(a.role) + '</span></td>' +
            '<td style="white-space:nowrap"><button class="btn btn-sm btn-ghost" onclick="openAdminModal(\'' + esc(a.id) + '\')">✏️</button> <button class="btn btn-sm btn-danger" onclick="delAdmin(\'' + esc(a.id) + '\')">🗑</button></td></tr>';
        }).join('') + '</tbody>';
    });
  }

  window.saveCenterInfo = function () {
    api('saveSettings', { settings: {
      center_name: $('s_center_name').value, center_phone: $('s_center_phone').value,
      center_address: $('s_center_address').value, bot_username: $('s_bot_username').value,
      admin_group_chat_id: $('s_admin_group_chat_id').value
    } }).then(function (r) { if (r.ok) showOk('setAlert', 'اطلاعات مرکز ذخیره شد.'); });
  };

  window.saveBotToken = function () {
    var token = $('s_bot_token').value.trim();
    if (token.length < 20) { alert('توکن معتبر وارد کنید (از BotFather بله).'); return; }
    api('saveSettings', { settings: { bot_token: token } }).then(function (r) {
      if (r.ok) { showOk('setAlert', 'توکن ذخیره شد؛ Webhook تنظیم شد.'); $('s_bot_token').value = ''; loadSettings(); }
      else alert(r.error);
    });
  };

  window.openAdminModal = function (id) {
    $('adminModalTitle').textContent = id ? 'ویرایش ادمین' : 'افزودن ادمین';
    $('a_id').value = id || '';
    $('a_name').value = ''; $('a_code').value = ''; $('a_role').value = 'اپراتور';
    $('adminAlert').className = 'alert alert-err';
    $('adminModal').classList.add('show');
  };

  window.saveAdmin = function () {
    var admin = { id: $('a_id').value || null, name: $('a_name').value, code: $('a_code').value, role: $('a_role').value };
    api('saveAdmin', { admin: admin }).then(function (r) {
      if (!r.ok) { showErr('adminAlert', r.error); return; }
      closeModal('adminModal');
      loadSettings();
    });
  };

  window.delAdmin = function (id) {
    if (!confirm('این ادمین حذف شود؟')) return;
    api('deleteAdmin', { id: id }).then(function (r) {
      if (!r.ok) { alert(r.error); return; }
      loadSettings();
    });
  };

  /* بستن مودال‌ها */
  document.querySelectorAll('.modal-mask').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === this) m.classList.remove('show'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.modal-mask').forEach(function (m) { m.classList.remove('show'); });
  });

  /* شروع */
  if (DEMO) $('demoBanner').classList.add('show');
  if (TOKEN) {
    // آزمون اعتبار توکن ذخیره‌شده با اکشن مخصوص whoami
    api('whoami').then(function (r) {
      if (r.ok) { ADMIN_NAME = r.name || ADMIN_NAME; enterApp(); } else logout();
    }).catch(function () {});
  }
})();
