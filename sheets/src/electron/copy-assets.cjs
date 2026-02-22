const fs = require('fs');
const path = require('path');

// Исправляем пути - script находится в sheets/src/electron
const projectRoot = path.join(__dirname, '..'); // sheets/src
const srcDir = path.join(projectRoot, 'electron', 'src'); // sheets/src/electron/src
const distDir = path.join(projectRoot, 'electron', 'dist'); // sheets/src/electron/dist

console.log('Project root:', projectRoot);
console.log('Src dir:', srcDir);
console.log('Dist dir:', distDir);

// Функция рекурсивного копирования
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Пропускаем node_modules
      if (entry.name === 'node_modules') continue;
      console.log(`[Copy] Entering directory: ${entry.name}`);
      copyDir(srcPath, destPath);
    } else {
      // Копируем HTML, CSS, JS и JSON файлы
      if (entry.name.endsWith('.html') || entry.name.endsWith('.css') || entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[Copy] Copied: ${path.relative(srcDir, srcPath)}`);
      } else {
        console.log(`[Copy] Skipped: ${entry.name} (not matching extension)`);
      }
    }
  }
}

// Копируем UI директорию
const uiSrc = path.join(srcDir, 'ui');
const uiDest = path.join(distDir, 'ui');
console.log('Copying UI from:', uiSrc, 'to:', uiDest);
copyDir(uiSrc, uiDest);

// Копируем app.js если существует
const appJsSrc = path.join(srcDir, 'app.js');
const appJsDest = path.join(distDir, 'app.js');
if (fs.existsSync(appJsSrc)) {
  fs.copyFileSync(appJsSrc, appJsDest);
  console.log('[Copy] Copied: app.js');
}

// Также копируем ВСЕ .js файлы из src/ в dist/ (рекурсивно)
function copyAllJS(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      copyAllJS(srcPath, destPath);
    } else if (entry.name.endsWith('.js')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[CopyJS] ${path.relative(srcDir, srcPath)}`);
    }
  }
}

console.log('Copying all .js files from src to dist...');
copyAllJS(srcDir, distDir);

// Копируем themes-gallery.json в корень dist
const themesSrc = path.join(srcDir, 'ui', 'themes', 'themes-gallery.json');
const themesDest = path.join(distDir, 'themes-gallery.json');
if (fs.existsSync(themesSrc)) {
  fs.copyFileSync(themesSrc, themesDest);
  console.log('Copied: themes-gallery.json');
}

// Копируем index.html
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(distDir, 'index.html'));
console.log('Copied: index.html');

console.log('Asset copy completed!');
