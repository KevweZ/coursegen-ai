const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');
(async () => {
    try {
        const filePath = process.argv[2] || path.join(__dirname, 'public', 'SME Documents', 'Designing_eLearning_for_K-12_vs._Corporate_Professionals.docx');
        let r1 = await mammoth.extractRawText({path: filePath});
        fs.writeFileSync('temp_anthropic.txt', r1.value, 'utf8');
        console.log('=== DESIGN DOCTRINE ===\n' + r1.value + '\n');
        let r2 = await mammoth.extractRawText({path: './public/SME Documents/eLearning_Interactions_K-12_vs._Corporate_Design.docx'});
        console.log('=== INTERACTIONS DOCTRINE ===\n' + r2.value + '\n');
    } catch (e) {
        console.error("Error reading docx: ", e);
    }
})();
