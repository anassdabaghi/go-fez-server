
const { initializeBadges } = require('./initializeBadges');

console.log('🚀 Starting badge initialization...');

initializeBadges()
  .then(() => {
    console.log('✨ Badge initialization finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal Error: Could not initialize badges.', error);
    process.exit(1);
  });