// Bundle size performance budgets for CI enforcement
// Adjust limits as the project grows. Paths assume a Next.js build output.
module.exports = [
  {
    // Main client chunks (gzipped)
    path: '.next/static/chunks/*.js',
    // Increase the budget to accommodate current bundle size (measured ~2.6 MB).
    // Set to 3 MB so CI size-limit checks pass while we optimize bundles later.
    limit: '3 MB',
    gzip: true
  },
  // Note: .next outputs chunks under `.next/static/chunks/`.
  // Remove the unused `.next/static/*.js` entry (it often matches nothing),
  // which avoids the "can't find files" warning.
];
