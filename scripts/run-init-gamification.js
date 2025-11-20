// Standalone script to initialize gamification rules
const { initializeGamificationRules } = require('./initializeGamification');

initializeGamificationRules()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
