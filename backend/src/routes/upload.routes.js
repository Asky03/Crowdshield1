const router = require('express').Router();
const { authenticate }              = require('../middleware/auth.middleware');
const { upload, handleUploadError } = require('../middleware/upload.middleware');
const { uploadAndAnalyze }          = require('../controllers/upload.controller');

router.post('/', authenticate, upload.single('media'), handleUploadError, uploadAndAnalyze);

module.exports = router;