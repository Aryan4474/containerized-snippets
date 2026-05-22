/**
 * Parses a duration string (e.g., '10m', '2h', '5d') and returns a Date object in the future.
 * Returns null if duration is null, 'never', or invalid.
 * 
 * @param {string|number|null} duration - Expiration duration (e.g., '10m', '1h', '3d', or number of minutes)
 * @returns {Date|null} - Future expiration date or null
 */
const calculateExpiryDate = (duration) => {
  if (!duration || duration === 'never') {
    return null;
  }

  // If a number is passed directly, treat it as minutes
  if (typeof duration === 'number') {
    return new Date(Date.now() + duration * 60 * 1000);
  }

  const matches = duration.match(/^(\d+)([mhdw])$/);
  if (!matches) {
    return null; // Invalid format defaults to no expiration
  }

  const value = parseInt(matches[1], 10);
  const unit = matches[2];

  let msToAdd = 0;
  switch (unit) {
    case 'm': // Minutes
      msToAdd = value * 60 * 1000;
      break;
    case 'h': // Hours
      msToAdd = value * 60 * 60 * 1000;
      break;
    case 'd': // Days
      msToAdd = value * 24 * 60 * 60 * 1000;
      break;
    case 'w': // Weeks
      msToAdd = value * 7 * 24 * 60 * 60 * 1000;
      break;
  }

  return new Date(Date.now() + msToAdd);
};

module.exports = {
  calculateExpiryDate
};
