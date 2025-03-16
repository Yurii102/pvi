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
        
        bellIcon.classList.remove('bell-animation');
    }, { once: true });
});

bell.addEventListener('mouseover', () => {
    notificationPopup.style.display = 'block';
});

bell.addEventListener('mouseout', () => {
    notificationPopup.style.display = 'none';
});

profile.addEventListener('mouseover', () => {
    profilePopup.style.display = 'block';
});

profile.addEventListener('mouseout', () => {
    profilePopup.style.display = 'none';
});