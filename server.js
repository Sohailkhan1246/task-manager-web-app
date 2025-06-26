const express = require("express");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const User = require('./models/User');
const Task = require('./models/Task');
require('dotenv').config();

// Connect to MongoDB using the connection string from .env
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Error:', err));

app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.use(session({
  secret: 'secretKey123',
  resave: false,
  saveUninitialized: false
}));

function checkAuth(req, res, next) {
  if (req.session.userId) next();
  else res.redirect('/login');
}

// Routes
// Root Route
app.get("/", (req,res)=>{
    res.redirect("/register");
});

//Register Route
app.get('/register', (req, res) =>{
  res.render('register.ejs');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashed });
  res.redirect('/login');
});

//Login Route
app.get("/login", (req,res)=>{
    res.render("login.ejs");
});

app.post('/login', async (req, res) => {
  const {username} = req.body; 
  const user = await User.findOne({username});
  if (user && await bcrypt.compare(req.body.password, user.password)) {
    req.session.userId = user._id;
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

//Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/login');
  });
});

//Dashboard Route
app.get('/dashboard', checkAuth, async (req, res) => {
  const tasks = await Task.find({ user: req.session.userId });
  res.render('dashboard.ejs', { tasks });
});

//Add Task
app.post('/add-task', checkAuth, async (req, res) => {
  const { title, description } = req.body;
  await Task.create({ title, description, user: req.session.userId });
  res.redirect('/dashboard');
});

//Delete Task
app.post('/delete-task/:id', checkAuth, async (req, res) => {
  let {id} = req.params;
  await Task.findByIdAndDelete(id);
  res.redirect('/dashboard');
});

//Edit Task

app.get('/edit-task/:id', checkAuth, async (req, res) => {
  let {id} = req.params;
  const task = await Task.findOne({ _id: id, user: req.session.userId });
  if (!task) return res.redirect('/dashboard');
  res.render('edit-task', { task });
});

app.post('/edit-task/:id', checkAuth, async (req, res) => {
  let {id} = req.params;
  const { title, description } = req.body;
  await Task.findOneAndUpdate(
    { _id: id, user: req.session.userId },
    { title, description }
  );
  res.redirect('/dashboard');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

