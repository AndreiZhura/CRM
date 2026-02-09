// Этот код должен быть на КАЖДОЙ странице
document.addEventListener('DOMContentLoaded', function() {
    const burgerBtn = document.getElementById('burgerBtn');
    const headerNav = document.getElementById('headerNav');

    if (burgerBtn && headerNav) {
        burgerBtn.addEventListener('click', function() {
            headerNav.classList.toggle('active');
            burgerBtn.classList.toggle('open');
            console.log("Global burger menu toggled");
        });
    }
});