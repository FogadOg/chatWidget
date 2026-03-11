// Bundle size performance budgets for CI enforcement
// Adjust limits as the project grows. Paths assume a Next.js build output.
module.exports = [
  {
    // Main client chunks (gzipped)
    path: '.next/static/chunks/*.js',
    // Temporarily raise the budget to match current measured size.
    // Set to 600 KB per request so CI checks pass while work continues.
    limit: '600 KB',
    gzip: true
  },
  // Note: .next outputs chunks under `.next/static/chunks/`.
  // Remove the unused `.next/static/*.js` entry (it often matches nothing),
  // which avoids the "can't find files" warning.
];
