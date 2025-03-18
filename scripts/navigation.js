const links = document.querySelectorAll(".sidebar a"); 
let currentPath = window.location.pathname.split("/").pop();

console.log(currentPath);

// Якщо поточний шлях порожній, то це index.html
if (!currentPath) {
    currentPath = "index.html";
}

links.forEach(link => {
    if (link.getAttribute("href") === `./${currentPath}` || link.getAttribute("href") === currentPath) {
        link.classList.add("active"); 
    }
});

function checkWindowSize() {
    const sidebar = document.querySelector(".sidebar");
    const burgerMenu = document.getElementById("burger-menu");
    const content = document.querySelector(".content");

    if (sidebar && burgerMenu && content) {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove("open");
            burgerMenu.classList.remove("active");
            content.style.marginLeft = "0"; 
        } else {
            sidebar.classList.remove("open");
            burgerMenu.classList.remove("active");
            content.style.marginLeft = "180px"; 
        }
    }
}

window.addEventListener("load", checkWindowSize);
window.addEventListener("resize", checkWindowSize);

const burgerMenu = document.getElementById("burger-menu");
const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");

if (burgerMenu) {
    burgerMenu.addEventListener("click", function() {
        if (sidebar && content) {
            sidebar.classList.toggle("open");
            burgerMenu.classList.toggle("active");
        
            content.style.marginLeft = sidebar.classList.contains("open") ? "0" : "0";
        }
    });
}

links.forEach(link => {
    link.addEventListener("click", function() {
        if (window.innerWidth <= 768 && sidebar && burgerMenu && content) {
            sidebar.classList.remove("open");
            burgerMenu.classList.remove("active");
            content.style.marginLeft = "0";
        }
    });
});

document.addEventListener("click", function(event) {
    const isClickInsideSidebar = sidebar && sidebar.contains(event.target);
    const isClickOnBurger = burgerMenu && burgerMenu.contains(event.target);
    
    if (sidebar && !isClickInsideSidebar && !isClickOnBurger && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        burgerMenu.classList.remove("active");
        content.style.marginLeft = "0";
    }
});
