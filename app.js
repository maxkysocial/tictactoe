const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();

app.use(express.json()); // Middleware เพื่อรองรับการอ่านข้อมูลจาก req.body

// ตั้งค่า view engine ให้ใช้ EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// ตั้งค่าเชื่อมต่อฐานข้อมูล MongoDB
mongoose.connect('mongodb://localhost/tictactoe', { useNewUrlParser: true, useUnifiedTopology: true });

// ตั้งค่า session
app.use(session({ secret: '', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: '',
    clientSecret: '',
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    const user = await User.findOne({ googleId: profile.id });
    if (user) {
      return done(null, user);
    } else {
      const newUser = new User({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        score: 0,
        winStreak: 0
      });
      await newUser.save();
      return done(null, newUser);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        return done(new Error('User not found'));
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  });
  

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/game');
});

app.get('/logout', (req, res) => {
    if (req.isAuthenticated()) {
        req.logout(err => { // ใช้ callback function
            if (err) {
                console.error('Logout error:', err);
                return res.redirect('/'); // ถ้ามีข้อผิดพลาดให้ redirect ไปหน้าหลัก
            }
            req.session.destroy(err => {
                if (err) {
                    console.error('Session destruction error:', err);
                    return res.redirect('/'); // ถ้ามีข้อผิดพลาดให้ redirect ไปหน้าหลัก
                }
                res.redirect('/'); // Redirect ไปหน้าหลักหลังออกจากระบบสำเร็จ
            });
        });
    } else {
        res.redirect('/'); // ถ้าไม่ได้เข้าสู่ระบบให้ redirect ไปหน้าหลัก
    }
});

app.get('/', (req, res) => res.render('index', { user: req.user }));

// ตรวจสอบว่าเข้าสู่ระบบหรือไม่
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  };
  
  // หน้าสำหรับเกม Tic-Tac-Toe
  app.get('/game', isLoggedIn, (req, res) => {
    console.log("req.user ",req.user);
    res.render('game', { user: req.user });
  });
  
  app.post('/game', async (req, res) => {
    console.log('Received result:', req.body.result); // ตรวจสอบค่าที่ได้รับจาก frontend
    const result = req.body.result;
    
    if (!result) {
      return res.status(400).json({ error: 'Result is required' });
    }
  
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
  
    console.log('User score before:', user.score); // ตรวจสอบคะแนนก่อนอัปเดต
    
    if (result === 'win') {
      user.score += 1;
      user.winStreak += 1;
      if (user.winStreak === 3) {
        user.score += 1; // เพิ่มคะแนนพิเศษ
        user.winStreak = 0; // รีเซ็ตการชนะต่อเนื่อง
      }
    } else {
      user.score -= 1;
      user.winStreak = 0; // รีเซ็ตเมื่อแพ้
    }
  
    console.log('User score after:', user.score); // ตรวจสอบคะแนนหลังอัปเดต
    
    await user.save();
    res.redirect('/game');
  });

  app.get('/score', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
  
    const user = await User.findById(req.user.id);
    res.json({ score: user.score }); // ส่งคะแนนกลับไปที่ frontend
  });
  

  // Route เพื่อแสดงคะแนนของผู้เล่นทั้งหมด:
  app.get('/leaderboard', isLoggedIn, async (req, res) => {
    const users = await User.find().sort({ score: -1 });
    console.log('leaderboard');
    console.log(users);
    res.json({ scoreAll: users });
  });
  

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
