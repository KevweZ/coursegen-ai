const fs = require('fs');

// Fix PlayerPropertiesModal: change 'roman' -> 'numbered' in union type
let m = fs.readFileSync('src/components/builder/PlayerPropertiesModal.tsx','utf8');
m = m.split("'icons' | 'roman'").join("'icons' | 'numbered'");
fs.writeFileSync('src/components/builder/PlayerPropertiesModal.tsx',m,'utf8');
console.log('Fixed modal type');

// Fix CourseNavSidebar: change 'roman' -> 'numbered' in union type
let s = fs.readFileSync('src/components/player/CourseNavSidebar.tsx','utf8');
s = s.split("'icons' | 'roman'").join("'icons' | 'numbered'");
fs.writeFileSync('src/components/player/CourseNavSidebar.tsx',s,'utf8');
console.log('Fixed sidebar type');

// Fix defaultPlayerConfig if it has roman
let mp2 = fs.readFileSync('src/components/builder/PlayerPropertiesModal.tsx','utf8');
if(mp2.includes("tocNumbering: 'roman'")) {
  mp2 = mp2.split("tocNumbering: 'roman'").join("tocNumbering: 'icons'");
  fs.writeFileSync('src/components/builder/PlayerPropertiesModal.tsx',mp2,'utf8');
  console.log('Fixed default tocNumbering roman->icons');
}

console.log('Done');
