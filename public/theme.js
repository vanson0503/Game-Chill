(function () {
    function applyTheme() {
        const theme = localStorage.getItem('theme');
        const btn = document.getElementById('theme-btn');
        if (theme === 'cute') {
            document.body.classList.add('cute-mode');
            if (btn) btn.innerText = "🌸 Cute Mode";
        } else {
            document.body.classList.remove('cute-mode');
            if (btn) btn.innerText = "🌙 Zen Mode";
        }
    }

    // Expose toggle globally
    window.toggleTheme = function () {
        document.body.classList.toggle('cute-mode');
        const isCute = document.body.classList.contains('cute-mode');
        const btn = document.getElementById('theme-btn');

        if (isCute) {
            localStorage.setItem('theme', 'cute');
            if (btn) btn.innerText = "🌸 Cute Mode";
        } else {
            localStorage.setItem('theme', 'zen');
            if (btn) btn.innerText = "🌙 Zen Mode";
        }
    }

    // Apply on load
    window.addEventListener('load', applyTheme);
})();
