const bell = document.getElementById('bell');
const notificationDot = document.getElementById('notificationDot');
const notificationPopup = document.getElementById('notificationPopup');
const bellIcon = document.getElementById('bellIcon');
const profile = document.getElementById('user');
const profilePopup = document.getElementById('profilePopup');

const isLoggedIn = bell.dataset.loggedin === "true";

let clickTimer;
bell.addEventListener('click', (event) => {
    if (!isLoggedIn) {
        event.preventDefault(); // блокує дію
        alert("Спочатку потрібно увійти в систему");
        return;
    }
    clearTimeout(clickTimer); 
    clickTimer = setTimeout(() => {
        window.open('/studentApp/index.php?page=messages', '_blank');
        notificationDot.style.display = 'none';
    }, 300);
    
});

bellIcon.addEventListener('dblclick', () => {
    clearTimeout(clickTimer);
    bellIcon.classList.add('bell-animation');
    
    bellIcon.addEventListener('animationend', () => {
        notificationDot.style.display = 'block';
        setTimeout(() => {
        }, 10);
        
        bellIcon.classList.remove('bell-animation');
    }, { once: true });
});





// FIXED: Profile popup event listeners should execute when the user IS logged in (removed the negation)
if (isLoggedIn) {
    // Updated event listeners for bell notifications
    bell.addEventListener('mouseover', () => {
        notificationPopup.classList.add('visible');
    });
    bell.addEventListener('mouseout', () => {
        notificationPopup.classList.remove('visible');
    });
    // Updated event listeners for profile popup
    profile.addEventListener('mouseover', () => {
        profilePopup.classList.add('visible');
    });

    profile.addEventListener('mouseout', () => {
        profilePopup.classList.remove('visible');
    });
}

const loginButton = document.getElementById('loginButton');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginCancelBtn = document.getElementById('login-cancel-btn');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const modalOverlay = document.getElementById('modal-overlay');

// Make sure login button works
if (loginButton) {
    loginButton.addEventListener('click', () => {
        if (loginModal) {
            loginModal.style.display = 'block';
            setTimeout(() => {
                loginModal.classList.add('show');
                if (modalOverlay) {
                    modalOverlay.classList.add('show');
                    modalOverlay.style.display = 'block';
                }
            }, 10);
        }
    });
}

// Close modal when X is clicked
if (closeLoginModal) {
    closeLoginModal.addEventListener('click', closeLoginModalFunc);
}

// Close modal when Cancel is clicked
if (loginCancelBtn) {
    loginCancelBtn.addEventListener('click', closeLoginModalFunc);
}

function closeLoginModalFunc() {
    if (loginModal) {
        loginModal.classList.remove('show');
        
        if (modalOverlay) {
            modalOverlay.classList.remove('show');
            
            setTimeout(() => {
                loginModal.style.display = 'none';
                modalOverlay.style.display = 'none';
            }, 300);
        } else {
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);
        }
    }
}

// Close modal when clicking outside of it
if (modalOverlay) {
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            closeLoginModalFunc();
        }
    });
}

// Form submission handling
if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.submit();
        }
    });
}