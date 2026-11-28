// ===== Chợ UEH - Auth (Login & Register) =====

document.addEventListener('DOMContentLoaded', async () => {
  // Show/hide password: the eye button sits inside each password field.
  document.querySelectorAll('[data-toggle-pw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      btn.firstElementChild.textContent = show ? 'visibility_off' : 'visibility';
    });
  });

  // Forgot password: ask for a reset link by email or MSSV.
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    const done = document.getElementById('forgot-done');
    const errorDiv = document.getElementById('forgot-error');
    const btn = document.getElementById('forgot-btn');
    const label = btn.innerHTML;
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      if (!email) {
        errorDiv.textContent = 'Vui lòng nhập email UEH hoặc MSSV';
        errorDiv.classList.remove('hidden');
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang gửi...';
      errorDiv.classList.add('hidden');
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không gửi được yêu cầu');
        done.querySelector('[data-done-msg]').textContent = data.message;
        forgotForm.hidden = true;
        done.hidden = false;
      } catch (err) {
        errorDiv.textContent = err.message === 'Failed to fetch' ? 'Lỗi kết nối server. Vui lòng thử lại.' : err.message;
        errorDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
    done.querySelector('[data-again]').addEventListener('click', () => {
      done.hidden = true;
      forgotForm.hidden = false;
    });
  }

  // Reset password: the token comes from the emailed link, then leaves the address bar.
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    const token = new URLSearchParams(location.search).get('token') || '';
    history.replaceState(null, '', '/reset-password');
    const errorDiv = document.getElementById('reset-error');
    const btn = document.getElementById('reset-btn');
    const label = btn.innerHTML;
    const fail = (msg) => { errorDiv.textContent = msg; errorDiv.classList.remove('hidden'); };
    if (!token) fail('Link không hợp lệ. Hãy mở đúng link trong email, hoặc yêu cầu link mới.');
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('reset-password').value;
      const confirm = document.getElementById('reset-confirm').value;
      if (password.length < 6) return fail('Mật khẩu phải có ít nhất 6 ký tự');
      if (password !== confirm) return fail('Mật khẩu xác nhận không khớp');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang lưu...';
      errorDiv.classList.add('hidden');
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không đặt được mật khẩu');
        window.AppUtils.saveAuth(data.user);
        window.AppUtils.showToast('Đã đặt mật khẩu mới, bạn đã được đăng nhập!', 'success');
        setTimeout(() => { window.location.href = '/'; }, 900);
      } catch (err) {
        fail(err.message === 'Failed to fetch' ? 'Lỗi kết nối server. Vui lòng thử lại.' : err.message);
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  }

  const existingUser = window.AppUtils.getUser() || await window.AppUtils.syncCurrentUser();
  if (existingUser) {
    const path = window.location.pathname;
    if (path === '/login' || path === '/register') {
      window.location.href = '/';
      return;
    }
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const errorDiv = document.getElementById('login-error');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        errorDiv.textContent = 'Vui lòng nhập đầy đủ thông tin';
        errorDiv.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang đăng nhập...';
      errorDiv.classList.add('hidden');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          window.AppUtils.saveAuth(data.user);
          window.AppUtils.showToast('Đăng nhập thành công!', 'success');
          setTimeout(() => window.location.href = '/', 500);
        } else {
          errorDiv.textContent = data.message;
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorDiv.textContent = 'Lỗi kết nối server. Vui lòng thử lại.';
        errorDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Đăng nhập <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
      }
    });
  }

  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('register-btn');
      const errorDiv = document.getElementById('register-error');

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const studentId = document.getElementById('reg-studentId').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const department = document.getElementById('reg-department').value;
      const year = document.getElementById('reg-year').value;
      const password = document.getElementById('reg-password').value;
      const confirm = document.getElementById('reg-confirm').value;

      if (!name || !email || !studentId || !password) {
        errorDiv.textContent = 'Vui lòng điền các trường bắt buộc (*)';
        errorDiv.classList.remove('hidden');
        return;
      }

      if (password.length < 6) {
        errorDiv.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
        errorDiv.classList.remove('hidden');
        return;
      }

      if (password !== confirm) {
        errorDiv.textContent = 'Mật khẩu xác nhận không khớp';
        errorDiv.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang đăng ký...';
      errorDiv.classList.add('hidden');

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, studentId, phone, department: department || undefined, year: year || undefined, password })
        });
        const data = await res.json();

        if (data.success) {
          window.AppUtils.saveAuth(data.user);
          window.AppUtils.showToast('Đăng ký thành công!', 'success');
          setTimeout(() => window.location.href = '/', 500);
        } else {
          errorDiv.textContent = data.message;
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorDiv.textContent = 'Lỗi kết nối server. Vui lòng thử lại.';
        errorDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Đăng ký ngay <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
      }
    });
  }
});
