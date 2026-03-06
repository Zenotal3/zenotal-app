import insforge from './insforge.js';

// Generate a UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Current user state
let currentUser = null;

// Initialize auth on load
(async () => {
  await restoreSession();
  updateAuthUI();
  setupEventListeners();
})();

// Restore session from InsForge
async function restoreSession() {
  try {
    const { data, error } = await insforge.auth.getCurrentSession();
    if (data?.session?.user) {
      currentUser = data.session.user;
      localStorage.setItem('userId', currentUser.id);
    } else {
      currentUser = null;
      localStorage.removeItem('userId');
      ensureGuestId();
    }
  } catch (e) {
    console.error('Failed to restore session:', e);
    currentUser = null;
    localStorage.removeItem('userId');
    ensureGuestId();
  }
}

// Ensure a guest ID exists
function ensureGuestId() {
  if (!localStorage.getItem('guestId')) {
    localStorage.setItem('guestId', 'guest_' + generateUUID());
  }
}

// Update header UI based on auth state
function updateAuthUI() {
  const signInBtn = document.getElementById('auth-sign-in');
  const signUpBtn = document.getElementById('auth-sign-up');
  const dashboardLink = document.getElementById('dashboard-link');
  const userInfo = document.getElementById('auth-user-info');

  if (currentUser) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (signUpBtn) signUpBtn.style.display = 'none';
    if (dashboardLink) dashboardLink.style.display = 'inline-block';
    if (userInfo) {
      userInfo.style.display = 'flex';
      const displayName = currentUser.profile?.name || currentUser.email;
      userInfo.innerHTML = `
        <span class="auth-user-email">${displayName}</span>
        <button id="auth-sign-out" class="auth-btn auth-btn-signout">Sign Out</button>
      `;
      document.getElementById('auth-sign-out')?.addEventListener('click', handleSignOut);
    }
  } else {
    if (signInBtn) signInBtn.style.display = 'block';
    if (signUpBtn) signUpBtn.style.display = 'block';
    if (dashboardLink) dashboardLink.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'none';
      userInfo.innerHTML = '';
    }
  }
}

// Set up button listeners
function setupEventListeners() {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('auth-sign-in')?.addEventListener('click', () => openAuthModal('signin'));
    document.getElementById('auth-sign-up')?.addEventListener('click', () => openAuthModal('signup'));
  });

  // Also bind immediately if DOM already loaded
  if (document.readyState !== 'loading') {
    document.getElementById('auth-sign-in')?.addEventListener('click', () => openAuthModal('signin'));
    document.getElementById('auth-sign-up')?.addEventListener('click', () => openAuthModal('signup'));
  }
}

// ─── Modal ───────────────────────────────────────────────────────────

function openAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('show');
  switchModalMode(mode);
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('show');
  clearErrors();
  clearInputs();
}

function switchModalMode(mode) {
  document.getElementById('auth-signup-form')?.classList.toggle('active', mode === 'signup');
  document.getElementById('auth-signin-form')?.classList.toggle('active', mode === 'signin');
  document.getElementById('auth-verify-form')?.classList.toggle('active', mode === 'verify');
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function clearInputs() {
  document.querySelectorAll('#auth-modal input').forEach(el => {
    el.value = '';
  });
}

function showError(formId, message) {
  const errorEl = document.querySelector(`#${formId} .auth-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Please wait...' : btn.dataset.originalText;
}

// ─── Auth Handlers ───────────────────────────────────────────────────

// Email for verification (stored between sign-up and verify steps)
let pendingVerificationEmail = '';

async function handleSignUp(e) {
  e.preventDefault();
  const form = document.getElementById('auth-signup-form');
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const name = form.querySelector('[name="name"]').value.trim();
  const btn = form.querySelector('button[type="submit"]');

  if (!email || !password) {
    showError('auth-signup-form', 'Email and password are required.');
    return;
  }

  setLoading(btn, true);

  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name: name || undefined,
  });

  setLoading(btn, false);

  if (error) {
    showError('auth-signup-form', error.message || 'Sign up failed.');
    return;
  }

  if (data?.requireEmailVerification) {
    pendingVerificationEmail = email;
    switchModalMode('verify');
  } else if (data?.accessToken) {
    currentUser = data.user;
    localStorage.setItem('userId', currentUser.id);
    updateAuthUI();
    closeAuthModal();
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  const form = document.getElementById('auth-signin-form');
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const btn = form.querySelector('button[type="submit"]');

  if (!email || !password) {
    showError('auth-signin-form', 'Email and password are required.');
    return;
  }

  setLoading(btn, true);

  const { data, error } = await insforge.auth.signInWithPassword({ email, password });

  setLoading(btn, false);

  if (error) {
    showError('auth-signin-form', error.message || 'Sign in failed.');
    return;
  }

  if (data?.user) {
    currentUser = data.user;
    localStorage.setItem('userId', currentUser.id);
    updateAuthUI();
    closeAuthModal();

    // Resume pending navigation
    const pending = sessionStorage.getItem('pendingNavigation');
    if (pending) {
      sessionStorage.removeItem('pendingNavigation');
      setTimeout(() => {
        if (window.navigateTo) window.navigateTo(pending);
      }, 300);
    }
  }
}

async function handleVerify(e) {
  e.preventDefault();
  const form = document.getElementById('auth-verify-form');
  const code = form.querySelector('[name="code"]').value.trim();
  const btn = form.querySelector('button[type="submit"]');

  if (!code) {
    showError('auth-verify-form', 'Please enter the verification code.');
    return;
  }

  setLoading(btn, true);

  const { data, error } = await insforge.auth.verifyEmail({
    email: pendingVerificationEmail,
    otp: code,
  });

  setLoading(btn, false);

  if (error) {
    showError('auth-verify-form', error.message || 'Verification failed.');
    return;
  }

  if (data?.user) {
    currentUser = data.user;
    localStorage.setItem('userId', currentUser.id);
    updateAuthUI();
    closeAuthModal();
  }
}

async function handleResendCode() {
  if (!pendingVerificationEmail) return;
  const { error } = await insforge.auth.resendVerificationEmail({
    email: pendingVerificationEmail,
  });
  const resendLink = document.getElementById('auth-resend-code');
  if (resendLink) {
    resendLink.textContent = error ? 'Failed — try again' : 'Code sent!';
    setTimeout(() => { resendLink.textContent = 'Resend code'; }, 3000);
  }
}

async function handleOAuth(provider) {
  await insforge.auth.signInWithOAuth({
    provider,
    redirectTo: window.location.origin + window.location.pathname,
  });
}

async function handleSignOut() {
  await insforge.auth.signOut();
  currentUser = null;
  localStorage.removeItem('userId');
  ensureGuestId();
  updateAuthUI();
}

// ─── DOM Bindings (after DOMContentLoaded) ───────────────────────────

function bindModalEvents() {
  // Close
  document.getElementById('auth-modal-close')?.addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') closeAuthModal();
  });

  // Forms
  document.getElementById('auth-signup-form')?.addEventListener('submit', handleSignUp);
  document.getElementById('auth-signin-form')?.addEventListener('submit', handleSignIn);
  document.getElementById('auth-verify-form')?.addEventListener('submit', handleVerify);

  // Toggle links
  document.getElementById('auth-goto-signin')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearErrors();
    switchModalMode('signin');
  });
  document.getElementById('auth-goto-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearErrors();
    switchModalMode('signup');
  });

  // Resend code
  document.getElementById('auth-resend-code')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleResendCode();
  });

  // OAuth
  document.getElementById('auth-oauth-google')?.addEventListener('click', () => handleOAuth('google'));
  document.getElementById('auth-oauth-github')?.addEventListener('click', () => handleOAuth('github'));

  // Clear errors on input change (fixes issue #2)
  document.querySelectorAll('#auth-modal input').forEach(input => {
    input.addEventListener('input', () => {
      const form = input.closest('form');
      if (form) {
        const errorEl = form.querySelector('.auth-error');
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.style.display = 'none';
        }
      }
    });
  });
}

// Bind when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindModalEvents);
} else {
  bindModalEvents();
}

// Expose for other modules
window.openAuthModal = openAuthModal;
