// js/auth.js - Authentication using Supabase
import supabase from './supabase.js';

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
  // Dispatch event so dashboard.js and other scripts know auth is ready
  window.__zenotalAuthReady = true;
  document.dispatchEvent(new CustomEvent('zenotal:authReady', {
    detail: { user: currentUser }
  }));
})();

// Restore session (handles magic link callback via URL hash automatically)
async function restoreSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      currentUser = data.session.user;
      const prevGuestId = localStorage.getItem('guestId');
      localStorage.setItem('userId', currentUser.id);
      // Migrate any guest sessions to the authenticated user
      if (prevGuestId && prevGuestId !== currentUser.id && typeof window.migrateGuestSessions === 'function') {
        await window.migrateGuestSessions(prevGuestId, currentUser.id);
      }
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

// Listen for auth state changes (handles OAuth redirects and magic link)
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const prevGuestId = localStorage.getItem('guestId');
    currentUser = session.user;
    localStorage.setItem('userId', currentUser.id);
    // Migrate guest sessions when user signs in
    if (prevGuestId && prevGuestId !== currentUser.id && typeof window.migrateGuestSessions === 'function') {
      await window.migrateGuestSessions(prevGuestId, currentUser.id);
    }
  } else {
    currentUser = null;
    localStorage.removeItem('userId');
    ensureGuestId();
  }
  updateAuthUI();
  // Re-dispatch auth ready so dashboard can react to sign-in/sign-out
  document.dispatchEvent(new CustomEvent('zenotal:authReady', {
    detail: { user: currentUser }
  }));
});

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
      const displayName = currentUser.user_metadata?.name || currentUser.email;
      const initials = getInitials(displayName);
      userInfo.innerHTML = `
        <a href="dashboard.html" class="auth-avatar" title="${displayName}">${initials}</a>
      `;
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name || '' },
      emailRedirectTo: window.location.origin + '/dashboard.html'
    }
  });

  setLoading(btn, false);

  if (error) {
    showError('auth-signup-form', error.message || 'Sign up failed.');
    return;
  }

  // Show the verify step — but now we tell the user to click the link in their email
  // (Supabase sends a magic link by default; the verify form shows a friendly message)
  switchModalMode('verify');
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  setLoading(btn, false);

  if (error) {
    showError('auth-signin-form', error.message || 'Sign in failed.');
    return;
  }

  if (data?.user) {
    currentUser = data.user;
    const prevGuestId = localStorage.getItem('guestId');
    localStorage.setItem('userId', currentUser.id);
    // Migrate guest sessions on sign-in
    if (prevGuestId && prevGuestId !== currentUser.id && typeof window.migrateGuestSessions === 'function') {
      await window.migrateGuestSessions(prevGuestId, currentUser.id);
    }
    updateAuthUI();
    closeAuthModal();
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 300);
  }
}

async function handleVerify(e) {
  // This form is now just a "check your email" screen — no OTP input needed.
  // The magic link in the email handles verification automatically.
  e.preventDefault();
  closeAuthModal();
}

async function handleResendCode() {
  // Not used in magic link flow, but kept for compatibility
}

async function handleOAuth(provider) {
  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + '/dashboard.html' },
  });
}

async function handleSignOut() {
  await supabase.auth.signOut();
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

  // OAuth
  document.getElementById('auth-oauth-google')?.addEventListener('click', () => handleOAuth('google'));
  document.getElementById('auth-oauth-github')?.addEventListener('click', () => handleOAuth('github'));

  // Clear errors on input change
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

// Get initials from name or email
function getInitials(str) {
  if (!str) return '?';
  if (str.includes('@')) {
    return str.charAt(0).toUpperCase();
  }
  var parts = str.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
}

// Expose for other modules
window.openAuthModal = openAuthModal;
window.handleSignOut = handleSignOut;
window.getCurrentUser = function() { return currentUser; };
