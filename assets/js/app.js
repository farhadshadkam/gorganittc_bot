/* منطق لندینگ — بارگذاری دوره‌ها و فرم پیش‌ثبت‌نام ۵ مرحله‌ای (ارسال یک‌جا در پایان) */
(function () {
  'use strict';

  var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';
  var DEMO = !API_URL || API_URL.indexOf('PASTE_') === 0;

  /* ================= ابزار ================= */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function normDigits(s) {
    var fa = '۰۱۲۳۴۵۶۷۸۹', ar = '٠١٢٣٤٥٦٧٨٩', out = '';
    s = String(s || '');
    for (var i = 0; i < s.length; i++) {
      var fi = fa.indexOf(s[i]), ai = ar.indexOf(s[i]);
      out += fi > -1 ? fi : (ai > -1 ? ai : s[i]);
    }
    return out;
  }
  function validNationalCode(code) {
    code = normDigits(code).replace(/\D/g, '');
    if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
    var sum = 0;
    for (var i = 0; i < 9; i++) sum += code[i] * (10 - i);
    var rem = sum % 11;
    return rem < 2 ? +code[9] === rem : +code[9] === 11 - rem;
  }
  function validMobile(m) { return /^09\d{9}$/.test(normDigits(m).replace(/[\s-]/g, '')); }
  function validBirth(s) {
    s = normDigits(s).trim().replace(/[-.]/g, '/');
    var m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1300 || y > 1410 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    if (mo > 6 && d > 30) return null;
    return y + '/' + (mo < 10 ? '0' + mo : mo) + '/' + (d < 10 ? '0' + d : d);
  }
  function $(id) { return document.getElementById(id); }

  /* ================= API ================= */
  function api(action, data) {
    if (DEMO) return demoApi(action, data);
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, data || {}))
    }).then(function (r) { return r.json(); });
  }

  var DEMO_COURSES = [
    { id: 'C100', title: 'آموزش خیاطی مقدماتی', category: 'خانگی', capacity: 20, registered: 8, start_date: '1404/09/05', schedule: 'شنبه و دوشنبه ۹ تا ۱۱', description: 'آموزش از صفر تا دوخت لباس ساده', gender: 'ویژه بانوان', cost: '۵۰۰ هزار تومان', hours: '۲۴ ساعت', duration: 'حدود ۲ ماه' },
    { id: 'C101', title: 'مهارت‌های ICDL (رایانه)', category: 'رایانه‌ای', capacity: 15, registered: 11, start_date: '1404/09/10', schedule: 'یکشنبه و سه‌شنبه ۱۶ تا ۱۸', description: 'ویندوز، Word، Excel، اینترنت', gender: 'مشترک', cost: '۸۰۰ هزار تومان', hours: '۴۸ ساعت', duration: 'حدود ۲/۵ ماه' },
    { id: 'C102', title: 'آشپزی و شیرینی‌پزی', category: 'خانگی', capacity: 12, registered: 4, start_date: '1404/09/15', schedule: 'چهارشنبه ۹ تا ۱۲', description: 'کاربردی با آزمون فنی‌وحرفه‌ای', gender: 'ویژه بانوان', cost: 'رایگان', hours: '۳۰ ساعت', duration: 'حدود ۱ ماه' }
  ];
  function demoApi(action) {
    if (action === 'publicInfo')
      return Promise.resolve({
        ok: true,
        center: { name: 'مرکز آموزش مهارتی (نمونه)', phone: '۰۲۱-۱۲۳۴۵۶۷۸', address: 'تهران، خیابان نمونه', bot_username: '' },
        courses: DEMO_COURSES,
        titles: ['آموزش خیاطی مقدماتی', 'مهارت‌های ICDL (رایانه)', 'آشپزی و شیرینی‌پزی', 'تعمیرات موبایل', 'گلدوزی']
      });
    if (action === 'webRegister')
      return new Promise(function (res) {
        setTimeout(function () { res({ ok: true, reg_code: 'R-' + (10000 + Math.floor(Math.random() * 9000)) }); }, 600);
      });
    if (action === 'saveRequest')
      return new Promise(function (res) {
        setTimeout(function () { res({ ok: true, req_id: 'Q1001' }); }, 600);
      });
    if (action === 'myRequests')
      return Promise.resolve({ ok: true, rows: [
        { id: 'Q1001', title: 'تعمیرات موبایل', category: 'فنی', status: 'بررسی شد؛ در اسرع وقت برگزار می‌شود', created_at: '1404/08/18 10:00', updated_at: '1404/08/19 09:30' }
      ] });
    return Promise.resolve({ ok: false, error: 'حالت نمایشی' });
  }

  /* ================= بارگذاری اولیه ================= */
  var CENTER = null, COURSES = [], TITLES = [];

  function loadPublic() {
    if (DEMO) $('demoBanner').classList.add('show');
    api('publicInfo').then(function (r) {
      if (!r.ok) return;
      CENTER = r.center; COURSES = r.courses;
      TITLES = r.titles || [];
      $('centerName').textContent = r.center.name;
      $('footerCenter').textContent = r.center.name;
      $('footerAddress').textContent = 'آدرس: ' + (r.center.address || '—');
      $('footerPhone').textContent = 'تلفن: ' + (r.center.phone || '—');
      if (r.center.bot_username) {
        var url = 'https://ble.ir/' + r.center.bot_username.replace('@', '');
        ['botLink', 'botLink2', 'botLink3'].forEach(function (id) {
          $(id).href = url; $(id).style.display = 'inline-flex';
        });
      }
      renderCourses();
    }).catch(function () {
      $('coursesGrid').innerHTML = '<div class="card" style="grid-column:1/-1; text-align:center; color:#b45309; font-size:14px">⚠️ ارتباط با سرور برقرار نشد.<br>اگر آدرس <b>assets/js/config.js</b> را تازه تنظیم کرده‌اید، چند لحظه بعد صفحه را رفرش کنید.<br>در غیر این صورت، وب‌اپ Apps Script در دسترس نیست (Deploy را با دسترسی Anyone بررسی کنید).</div>';
    });
  }

  function renderCourses() {
    var g = $('coursesGrid');
    if (!COURSES.length) {
      g.innerHTML = '<div class="card" style="grid-column:1/-1; text-align:center; color:var(--muted)">فعلاً دوره‌ای در حال ثبت‌نام نیست. 📚</div>';
      return;
    }
    g.innerHTML = COURSES.map(function (c) {
      var pct = c.capacity ? Math.min(100, Math.round(c.registered * 100 / c.capacity)) : 0;
      var left = Math.max(0, c.capacity - c.registered);
      var dur = [c.hours, c.duration].filter(function (x) { return x; }).join(' — ');
      return '<div class="course-card">' +
        '<div class="chips"><span class="badge b-open">' + esc(c.category || 'عمومی') + '</span>' +
        (c.gender ? '<span class="badge b-gen">👥 ' + esc(c.gender) + '</span>' : '') + '</div>' +
        '<h3>' + esc(c.title) + '</h3>' +
        '<div class="meta">' +
        (c.start_date ? '<div>📅 شروع: ' + esc(c.start_date) + '</div>' : '') +
        (c.schedule ? '<div>⏰ ' + esc(c.schedule) + '</div>' : '') +
        (dur ? '<div>⏱ مدت: ' + esc(dur) + '</div>' : '') +
        (c.cost ? '<div>💰 هزینه: ' + esc(c.cost) + '</div>' : '') +
        '</div>' +
        (c.description ? '<div class="desc">' + esc(c.description) + '</div>' : '') +
        '<div><div class="cap-text"><span>ظرفیت پرشده: ' + c.registered + ' از ' + c.capacity + '</span><span>' + (left > 0 ? left + ' ظرفیت باقی‌مانده' : 'ظرفیت تکمیل') + '</span></div>' +
        '<div class="cap-bar"><div style="width:' + pct + '%"></div></div></div>' +
        '<button class="btn" onclick="openReg(\'' + esc(c.id) + '\')">📝 پیش‌ثبت‌نام در این دوره</button>' +
        '</div>';
    }).join('');
  }

  /* ================= فرم پیش‌ثبت‌نام =================
   * ۵ مرحله: ۱) دوره ۲) نام و نام‌خانوادگی ۳) کد ملی و موبایل ۴) تولد و تحصیلات ۵) تأیید
   * اطلاعات در حافظه مرورگر (متغیر DATA) نگه داشته می‌شود و فقط در پایان یک‌جا ارسال می‌شود.
   */
  var EDU = ['زیر دیپلم', 'دیپلم', 'کاردانی', 'کارشناسی', 'کارشناسی ارشد', 'دکترا', 'سایر'];
  var STEP_LABELS = ['دوره', 'نام', 'هویتی', 'تحصیلات', 'تأیید'];
  var DATA = { full_name: '', first_name: '', last_name: '', national_code: '', mobile: '',
               birth_date: '', education: '', course_id: '' };
  var STEP = 0;

  window.openReg = function (courseId) {
    DATA.course_id = courseId || '';
    STEP = DATA.course_id ? 1 : 0; // اگر از کارت دوره آمد، دوره انتخاب شده است
    $('regSuccess').style.display = 'none';
    $('regForm').style.display = 'block';
    $('regAlert').className = 'alert alert-err';
    renderStep();
    $('regModal').classList.add('show');
  };
  window.closeRegModal = function () { $('regModal').classList.remove('show'); };

  function showErr(msg) {
    var a = $('regAlert');
    a.textContent = '⚠️ ' + msg;
    a.className = 'alert alert-err show';
    a.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function clearErr() { $('regAlert').className = 'alert alert-err'; }

  function choiceHtml(key, options) {
    return '<div class="choice-row">' + options.map(function (o) {
      return '<div class="choice' + (DATA[key] === o ? ' active' : '') + '" onclick="pickChoice(\'' + key + '\',\'' + esc(o) + '\',this)">' + esc(o) + '</div>';
    }).join('') + '</div>';
  }
  window.pickChoice = function (key, val, el) {
    DATA[key] = val;
    if (!el) {
      document.querySelectorAll('.choice').forEach(function (c) {
        if (c.textContent === val) el = c;
      });
    }
    if (el && el.parentNode) {
      Array.prototype.forEach.call(el.parentNode.children, function (c) { c.classList.remove('active'); });
      if (el) el.classList.add('active');
    }
  };

  var STEPS = [
    function () {
      var opts = COURSES.map(function (c) {
        var left = Math.max(0, c.capacity - c.registered);
        return '<label class="' + (DATA.course_id === String(c.id) ? 'active' : '') + '" onclick="pickCourse(\'' + esc(c.id) + '\',this)">' +
          '<span><b>' + esc(c.title) + '</b>' + (c.gender ? '<span class="badge b-gen">👥 ' + esc(c.gender) + '</span>' : '') + '<br><small style="color:var(--muted)">' + esc(c.start_date || '') + (c.schedule ? ' — ' + esc(c.schedule) : '') + '</small></span>' +
          '<span class="badge ' + (left > 0 ? 'b-reg' : 'b-closed') + '">' + (left > 0 ? left + ' ظرفیت' : 'تکمیل') + '</span></label>';
      }).join('');
      return '<h4 style="margin-bottom:14px">۱) انتخاب دوره</h4><div class="course-pick">' + opts + '</div>';
    },
    function () {
      return '<h4 style="margin-bottom:14px">۲) نام و نام‌خانوادگی</h4>' +
        '<div class="field"><label>نام و نام‌خانوادگی <span class="req">*</span></label>' +
        '<input class="input" id="f_full_name" placeholder="مثال: علی رضایی" value="' + esc(DATA.full_name) + '"></div>';
    },
    function () {
      return '<h4 style="margin-bottom:14px">۳) اطلاعات هویتی</h4>' +
        '<div class="form-grid">' +
        '<div class="field"><label>کد ملی (۱۰ رقم) <span class="req">*</span></label><input class="input" id="f_national_code" inputmode="numeric" value="' + esc(DATA.national_code) + '"><div class="hint">فقط عدد، بدون خط تیره</div></div>' +
        '<div class="field"><label>شماره موبایل <span class="req">*</span></label><input class="input" id="f_mobile" inputmode="tel" placeholder="09xxxxxxxxx" value="' + esc(DATA.mobile) + '"></div>' +
        '</div>';
    },
    function () {
      return '<h4 style="margin-bottom:14px">۴) تولد و تحصیلات</h4>' +
        '<div class="field"><label>تاریخ تولد <span class="req">*</span></label><input class="input" id="f_birth_date" placeholder="۱۳۷۰/۰۵/۱۲" value="' + esc(DATA.birth_date) + '"><div class="hint">فرمت: سال/ماه/روز — مثال: ۱۳۷۵/۰۳/۱۸</div></div>' +
        '<div class="field"><label>میزان تحصیلات <span class="req">*</span></label>' + choiceHtml('education', EDU) + '</div>';
    },
    function () {
      var c = COURSES.filter(function (x) { return String(x.id) === String(DATA.course_id); })[0];
      function row(k, v) { return '<div><span>' + k + '</span><span>' + (v || '—') + '</span></div>'; }
      return '<h4 style="margin-bottom:14px">۵) بازبینی و تأیید</h4>' +
        '<div class="review-box">' +
        row('نام و نام‌خانوادگی', esc(DATA.full_name)) +
        row('کد ملی', esc(DATA.national_code)) + row('موبایل', esc(DATA.mobile)) +
        row('تاریخ تولد', esc(DATA.birth_date)) +
        row('میزان تحصیلات', esc(DATA.education)) +
        row('دوره انتخابی', c ? '<b style="color:var(--primary-dark)">' + esc(c.title) + '</b>' : '—') +
        '</div>';
    }
  ];

  window.pickCourse = function (id, el) {
    DATA.course_id = id;
    if (!el) {
      document.querySelectorAll('.course-pick label').forEach(function (l) {
        if (l.getAttribute('onclick').indexOf(id) > -1) el = l;
      });
    }
    var wrap = document.querySelector('.course-pick');
    if (wrap) {
      Array.prototype.forEach.call(wrap.children, function (l) { l.classList.remove('active'); });
      if (el) el.classList.add('active');
    }
  };

  function renderStep() {
    $('stepper').innerHTML = STEP_LABELS.map(function (s, i) {
      return '<div class="st' + (i === STEP ? ' active' : (i < STEP ? ' done' : '')) + '">' + (i < STEP ? '✓ ' : '') + s + '</div>';
    }).join('');
    $('stepContent').innerHTML = STEPS[STEP]();
    $('prevBtn').style.visibility = STEP === 0 ? 'hidden' : 'visible';
    $('nextBtn').textContent = STEP === 4 ? '✅ ثبت پیش‌ثبت‌نام' : 'مرحله بعد ⬅️';
    clearErr();
  }

  function grabStep() {
    ['full_name', 'national_code', 'mobile', 'birth_date'].forEach(function (k) {
      var el = $('f_' + k);
      if (el) DATA[k] = el.value.trim();
    });
  }

  function validateStep() {
    switch (STEP) {
      case 0:
        if (!DATA.course_id) return 'دوره موردنظر را انتخاب کنید.';
        break;
      case 1: {
        var p = DATA.full_name.split(/\s+/);
        if (p.length < 2 || p[0].length < 2 || p.slice(1).join(' ').length < 2)
          return 'نام و نام‌خانوادگی را با هم وارد کنید (مثال: علی رضایی).';
        break;
      }
      case 2:
        if (!validNationalCode(DATA.national_code)) return 'کد ملی ۱۰ رقمی معتبر وارد کنید.';
        if (!validMobile(DATA.mobile)) return 'شماره موبایل با ۰۹ شروع شود و ۱۱ رقم باشد.';
        break;
      case 3:
        if (!validBirth(DATA.birth_date)) return 'تاریخ تولد را با فرمت ۱۳۷۰/۰۵/۱۲ وارد کنید.';
        if (!DATA.education) return 'میزان تحصیلات را انتخاب کنید.';
        break;
    }
    return null;
  }

  function submitReg() {
    var p = DATA.full_name.trim().split(/\s+/);
    DATA.first_name = p[0] || '';
    DATA.last_name = p.slice(1).join(' ') || '';
    $('nextBtn').disabled = true;
    $('nextBtn').textContent = '⏳ در حال ثبت...';
    api('webRegister', { data: DATA }).then(function (r) {
      $('nextBtn').disabled = false;
      if (!r.ok) {
        $('nextBtn').textContent = '✅ ثبت پیش‌ثبت‌نام';
        showErr(r.error || 'خطا در ثبت؛ دوباره تلاش کنید.');
        return;
      }
      $('regForm').style.display = 'none';
      $('regSuccess').style.display = 'block';
      $('successCode').textContent = r.reg_code;
      loadPublic(); // بروزرسانی ظرفیت‌ها
    }).catch(function () {
      $('nextBtn').disabled = false;
      $('nextBtn').textContent = '✅ ثبت پیش‌ثبت‌نام';
      showErr('ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.');
    });
  }

  window.nextStep = function () {
    grabStep();
    var err = validateStep();
    if (err) { showErr(err); return; }
    if (STEP < 4) { STEP++; renderStep(); return; }
    submitReg();
  };
  window.prevStep = function () { if (STEP > 0) { grabStep(); STEP--; renderStep(); } };

  /* ================= فرم درخواست دوره جدید =================
   * ۴ مرحله: ۱) عنوان دوره (با پیشنهاد هوشمند) ۲) نام ۳) کد ملی و موبایل ۴) تأیید
   * وضعیت اولیه درخواست «فعلاً بررسی نشده» است و بعداً از پنل ادمین بررسی می‌شود.
   */
  var RSTEP_LABELS = ['عنوان دوره', 'نام', 'هویتی', 'تأیید'];
  var RDATA = { title: '', full_name: '', national_code: '', mobile: '' };
  var RSTEP = 0;

  window.openReqModal = function () {
    RDATA = { title: '', full_name: '', national_code: '', mobile: '' };
    RSTEP = 0;
    $('reqSuccess').style.display = 'none';
    $('reqForm').style.display = 'block';
    $('reqAlert').className = 'alert alert-err';
    renderReqStep();
    $('reqModal').classList.add('show');
  };
  window.closeReqModal = function () { $('reqModal').classList.remove('show'); };
  window.resetReqWizard = function () {
    RDATA.title = '';
    RSTEP = 0;
    $('reqSuccess').style.display = 'none';
    $('reqForm').style.display = 'block';
    $('reqAlert').className = 'alert alert-err';
    renderReqStep();
  };

  function showReqErr(msg) {
    var a = $('reqAlert');
    a.textContent = '⚠️ ' + msg;
    a.className = 'alert alert-err show';
    a.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  var RSTEPS = [
    function () {
      return '<h4 style="margin-bottom:14px">۱) عنوان دوره موردنظر</h4>' +
        '<div class="field"><label>دوره‌ای که دوست دارید برگزار شود را بنویسید <span class="req">*</span></label>' +
        '<input class="input" id="r_title" placeholder="مثال: تعمیرات موبایل، خیاطی لباس مجلسی..." value="' + esc(RDATA.title) + '" oninput="reqTitleInput(this.value)">' +
        '<div class="hint">اگر مشابه عنوان تایپی شما قبلاً ثبت شده باشد، همین‌جا پیشنهاد می‌شود.</div>' +
        '<div id="reqSug"></div></div>';
    },
    function () {
      return '<h4 style="margin-bottom:14px">۲) نام و نام‌خانوادگی</h4>' +
        '<div class="field"><label>نام و نام‌خانوادگی <span class="req">*</span></label>' +
        '<input class="input" id="r_full_name" placeholder="مثال: علی رضایی" value="' + esc(RDATA.full_name) + '"></div>';
    },
    function () {
      return '<h4 style="margin-bottom:14px">۳) اطلاعات تماس</h4>' +
        '<div class="form-grid">' +
        '<div class="field"><label>کد ملی (۱۰ رقم) <span class="req">*</span></label><input class="input" id="r_nc" inputmode="numeric" value="' + esc(RDATA.national_code) + '"></div>' +
        '<div class="field"><label>شماره موبایل <span class="req">*</span></label><input class="input" id="r_mobile" inputmode="tel" placeholder="09xxxxxxxxx" value="' + esc(RDATA.mobile) + '"></div>' +
        '</div>' +
        '<div class="hint">کد ملی و شماره موبایل برای پیگیری درخواست‌هایتان استفاده می‌شود؛ همان‌ها را بعداً در «🔎 پیگیری درخواست» وارد کنید.</div>';
    },
    function () {
      function row(k, v) { return '<div><span>' + k + '</span><span>' + (v || '—') + '</span></div>'; }
      return '<h4 style="margin-bottom:14px">۴) بازبینی و ثبت</h4>' +
        '<div class="review-box">' +
        row('عنوان دوره', esc(RDATA.title)) +
        row('نام و نام‌خانوادگی', esc(RDATA.full_name)) +
        row('کد ملی', esc(RDATA.national_code)) + row('موبایل', esc(RDATA.mobile)) +
        '</div>' +
        '<p style="font-size:13px; color:var(--muted); margin-top:10px">درخواست با وضعیت «فعلاً بررسی نشده» ثبت می‌شود؛ پس از بررسی کارشناسان، وضعیت را از «پیگیری درخواست‌ها» یا دکمه «📩 درخواست‌های من» ربات بله ببینید.</p>';
    }
  ];

  function renderReqStep() {
    $('reqStepper').innerHTML = RSTEP_LABELS.map(function (s, i) {
      return '<div class="st' + (i === RSTEP ? ' active' : (i < RSTEP ? ' done' : '')) + '">' + (i < RSTEP ? '✓ ' : '') + s + '</div>';
    }).join('');
    $('reqStepContent').innerHTML = RSTEPS[RSTEP]();
    $('reqPrevBtn').style.visibility = RSTEP === 0 ? 'hidden' : 'visible';
    $('reqNextBtn').textContent = RSTEP === 3 ? '📌 ثبت درخواست' : 'مرحله بعد ⬅️';
    $('reqAlert').className = 'alert alert-err';
  }

  function grabReqStep() {
    var el;
    el = $('r_title'); if (el) RDATA.title = el.value.trim();
    el = $('r_full_name'); if (el) RDATA.full_name = el.value.trim();
    el = $('r_nc'); if (el) RDATA.national_code = el.value.trim();
    el = $('r_mobile'); if (el) RDATA.mobile = el.value.trim();
  }

  function validateReqStep() {
    switch (RSTEP) {
      case 0:
        if (RDATA.title.length < 3) return 'عنوان دوره را کامل‌تر بنویسید (حداقل ۳ حرف).';
        break;
      case 1: {
        var p = RDATA.full_name.split(/\s+/);
        if (p.length < 2 || p[0].length < 2 || p.slice(1).join(' ').length < 2)
          return 'نام و نام‌خانوادگی را با هم وارد کنید (مثال: علی رضایی).';
        break;
      }
      case 2:
        if (!validNationalCode(RDATA.national_code)) return 'کد ملی ۱۰ رقمی معتبر وارد کنید.';
        if (!validMobile(RDATA.mobile)) return 'شماره موبایل با ۰۹ شروع شود و ۱۱ رقم باشد.';
        break;
    }
    return null;
  }

  /** پیشنهاد هوشمند عنوان — با تایپ، از بانک دوره‌ها و درخواست‌های قبلی */
  window.reqTitleInput = function (v) {
    RDATA.title = v.trim();
    var box = $('reqSug');
    if (!box) return;
    var q = String(v || '').replace(/\u200C/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = ''; return; }
    var hits = [];
    for (var i = 0; i < TITLES.length && hits.length < 6; i++) {
      var t = String(TITLES[i]).replace(/\u200C/g, ' ').toLowerCase();
      if (t.indexOf(q) > -1) hits.push(TITLES[i]);
    }
    if (!hits.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="sug-list">' + hits.map(function (t) {
      return '<div class="sug-item" onclick="pickReqTitle(this)" data-v="' + esc(t) + '">🔍 ' + esc(t) + '</div>';
    }).join('') + '</div>';
  };
  window.pickReqTitle = function (el) {
    var v = el.getAttribute('data-v') || '';
    if (!v) return;
    RDATA.title = v;
    var inp = $('r_title');
    if (inp) inp.value = v;
    $('reqSug').innerHTML = '';
  };

  window.nextReqStep = function () {
    grabReqStep();
    var err = validateReqStep();
    if (err) { showReqErr(err); return; }
    if (RSTEP < 3) { RSTEP++; renderReqStep(); return; }
    submitReq();
  };
  window.prevReqStep = function () { if (RSTEP > 0) { grabReqStep(); RSTEP--; renderReqStep(); } };

  function submitReq() {
    var p = RDATA.full_name.trim().split(/\s+/);
    $('reqNextBtn').disabled = true;
    $('reqNextBtn').textContent = '⏳ در حال ثبت...';
    api('saveRequest', { data: {
      title: RDATA.title,
      first_name: p[0] || '', last_name: p.slice(1).join(' ') || '',
      national_code: RDATA.national_code, mobile: RDATA.mobile
    } }).then(function (r) {
      $('reqNextBtn').disabled = false;
      $('reqNextBtn').textContent = '📌 ثبت درخواست';
      if (!r.ok) { showReqErr(r.error || 'خطا در ثبت درخواست؛ دوباره تلاش کنید.'); return; }
      $('reqForm').style.display = 'none';
      $('reqSuccess').style.display = 'block';
      $('reqSuccessCode').textContent = r.req_id;
      loadPublic(); // عنوان جدید وارد فهرست پیشنهادها شود
    }).catch(function () {
      $('reqNextBtn').disabled = false;
      $('reqNextBtn').textContent = '📌 ثبت درخواست';
      showReqErr('ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.');
    });
  }

  /* ================= پیگیری درخواست‌ها ================= */
  function reqBadgeCls(st) {
    if (st === 'فعلاً بررسی نشده') return 'b-wait';
    if (st.indexOf('اسرع وقت') > -1) return 'b-reg';
    if (st.indexOf('مربی') > -1) return 'b-soon';
    return 'b-withdraw';
  }
  window.openFollowModal = function () {
    $('followResult').innerHTML = '';
    $('followAlert').className = 'alert alert-err';
    $('followNc').value = '';
    $('followMobile').value = '';
    $('followModal').classList.add('show');
  };
  window.closeFollowModal = function () { $('followModal').classList.remove('show'); };
  window.lookupReq = function () {
    var nc = normDigits(($('followNc').value || '').trim()).replace(/\D/g, '');
    var mob = normDigits(($('followMobile').value || '').trim()).replace(/[+\s-]/g, '');
    if (mob.length === 12 && mob.indexOf('98') === 0) mob = '0' + mob.slice(2); // +98/98xxx
    if (mob.length === 10 && mob.charAt(0) === '9') mob = '0' + mob;             // بدون صفر اول
    $('followAlert').className = 'alert alert-err';
    if (!validNationalCode(nc)) {
      var a = $('followAlert');
      a.textContent = '⚠️ کد ملی ۱۰ رقمی معتبر را وارد کنید.';
      a.className = 'alert alert-err show';
      return;
    }
    if (!validMobile(mob)) {
      var a2 = $('followAlert');
      a2.textContent = '⚠️ شماره موبایل با ۰۹ شروع شود و ۱۱ رقم باشد.';
      a2.className = 'alert alert-err show';
      return;
    }
    $('followResult').innerHTML = '<p style="color:var(--muted)">⏳ در حال جستجو...</p>';
    api('myRequests', { national_code: nc, mobile: mob }).then(function (r) {
      if (!r.ok) {
        $('followResult').innerHTML = '';
        var a = $('followAlert');
        a.textContent = '⚠️ ' + (r.error || 'خطا در جستجو');
        a.className = 'alert alert-err show';
        return;
      }
      if (!r.rows.length) {
        $('followResult').innerHTML = '<div class="follow-card" style="text-align:center; color:var(--muted)">درخواستی با این کد ملی و شماره موبایل ثبت نشده است.<br><small>اگر درخواست دارید اما با شماره دیگری ثبت کرده‌اید، همان شماره را وارد کنید.</small></div>';
        return;
      }
      $('followResult').innerHTML = '<div class="follow-card"><h4 style="margin-bottom:8px">درخواست‌های شما:</h4>' +
        r.rows.map(function (x) {
          return '<div class="follow-item"><b>' + esc(x.title) + '</b>' +
            (x.category ? ' <span class="badge b-open">' + esc(x.category) + '</span>' : '') +
            '<br><span class="badge ' + reqBadgeCls(x.status) + '">' + esc(x.status) + '</span>' +
            '<br><small style="color:var(--muted)">ثبت: ' + esc(x.created_at) +
            (x.updated_at && x.updated_at !== x.created_at ? ' | آخرین بررسی: ' + esc(x.updated_at) : '') +
            ' | کد پیگیری: ' + esc(x.id) + '</small></div>';
        }).join('') + '</div>';
    }).catch(function () {
      $('followResult').innerHTML = '';
      var a = $('followAlert');
      a.textContent = '⚠️ ارتباط با سرور برقرار نشد.';
      a.className = 'alert alert-err show';
    });
  };

  // بستن مودال با کلیک بیرون یا Escape
  $('regModal').addEventListener('click', function (e) { if (e.target === this) closeRegModal(); });
  $('reqModal').addEventListener('click', function (e) { if (e.target === this) closeReqModal(); });
  $('followModal').addEventListener('click', function (e) { if (e.target === this) closeFollowModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeRegModal(); closeReqModal(); closeFollowModal(); }
  });

  loadPublic();
})();
