const express = require('express');
const router = express.Router();
const pasteController = require('../controllers/pasteController');
const { validatePaste } = require('../middleware/validatePaste');
const { createPasteLimiter } = require('../middleware/rateLimiter');

// Route to create a new paste snippet
// POST /api/pastes
router.post('/', createPasteLimiter, validatePaste, pasteController.createPaste);

// Route to retrieve a paste snippet by its unique short ID
// GET /api/pastes/:shortId
router.get('/:shortId', pasteController.getPaste);


module.exports = router;
