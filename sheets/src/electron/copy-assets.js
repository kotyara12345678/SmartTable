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
      copyDir(srcPath, destPath);
    } else {
      // Копируем только HTML и CSS файлы
      if (entry.name.endsWith('.html') || entry.name.endsWith('.css')) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${entry.name}`);
      }
    }
  }
}

// Копируем UI директорию
const uiSrc = path.join(srcDir, 'ui');
const uiDest = path.join(distDir, 'ui');
console.log('Copying UI from:', uiSrc, 'to:', uiDest);
copyDir(uiSrc, uiDest);

// Копируем index.html
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(distDir, 'index.html'));
console.log('Copied: index.html');

console.log('Asset copy completed!');
