const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Login');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.css') && f !== 'sidebar.css');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Improved regex to catch variations of sidebar styles
    // Matches .sidebar, .sidebar-logo, .nav-links, .logout-section and their blocks
    const sidebarRegex = /\/\*.*القائمة الجانبية.*\*\/[\s\S]*?\.logout-section\s*\{[\s\S]*?\}/g;
    const sidebarBlockRegex = /\.sidebar\s*\{[\s\S]*?\}\s*\.sidebar-logo[\s\S]*?\.logout-section\s*\{[\s\S]*?\}/g;

    let newContent = content;

    if (sidebarRegex.test(content)) {
        newContent = content.replace(sidebarRegex, '/* Sidebar styles handled by sidebar.css */');
    } else if (sidebarBlockRegex.test(content)) {
        newContent = content.replace(sidebarBlockRegex, '/* Sidebar styles handled by sidebar.css */');
    } else {
        // Fallback: search and remove individual sidebar classes if they exist
        const classesToRemove = ['.sidebar', '.sidebar-logo', '.nav-links', '.logout-section'];
        classesToRemove.forEach(cls => {
            const regex = new RegExp('\\' + cls + '\\s*\\{[\\s\\S]*?\\}', 'g');
            newContent = newContent.replace(regex, '');
        });
    }

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Cleaned up ${file}`);
    }
}
