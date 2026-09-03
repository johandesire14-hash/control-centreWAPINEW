const fs = require('fs');
const file = 'artifacts/api-server/src/routes/kpay.ts';

let content = fs.readFileSync(file, 'utf8');

// 1. Nettoyer les expressions invalides dans la destructuration
content = content.replace(/phoneNumber,\s*provider:[^,]+,/g, 'phoneNumber, provider,');

// 2. S'assurer que le provider est proprement normalisé APRES la destructuration
if (!content.includes('const kpayProvider =')) {
  content = content.replace(
    "const {",
    "let {"
  );
  
  const injectCode = `
  const kpayProvider = String(req.body?.provider || provider || '').toUpperCase().includes('AIRTEL') ? 'AIRTEL_CONGO' : 'MTN_CONGO';
  phoneNumber = String(phoneNumber || '').replace(/\\D/g, '');
  if (typeof phoneNumber === 'string' && phoneNumber.length === 9) {
    phoneNumber = '242' + phoneNumber;
  }
  `;

  content = content.replace(
    /(\} = req\.body[^;]*;)/,
    `$1\n${injectCode}`
  );

  // Remplacer provider par kpayProvider dans l'objet envoyé à KPay
  content = content.replace(/provider:\s*provider\b/g, 'provider: kpayProvider');
  content = content.replace(/provider:\s*kpayProvider\b/g, 'provider: kpayProvider');
}

fs.writeFileSync(file, content);
console.log('✅ Fichier kpay.ts réparé et syntaxe corrigée !');
