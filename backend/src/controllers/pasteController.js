const crypto = require('crypto');
const Paste = require('../models/Paste');
const { generateShortId } = require('../utils/idGenerator');
const { calculateExpiryDate } = require('../utils/dateHelper');
const { redisClient } = require('../config/redis');
const config = require('../config');

/**
 * Creates a new paste snippet in the database.
 * POST /api/pastes
 * wjbwbek
 */
exports.createPaste = async (req, res, next) => {
  try {
    const { content, title, expiresIn, language, burnOnRead } = req.body;

    // Basic Validation
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        error: 'Content is required and must be a non-empty string'
      });
    }

    // Generate unique shortId with collision handling
    let shortId;
    let attempts = 0;
    const maxAttempts = 5;
    let isUnique = false;

    while (!isUnique && attempts < maxAttempts) {
      shortId = generateShortId();
      const existingPaste = await Paste.findOne({ shortId });
      if (!existingPaste) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate a unique paste ID. Please try again.');
    }

    // Calculate future expiration date
    const expiryAt = calculateExpiryDate(expiresIn);

    // Generate cryptographically secure deletion token
    const deleteToken = crypto.randomBytes(24).toString('hex');

    // Save to Database
    const newPaste = new Paste({
      shortId,
      content,
      title: title && title.trim() !== '' ? title.trim() : 'Untitled',
      expiryAt,
      deleteToken,
      language: language || 'plaintext',
      burnOnRead: burnOnRead || false
    });

    const savedPaste = await newPaste.save();

    // Construct paste share link
    const shareUrl = `${config.baseUrl}/api/pastes/${shortId}`;

    return res.status(201).json({
      success: true,
      message: 'Paste created successfully',
      data: {
        id: savedPaste.shortId,
        title: savedPaste.title,
        content: savedPaste.content,
        views: savedPaste.views,
        expiryAt: savedPaste.expiryAt,
        language: savedPaste.language,
        burnOnRead: savedPaste.burnOnRead,
        deleteToken: savedPaste.deleteToken, // Only returned to the creator on creation
        shareUrl,
        createdAt: savedPaste.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a paste snippet by shortId with Redis caching (Cache-Aside Pattern).
 * GET /api/pastes/:shortId
 */
exports.getPaste = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const cacheKey = `paste:${shortId}`;

    // 1. Try to fetch from Redis (Cache-Aside)
    if (redisClient.isOpen) {
      try {
        const cachedPaste = await redisClient.get(cacheKey);
        if (cachedPaste) {
          console.log(`[Cache HIT] Found paste ${shortId} in Redis`);
          const paste = JSON.parse(cachedPaste);

          // If the cached paste has burnOnRead enabled, delete it immediately from DB and Cache
          if (paste.burnOnRead) {
            console.log(`[Burn on Read] Deleting paste ${shortId} from DB and Cache (Cache Hit path)`);
            await Paste.deleteOne({ shortId });
            await redisClient.del(cacheKey);
            
            paste.views += 1;

            return res.status(200).json({
              success: true,
              source: 'cache',
              data: {
                id: paste.shortId || paste.id,
                title: paste.title,
                content: paste.content,
                views: paste.views,
                expiryAt: paste.expiryAt,
                language: paste.language,
                burnOnRead: paste.burnOnRead,
                createdAt: paste.createdAt
              }
            });
          }

          // Increment view count in MongoDB asynchronously in the background.
          Paste.findOneAndUpdate({ shortId }, { $inc: { views: 1 } }).catch(err => {
            console.error(`Background views increment error for ${shortId}:`, err.message);
          });

          // Increment view count in the returned response to reflect the new view
          paste.views += 1;

          return res.status(200).json({
            success: true,
            source: 'cache',
            data: {
              id: paste.shortId || paste.id,
              title: paste.title,
              content: paste.content,
              views: paste.views,
              expiryAt: paste.expiryAt,
              language: paste.language,
              burnOnRead: paste.burnOnRead,
              createdAt: paste.createdAt
            }
          });
        }
      } catch (cacheError) {
        console.warn(`Redis error during retrieval: ${cacheError.message}. Falling back to Database.`);
      }
    }

    // 2. Cache MISS: Query MongoDB database
    const paste = await Paste.findOne({ shortId });

    if (!paste) {
      return res.status(404).json({
        error: 'Paste not found'
      });
    }

    // Active TTL Expiration Check (covers MongoDB TTL clean up delay)
    if (paste.expiryAt && paste.expiryAt < new Date()) {
      // Manually remove expired paste
      await Paste.deleteOne({ shortId });
      
      // Clean up Redis just in case
      if (redisClient.isOpen) {
        try {
          await redisClient.del(cacheKey);
        } catch (delError) {
          console.error(`Failed to delete expired cache key ${cacheKey}:`, delError.message);
        }
      }

      return res.status(404).json({
        error: 'Paste has expired'
      });
    }

    // Handle Burn on Read for Cache Miss path
    if (paste.burnOnRead) {
      console.log(`[Burn on Read] Deleting paste ${shortId} from DB (Cache Miss path)`);
      await Paste.deleteOne({ shortId });
      if (redisClient.isOpen) {
        try {
          await redisClient.del(cacheKey);
        } catch (delError) {
          console.error(`Failed to delete cache key for burnOnRead:`, delError.message);
        }
      }

      return res.status(200).json({
        success: true,
        source: 'database',
        data: {
          id: paste.shortId,
          title: paste.title,
          content: paste.content,
          views: paste.views + 1,
          expiryAt: paste.expiryAt,
          language: paste.language,
          burnOnRead: paste.burnOnRead,
          createdAt: paste.createdAt
        }
      });
    }

    // Increment views atomically in database
    const updatedPaste = await Paste.findOneAndUpdate(
      { shortId },
      { $inc: { views: 1 } },
      { new: true }
    );

    // 3. Cache WRITE: Cache retrieved paste back to Redis for subsequent reads
    if (redisClient.isOpen) {
      try {
        const cacheData = JSON.stringify(updatedPaste);
        
        if (updatedPaste.expiryAt) {
          const ttlSeconds = Math.max(1, Math.round((new Date(updatedPaste.expiryAt) - Date.now()) / 1000));
          await redisClient.set(cacheKey, cacheData, { EX: ttlSeconds });
          console.log(`[Cache WRITE] Cached paste ${shortId} with TTL: ${ttlSeconds}s`);
        } else {
          await redisClient.set(cacheKey, cacheData, { EX: 86400 });
          console.log(`[Cache WRITE] Cached paste ${shortId} with default 24h TTL`);
        }
      } catch (cacheError) {
        console.warn(`Redis error during cache set: ${cacheError.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      source: 'database',
      data: {
        id: updatedPaste.shortId,
        title: updatedPaste.title,
        content: updatedPaste.content,
        views: updatedPaste.views,
        expiryAt: updatedPaste.expiryAt,
        language: updatedPaste.language,
        burnOnRead: updatedPaste.burnOnRead,
        createdAt: updatedPaste.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a paste snippet by shortId with verification of deleteToken.
 * DELETE /api/pastes/:shortId
 */
exports.deletePaste = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const deleteToken = req.headers['x-delete-token'] || req.body.deleteToken || req.query.deleteToken;

    if (!deleteToken) {
      return res.status(401).json({
        error: 'Unauthorized: Deletion token is required'
      });
    }

    const paste = await Paste.findOne({ shortId });
    if (!paste) {
      return res.status(404).json({
        error: 'Paste not found'
      });
    }

    // Compare provided delete token with the one in DB
    if (paste.deleteToken !== deleteToken) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid deletion token'
      });
    }

    // Delete from MongoDB
    await Paste.deleteOne({ shortId });

    // Invalidate from Redis
    const cacheKey = `paste:${shortId}`;
    if (redisClient.isOpen) {
      try {
        await redisClient.del(cacheKey);
        console.log(`[Cache INVALIDATE] Deleted cache key ${cacheKey} due to deletion`);
      } catch (cacheError) {
        console.warn(`Redis error during cache delete: ${cacheError.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Paste deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};
