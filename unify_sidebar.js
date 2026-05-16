const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Login');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Find <nav class="sidebar"> ... </nav>
    const startIdx = content.indexOf('<nav class="sidebar">');
    const endIdx = content.indexOf('</nav>', startIdx);

    if (startIdx !== -1 && endIdx !== -1) {
        const replacement = `<app-sidebar></app-sidebar>\n        <script src="sidebar.js"></script>`;
        content = content.substring(0, startIdx) + replacement + content.substring(endIdx + 6);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}
