import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<span className="text-xs font-bold">\s*<label className="px-3/s;
const replacement = `<span className="text-xs font-bold">Reset Layout</span></button>\n<label className="px-3`;

if(regex.test(code)){
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed missing Reset Layout button closing tags!");
} else {
    console.log("Regex didn't match.");
}
