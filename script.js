const bell = document.getElementById('bell');
const notificationDot = document.getElementById('notificationDot');
const notificationPopup = document.getElementById('notificationPopup');
const bellIcon = document.getElementById('bellIcon');

bell.addEventListener('click', () => {
    window.open('messages.html', '_blank');
    notificationDot.style.display = 'none';

});

bell.addEventListener('mouseover', () => {
    notificationPopup.style.display = 'block';
});

bell.addEventListener('mouseout', () => {
    notificationPopup.style.display = 'none';
});