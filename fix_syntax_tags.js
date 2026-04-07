import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/motion\.div>\s*\)\}/s;
const replacement = `</div>\n                </div>\n              </div>\n          </motion.div>\n        )}`;

if(regex.test(code)){
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed extra div tag!");
} else {
    console.log("Regex didn't match.");
}
