const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
 const userModel = require('./config/models/user.model'); 
 const CreatorRequest = require('./config/models/Creatorrequest');
 const Movie = require('./config/models/moviemodel');   

const path = require('path');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const app = express();
const router = express.Router();
router.use(cookieParser());
const { body ,validationResult } = require('express-validator');
const { useReducer } = require('react');


 const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(400).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // now req.user contains { userId, username, role, email }
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    return res.status(401).json({message: 'invalid tokenn'}) // redirect if token is invalid
  }
};
router.get('/home', (req,res) => {
  res.render('home');
}
);
router.get('/netflex/home',authenticate, async (req, res) => {
  try {
    const movies = await Movie.find(); 
    res.render('netflexhome', { role: req.user.role, movies });; 
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



router.get('/netflex/movies', (req, res) => {
  res.render('netflexmovies'); 
});

router.get('/netflex/tvshows', (req, res) => {
  res.render('netflextvshows'); 
});
router.get('/netflex/search', (req, res) => {
  res.render('netflexsearch'); 
});
router.get('/netflex/setting/profile', (req, res) => {
  res.render('settingprofile'); 
});
router.get('/netflex/setting/admin', (req, res) => {
  res.render('settingadmin'); 
});
router.get('/netflex/setting/creator', (req, res) => {
  res.render('settingcreator'); 
});
router.get('/netflex/setting/security', (req, res) => {
  res.render('settingsecurity'); 
});
router.get('/netflex/setting/subscription', (req, res) => {
  res.render('settingsubscription'); 
});
router.get('/netflex/setting/notifications', async (req, res) => {
    try {
        const notifications = await Notification.findOne({ userId: req.user._id })
        res.render('settingnotifications', { notifications });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });

    }
} );
router.get('/netflex/setting/language', (req, res) => {
  res.render('settinglanguage'); 
});
router.get('/netflex/setting/playback', (req, res) => {
  res.render('settingplayback'); 
});
router.get('/netflex/setting/devices', (req, res) => {
  res.render('settingdevices'); 
});
router.get('/netflex/setting/help', (req, res) => {
  res.render('settinghelp'); 
});

router.get('/register', (req, res) =>
     {res.render('register');

    })
    router.post('/register', 
            body('email').trim().isEmail().isLength({min: 10}),
        body('password').trim().isLength({min: 5 }),
        body('username').trim().isLength({min: 3}),  
        async (req, res) => 
       {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           return res.status(400).json({
          message: 'invalid data'
           })}
        
            const { username, email, password } = req.body;
           const hashedPassword = await bcrypt.hash(password, 10  );
                const newUser = await userModel.create({
                email,
                username,
                 password: hashedPassword  
    })
    res.redirect('/user/login');
} )
router.get('/login', (req, res) =>
     {res.render('login');

    })
    router.post('/login', 
            
        body('password').trim().isLength({min: 5 }),
        body('username').trim().isLength({min: 3}),  
        async (req, res) => 
       {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           return res.status(400).json({
          message: 'invalid data'
           })}
        
            const { username, password } = req.body;
            const user = await userModel.findOne({
                username : username })
            if (!user) {
                return res.status(404).json({
                    message: 'Username or password is incorrect'
                })
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    message: 'Username or password is incorrect '
                 }) }
        
                
        console.log( "user found", user);
            const token = jwt.sign({
                 userId: user._id,
                 email: user.email,
                    username: user.username,
                    role: user.role
                }, 
                process.env.JWT_SECRET, 
            ) 
            res.cookie('token',token
            )
            res.redirect('/user/netflex/home');


                
          }  )
          router.post('/netflex/setting/creator', async (req, res) => {
            try {
              const token = req.cookies.token;
              if (!token) {
                return res.status(401).json({ message: 'Unauthorized' });
              }
      
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              const userId = decoded.userId;
      
              // Check if the user has already applied
              const existingRequest = await CreatorRequest.findOne({ userId });
              if (existingRequest) {
                return res.status(400).json({ message: 'You have already applied for creator status.' });
              }
      
              // Create a new creator request
              const newRequest = new CreatorRequest({ userId });
              await newRequest.save();
      
//res.status(200).json({ message: 'Creator request submitted successfully.' });
              res.redirect('/user/netflex/setting?msg=Creator request submitted successfully.');
            } catch (error) {
              console.error('Error submitting creator request:', error);
              res.status(500).json({ message: 'Internal server error' });
            }
          });
          router.post('/netflex/setting/logout', (req, res) => {
            res.clearCookie('token');
            res.redirect('/user/login');
          });
         

router.get  ('/netflex/setting',authenticate, (req,res) => {
  res.render('netflexsetting', {role: req.user.role});
});
// Middleware to check role
function requireCreator(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).send('Access denied. No token provided.');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'creator' && decode.role !== 'admin') {
            return res.status(403).send('Access denied. Only creators can upload trailers.');
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(400).send('Invalid token');
    }
}

// GET page to show upload form
router.get('/netflex/upload', requireCreator, (req, res) => {
    res.render('netflexupload'); // <- view file
});

// POST to handle trailer upload


// store uploaded trailers in /uploads/trailers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'poster') {
      cb(null, path.join(__dirname, '..', 'uploads', 'posters'));
    } else if (file.fieldname === 'trailer') {
      cb(null, path.join(__dirname, '..', 'uploads', 'trailers'));
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.post(
  '/netflex/upload',
  requireCreator,
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'trailer', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const movie = new Movie({
        title: req.body.title,
        description: req.body.description,
        year: req.body.year,
        country: req.body.country,
        genre: req.body.genre,
        audioLanguages: req.body.audioLanguages ? req.body.audioLanguages.split(',').map(a => a.trim()) : [],
        director: req.body.director,
        cast: req.body.cast ? req.body.cast.split(',').map(c => c.trim()) : [],
        duration: req.body.duration,
        tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
        rating: req.body.rating,
        posterUrl: req.files['poster']
          ? '/uploads/posters/' + req.files['poster'][0].filename
          : null,
        trailerUrl: req.files['trailer']
          ? '/uploads/trailers/' + req.files['trailer'][0].filename
          : null,
        uploadedBy: req.user._id
      });

      await movie.save();
      res.redirect('/user/netflex/home');
    } catch (err) {
      console.error('Error uploading movie:', err);
      res.status(500).send('Upload failed');
    }
  }
);


      

  router.get('/netflex/movie/:id', async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  res.render('movieDetails', { movie });
});
     
router.post('/netflex/mylist/:movieId',authenticate, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user.myList.includes(req.params.movieId)) {
      user.myList.push(req.params.movieId);
      await user.save();
    }
    res.redirect('/user/netflex/mylist');
  } catch (err) {
    console.error('Error adding to My List:', err);
    res.status(500).send('Failed to add to My List');
  }
});


router.get('/netflex/mylist', authenticate, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId).populate('myList');
    console.log("Fetched My List:", user.myList);
    res.render('netflexmylist', { movies: user.myList || [] }); 
  } catch (err) {
    console.error('Error fetching My List:', err);
    res.status(500).send('Failed to load My List'); 
  }
});

 module.exports = router;