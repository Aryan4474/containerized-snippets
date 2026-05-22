const mongoose = require('mongoose');
const config = require('../config');
const Paste = require('../models/Paste');
const { generateShortId } = require('./idGenerator');

async function testDatabase() {
  try {
    console.log(`Attempting to connect to: ${config.mongoUri}`);
    await mongoose.connect(config.mongoUri);
    console.log('Connected successfully!');

    // Clean up any previous test pastes to keep it clean
    await Paste.deleteMany({ title: 'Test Paste Title' });

    // Generate a unique ID
    const shortId = generateShortId();
    console.log(`Generated Unique Short ID: ${shortId}`);

    // Create a new paste document
    const testPaste = new Paste({
      shortId,
      content: 'This is a test snippet to verify database persistence.',
      title: 'Test Paste Title',
      expiryAt: new Date(Date.now() + 60000) // Expires in 1 minute
    });

    // Save the document to the database
    const savedPaste = await testPaste.save();
    console.log('Saved document successfully:', savedPaste);

    // Retrieve the document to verify it was saved correctly
    const fetchedPaste = await Paste.findOne({ shortId });
    console.log('Retrieved document from DB:', fetchedPaste);

    if (fetchedPaste.shortId === shortId) {
      console.log('--- DATABASE VERIFICATION SUCCESSFUL ---');
    } else {
      console.error('Mismatch in fetched paste shortId!');
    }

  } catch (error) {
    console.error('Database Verification Failed:', error.message);
  } finally {
    // Disconnect cleanly
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

testDatabase();
