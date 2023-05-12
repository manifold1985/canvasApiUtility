const express = require('express');
const session = require('express-session')
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
//const mongoose = require('mongoose');

//const mongoURI = process.env['MONGO_URI'];
/*
mongoose
  .connect(mongoURI)
  .then(() => console.log("Database connection succeeded."))
  .catch(err => console.log(err));*/

const app = express();

const port = 3000;
const staticPath = path.join(__dirname, 'view');
const homepage = path.join(__dirname, 'view/index.html');
const profilePage = path.join(__dirname, 'view', 'profile.html');
const sessionSecret = process.env['SESSION_SECRET'];

app.listen(port, () => {
  console.log("Your server started at", port);
});

app.use((req, res, next) => {
  console.log((new Date()).toLocaleString('en-US', { timeZone: "America/New_York" }), req.method, req.path);
  next();
})
app.use(express.static(staticPath));

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, //how to make this work?
    httpOnly: false
  }
}));

app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: false }));

app.route('/').get((req, res) => res.sendFile(homepage));

app.route('/profile').post((req, res) => {
  req.session.headers = {
    Authorization: `Bearer ${req.body.token}`,
    Accept: "application/json+canvas-string-ids"
  };
  req.session.token = req.body.token;
  req.session.envir = req.body.envir;
  if (req.body.envir == 'production') {
    req.session.urlPrefix = 'https://canvas.instructure.com';
  } else {
    req.session.urlPrefix = 'https://canvas.' + req.body.envir + '.instructure.com';
  }
  res.sendFile(profilePage);
}).get((req, res) => {
  if (!req.session.token) {
    return res.redirect('/')
  };
  res.sendFile(profilePage)
});

app.route('/user').get((req, res) => {
  if (!req.session.token) {
    return res.redirect('/');
  }
  const session = req.session;

  const getProfile = require('./utilities').getProfile(session);
  getProfile.then(profile => {
    session.userId = profile.id;
    res.json(profile);
  });
});

app.route('/courses').get((req, res, next) => {
  const getCourses = require('./utilities').getCourses;
  getCourses(req.session.urlPrefix, req.session.headers)
    .then(response => res.json(response))
    .catch(err => next(err));

})

app.route('/subscribe').post((req, res) => {
  require('./utilities').subscribe(req)
    .then(() => res.redirect('/profile'));
})

app.route('/pass').post((req, res) => res.json(process.env['CANVAS_API_TOKEN_TEST']));

app.route('/Check-Overdue').post((req, res) => {
  const courses = req.body["Check-Overdue"];
  courses.forEach(course => {
    require('./utilities').checkOverdue(false, course, req.session.urlPrefix, req.session.headers).then(() => {
      console.log('Check overdue for ', course);
    });
  })
  res.send("Check-Overdue");
})

app.route('/Sync-Grades').post((req, res) => {
  /*const [source, target] = [req.body["Sync-Grades-source"], req.body["Sync-Grades-target"]];
  require('./utilities').syncGrades(req.session.urlPrefix, req.session.headers, source, target).then(() => {
    console.log('Sync Grades for ', source, target);
  });*/
  res.send("Sync Grades");
})

app.route('/groups').post((req, res) => {
  require('./utilities')
    .getAssignmentGroups(req.session.urlPrefix, req.session.headers, req.body)
    .then(response => res.json(response))
    .catch(error => {
      console.log(error);
    });
});

app.route('/Assign-Grades').post((req, res) => {
  const [courseId, groupId] = [req.body['Assign-Grades-courses'], req.body['Assign-Grades-groups']];
  require('./utilities').assignGrades(req.session.urlPrefix, req.session.headers, courseId, groupId)
    .then(response => {
      res.redirect('/profile');
    })
    .catch(err => {
      console.log(err)
      res.redirect('/profile');
    });  
})
app.use((req, res) => res.redirect('/'));

//require('./utilities').getCourses().then(res => console.log(res));
//require('./utilities').checkOverdue(false, "190000001927022");
//require('./utilities').checkOverdueCron();
//require('./utilities').createAssignment();
//require('./utilities').fetchPost();
//require('./utilities').getSubmissions().then(res => res.json()).then(res => console.log(res));
//require('./utilities').syncGrades();
//require('./utilities').getProgress();
//require('./backup.js').handleCLOs();