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
    { id: 'C100', title: 'آموزش خیاطی مقدماتی', category: 'خانگی', capacity: 20, registered: 8, start_date: '1404/09/05', schedule: 'شنبه و دوشنبه ۹ تا ۱۱', description: 'آموزش از صفر تا دوخت لباس ساده' },
    { id: 'C101', title: 'مهارت‌های ICDL (رایانه)', category: 'رایانه‌ای', capacity: 15, registered: 11, start_date: '1404/09/10', schedule: 'یکشنبه و سه‌شنبه ۱۶ تا ۱۸', description: 'ویندوز، Word، Excel، اینترنت' },
    { id: 'C102', title: 'آشپزی و شیرینی‌پزی', category: 'خانگی', capacity: 12, registered: 4, start_date: '1404/09/15', schedule: 'چهارشنبه ۹ تا ۱۲', description: 'کاربردی با آزمون فنی‌وحرفه‌ای' }
  ];
  function demoApi(action) {
    if (action === 'publicInfo')
      return Promise.resolve({
        ok: true,
        center: { name: 'مرکز آموزش مهارتی (نمونه)', phone: '۰۲۱-۱۲۳۴۵۶۷۸', address: 'تهران، خیابان نمونه', bot_username: '' },
        courses: DEMO_COURSES
      });
    if (action === 'webRegister')
      return new Promise(function (res) {
        setTimeout(function () { res({ ok: true, reg_code: 'R-' + (10000 + Math.floor(Math.random() * 9000)) }); }, 600);
      });
    return Promise.resolve({ ok: false, error: 'حالت نمایشی' });
  }

  /* ================= بارگذاری اولیه ================= */
  var CENTER = null, COURSES = [];

  function loadPublic() {
    if (DEMO) $('demoBanner').classList.add('show');
    api('publicInfo').then(function (r) {
      if (!r.ok) return;
      CENTER = r.center; COURSES = r.courses;
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
      return '<div class="course-card">' +
        '<div class="chips"><span class="badge b-open">' + esc(c.category || 'عمومی') + '</span></div>' +
        '<h3>' + esc(c.title) + '</h3>' +
        '<div class="meta">' +
        (c.start_date ? '<div>📅 شروع: ' + esc(c.start_date) + '</div>' : '') +
        (c.schedule ? '<div>⏰ ' + esc(c.schedule) + '</div>' : '') +
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
          '<span><b>' + esc(c.title) + '</b><br><small style="color:var(--muted)">' + esc(c.start_date || '') + (c.schedule ? ' — ' + esc(c.schedule) : '') + '</small></span>' +
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

  // بستن مودال با کلیک بیرون یا Escape
  $('regModal').addEventListener('click', function (e) { if (e.target === this) closeRegModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeRegModal(); });

  loadPublic();
})();
