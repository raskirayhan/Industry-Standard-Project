import multer from 'multer';



const storage = multer.memoryStorage();

export const uploadCourierDocs = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
   
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only jpg and pdf can be download'));
    }
  },
}).fields([
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'nidCard', maxCount: 1 },
]);