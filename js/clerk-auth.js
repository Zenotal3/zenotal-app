import { Clerk } from '@clerk/clerk-js';

// Initialize Clerk
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('Missing Clerk Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file');
}

// Initialize clerk with async IIFE to avoid top-level await
(async () => {
  const clerk = new Clerk(clerkPubKey);
  await clerk.load();

  // Make clerk available globally for other scripts
  window.clerk = clerk;

  // Update UI after clerk is loaded
  updateAuthUI();

  // Set up auth state listener
  setupAuthListener();
})();

// Update UI based on authentication state
function updateAuthUI() {
  const signInBtn = document.getElementById('clerk-sign-in');
  const signUpBtn = document.getElementById('clerk-sign-up');
  const userBtnContainer = document.getElementById('clerk-user-button');

  if (clerk.user) {
    // User is signed in
    if (signInBtn) signInBtn.style.display = 'none';
    if (signUpBtn) signUpBtn.style.display = 'none';
    if (userBtnContainer) {
      userBtnContainer.style.display = 'flex';
      // Mount Clerk's UserButton component
      clerk.mountUserButton(userBtnContainer, {
        appearance: {
          elements: {
            userButtonAvatarBox: 'user-avatar',
            userButtonBox: 'user-menu-btn'
          }
        }
      });
    }
  } else {
    // User is signed out
    if (signInBtn) signInBtn.style.display = 'block';
    if (signUpBtn) signUpBtn.style.display = 'block';
    if (userBtnContainer) {
      userBtnContainer.style.display = 'none';
      userBtnContainer.innerHTML = ''; // Clear the mounted component
    }
  }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Sign In button
  const signInBtn = document.getElementById('clerk-sign-in');
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      if (window.clerk) {
        window.clerk.openSignIn();
      }
    });
  }

  // Sign Up button
  const signUpBtn = document.getElementById('clerk-sign-up');
  if (signUpBtn) {
    signUpBtn.addEventListener('click', () => {
      if (window.clerk) {
        window.clerk.openSignUp();
      }
    });
  }
});

// Set up auth state listener after clerk is loaded
function setupAuthListener() {
  if (window.clerk) {
    window.clerk.addListener((resources) => {
      updateAuthUI();

      // If user just signed in and was trying to access protected content, continue navigation
      if (resources.user && sessionStorage.getItem('pendingNavigation')) {
        const destination = sessionStorage.getItem('pendingNavigation');
        sessionStorage.removeItem('pendingNavigation');

        // Small delay to ensure everything is loaded
        setTimeout(() => {
          if (window.navigateTo && destination) {
            window.navigateTo(destination);
          }
        }, 500);
      }
    });
  }
}
