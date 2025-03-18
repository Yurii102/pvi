const links = document.querySelectorAll(".sidebar a"); 
let currentPath = window.location.pathname.split("/").pop(); 

// Якщо поточний шлях порожній, то це index.html
if (!currentPath) {
    currentPath = "index.html";
}

links.forEach(link => {
    if (link.getAttribute("href") === `./${currentPath}` || link.getAttribute("href") === currentPath) {
        link.classList.add("active"); 
    }
});