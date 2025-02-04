const multer = require('multer');
const path = require('path');
const fs = require('fs');

// क्लीनअप फंक्शन
const cleanupOldFiles = (directory) => {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return;
    }

    // 24 घंटे से पुरानी फाइल्स को डिलीट करें
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }
        if (now - stats.mtime.getTime() > oneDay) {
          fs.unlink(filePath, err => {
            if (err) console.error('Error deleting old file:', err);
            else console.log('Deleted old file:', file);
          });
        }
      });
    });
  });
};

// हर 6 घंटे में क्लीनअप रन करें
setInterval(() => {
  cleanupOldFiles(path.join(__dirname, '../../uploads'));
}, 6 * 60 * 60 * 1000);

const uploadDir = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/uploads'  // Render.com persistent disk path
  : path.join(__dirname, '../../uploads');

// Ensure upload directory exists and is writable
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
    
    // Test write permissions
    const testFile = path.join(uploadDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('Upload directory is writable');
  } catch (error) {
    console.error('Error setting up upload directory:', error);
    throw new Error('Cannot create or write to upload directory');
  }
}

// Log disk space
try {
  const df = require('child_process').execSync('df -h').toString();
  console.log('Disk space:', df);
} catch (error) {
  console.error('Error checking disk space:', error);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, filename);
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Processing file:', file.originalname);
    
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'), false);
    }
    
    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension'), false);
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

// एरर हैंडलिंग के साथ मिडलवेयर
const uploadMiddleware = (req, res, next) => {
  console.log('Starting upload process');
  
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        error: 'Upload error',
        details: err.message
      });
    } else if (err) {
      console.error('Upload middleware error:', err);
      return res.status(400).json({
        error: err.message || 'Unknown upload error'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    console.log('File uploaded successfully:', req.file.path);
    next();
  });
};

module.exports = uploadMiddleware; 