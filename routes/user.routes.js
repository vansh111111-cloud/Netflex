const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
 const userModel = require('./config/models/user.model'); 
 const CreatorRequest = require('./config/models/Creatorrequest');
  const Otp = require('./config/models/otpmodel');
 const Movie = require('./config/models/moviemodel');   
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require('path');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require("passport");
const session = require('express-session');
const sendOtpEmail = require('../utils/mailer');
const multer = require('multer');
const storageMulter = multer.memoryStorage();
const upload = multer({ storage: storageMulter });
const cookieParser = require('cookie-parser');
const app = express();
const router = express.Router();
router.use(cookieParser());
const { body ,validationResult } = require('express-validator');
const { useReducer } = require('react');

router.use(
  session({
    secret: "!@#$%^&*()QWERTYUIOPqwertyuiop_+-=",  
    resave: false,
    saveUninitialized: true,
  })
);


router.use(passport.initialize());
router.use(passport.session());


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
      
        let user = await userModel.findOne({ email: profile.emails[0].value });

        if (!user) {
         
          user = new userModel({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
          });
          await user.save();
        } else if (!user.googleId) {
         
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await userModel.findById(id);
  done(null, user);
});




router.get(
  "/auth/google", 
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/user/home" }),
  async (req, res) => {
    try {
      const user = req.user;

     
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      
      res.cookie("token", token, { httpOnly: true });

      
      res.redirect("/user/netflex/home");
    } catch (err) {
      console.error("Google login error:", err);
      res.redirect("/user/home");
    }
  }
);



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





router.get('/netflex/tvshows',authenticate, (req, res) => {
  res.render('netflextvshows',{ role: req.user.role}); 
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
         
            const existingUser = await userModel.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Username or email already exists'
                })
            }
//otp generation
 const otp = Math.floor(100000 + Math.random() * 900000).toString();
   console.log("Generated OTP for", email, "is:", otp);
    await Otp.create({ email, otp, username, password });

   //send otp to email
               await sendOtpEmail(email, otp);

   

    res.render("verify", { email });
 console.log('otp sent to : ',email);
  }
);
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  // Find OTP record
  const record = await Otp.findOne({ email, otp });
  console.log(record);
  if (!record) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Hash password before saving
  const hashedPassword =  await bcrypt.hash(record.password, 10);  

  // Create user
  const newUser = new userModel({
    username: record.username,
    email: record.email,
    password: hashedPassword,
  });
  await newUser.save();

  // Delete OTP after use
  await Otp.deleteMany({ email });

  return res.redirect('/user/login');
});

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


router.get('/netflex/upload', requireCreator, (req, res) => {
try {
    res.render('netflexupload',{role: req.user.role}); // <- view file
 }
catch (err) {
      console.error("Google login error:", err);}}
 );




     router.post(
  '/netflex/upload',
  requireCreator,
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'movie', maxCount: 1 },
      { name: 'actressPhotos', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
    let posterUrl = null;
        if (req.files['poster']) {
        	      const posterFile = req.files['poster'][0];
        	            const posterGCS = bucket.file(Date.now() + '-' + posterFile.originalname);
        	                  await posterGCS.save(posterFile.buffer, {
        	                  	        contentType: posterFile.mimetype,
        	                  	                public: true
        	                  	                      });
        	                  	                            posterUrl = `https://storage.googleapis.com/${bucket.name}/${posterGCS.name}`;
        	                  	                                }

        	                  	                                    // Actress photos
        	                  	                                        let actressUrls = [];
        	                  	                                            if (req.files['actressPhotos']) {
        	                  	                                            	      for (let file of req.files['actressPhotos']) {
        	                  	                                            	      	        const gcsFile = bucket.file(Date.now() + '-' + file.originalname);
        	                  	                                            	      	                await gcsFile.save(file.buffer, { contentType: file.mimetype, public: true });
        	                  	                                            	      	                        actressUrls.push(`https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`);
        	                  	                                            	      	                              }
        	                  	                                            	      	                                  }

        	                  	                                            	      	                                      // Movie
        	                  	                                            	      	                                          let movieUrl = null;
        	                  	                                            	      	                                              if (req.files['movie']) {
        	                  	                                            	       const movieFile = req.files['movie'][0];
        	                  	                                            	  const movieGCS = bucket.file(Date.now() + '-' + movieFile.originalname);
        	                  	                                               await movieGCS.save(movieFile.buffer, { contentType: movieFile.mimetype, public: true });
        	                  	         movieUrl = `https://storage.googleapis.com/${bucket.name}/${movieGCS.name}`;
        	               }
        	                  	          
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

        // ✅ Store Cloudinary URLs (not local filenames)
        posterUrl: req.files['poster'] ? req.files['poster'][0].path : null,
        trailerUrl: req.files['trailer'] ? req.files['trailer'][0].path : null,
        actressPhotos: req.files['actressPhotos']
                  ? req.files['actressPhotos'].map(file => file.path)
                            : [],

                          
        uploadedBy: req.user._id,
      });

      await movie.save();
      res.redirect('/user/netflex/home');


    } catch (err) {
  console.error('Error uploading movie:', err.message || err);
  res.status(500).send(err.message || 'Upload failed');
}

  }
);

  router.get('/netflex/movie/:id',authenticate, async (req, res) => {
  const movie = await Movie.findById(req.params.id);
 
    const suggestedMovies = await Movie.find({
    	    _id: { $ne: movie._id },
    	        genre: { $in: movie.genre }
    	          }).limit(6);
    
  res.render('movieDetails', { movie , role: req.user.role,suggestedMovies  })
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
    res.render('netflexmylist', { movies: user.myList || [], role: req.user.role }); 
  } catch (err) {
    console.error('Error fetching My List:', err);
    res.status(500).send('Failed to load My List'); 
  }
});


router.get('/netflex/search',authenticate, async (req, res) => {
  try {
    const query = req.query.query || "";

    
    let movies = [];
    if (query) {
      movies = await Movie.find({
        title: { $regex: query, $options: "i" } 
      });
    }

    res.render("netflexsearch", { movies,query, role: req.user.role  }); 
  } catch (err) {
    console.error("Error searching movies:", err);
    res.status(500).send("Failed to search movies");
  }
});



 module.exports = router;
