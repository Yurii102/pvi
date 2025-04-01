const bell = document.getElementById('bell');
const notificationDot = document.getElementById('notificationDot');
const notificationPopup = document.getElementById('notificationPopup');
const bellIcon = document.getElementById('bellIcon');
const profile = document.getElementById('user');
const profilePopup = document.getElementById('profilePopup');

let clickTimer;
bell.addEventListener('click', () => {
    clearTimeout(clickTimer); 
    clickTimer = setTimeout(() => {
        window.open('./messages.html', '_blank');
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