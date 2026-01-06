// Inappropriate keywords that will auto-flag messages
const FLAGGED_KEYWORDS = [
  // Add your keywords here
  "spam",
  "scam",
  "fraud",
  "illegal",
  // Add more as needed
];

const checkForFlaggedContent = (text) => {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  for (const keyword of FLAGGED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  
  return null;
};

module.exports = {
  FLAGGED_KEYWORDS,
  checkForFlaggedContent,
};
