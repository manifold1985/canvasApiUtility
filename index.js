const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config();
const urlPrefixTest = "https://canvas.test.instructure.com";
const myToken = process.env["CANVAS_API_TOKEN_TEST"];
const headersTest = {
  Authorization: `Bearer ${myToken}`,
  Accept: "application/json+canvas-string-ids",
};
const app = express();
const port = process.env.PORT || 3000;
const staticPath = path.join(__dirname, "view");
const homepage = path.join(__dirname, "view/index.html");
const profilePage = path.join(__dirname, "view", "profile.html");
const sessionSecret = process.env["SESSION_SECRET"];
const courseIdForTest = process.env["COURSE_ID"];
const errorHandler = function (res, error) {
  res.send(error);
};
const makeSafe = function (fn, req, res, processor, errorHandler) {
  return function () {
    fn()
      .then((response) => {
        processor(req, res, response);
      })
      .catch((error) => {
        errorHandler(res, error);
      });
  };
};
app.listen(port, () => {
  console.log(`The server is listening at port ${port}.`);
});

app.use((req, res, next) => {
  console.log(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
    req.method,
    req.path,
  );
  next();
});
app.use(express.static(staticPath));

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, //how to make this work?
      httpOnly: false,
    },
  }),
);

app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: false }));

app.route("/").get((req, res) => res.sendFile(homepage));

app
  .route("/pass")
  .post((req, res) => res.json(process.env["CANVAS_API_TOKEN_TEST"]));

app
  .route("/profile")
  .post((req, res) => {
    req.session.headers = {
      Authorization: `Bearer ${req.body.token}`,
      Accept: "application/json+canvas-string-ids",
    };
    req.session.token = req.body.token;
    req.session.envir = req.body.envir;
    if (req.body.envir == "production") {
      req.session.urlPrefix = "https://canvas.instructure.com";
    } else {
      req.session.urlPrefix =
        "https://canvas." + req.body.envir + ".instructure.com";
    }
    res.sendFile(profilePage);
  })
  .get((req, res) => {
    if (!req.session.token) {
      res.redirect("/");
    } else {
      res.sendFile(profilePage);
    }
  });

app.route("/user").get((req, res) => {
  if (!req.session.token) {
    return res.redirect("/");
  }
  const session = req.session;

  const getProfile = require("./utilities").getProfile(session);
  getProfile.then((profile) => {
    session.userId = profile.id;
    res.json(profile);
  });
});

app.route("/courses").get((req, res, next) => {
  const getCourses = require("./utilities").getCourses;
  getCourses(req.session.urlPrefix, req.session.headers)
    .then((response) => res.json(response))
    .catch((err) => next(err));
});

app.route("/subscribe").post((req, res) => {
  require("./utilities")
    .subscribe(req)
    .then(() => res.redirect("/profile"));
});

app.route("/Check-Overdue").post((req, res) => {
  const courses = Array.isArray(req.body["Check-Overdue"])
    ? req.body["Check-Overdue"]
    : [req.body["Check-Overdue"]];

  courses.forEach((course) => {
    require("./utilities")
      .checkOverdue(true, course, req.session.urlPrefix, req.session.headers, 6)
      .then(() => {
        console.log("Check overdue for ", course);
      });
  });
  res.send("Check-Overdue");
});

app.route("/Sync-Grades").post((req, res) => {
  const [source, target] = [
    req.body["Sync-Grades-source"],
    req.body["Sync-Grades-target"],
  ];
  require("./utilities")
    .syncGrades(req.session.urlPrefix, req.session.headers, source, target)
    .then(() => {
      console.log("Sync Grades for ", source, target);
    });
  res.send("Sync Grades");
});

app.route("/groups").post((req, res) => {
  require("./utilities")
    .getAssignmentGroups(req.session.urlPrefix, req.session.headers, req.body)
    .then((response) => res.json(response))
    .catch((error) => {
      console.log(error);
    });
});

app.route("/Assign-Grades").post((req, res) => {
  const [courseId, groupId] = [
    req.body["Assign-Grades-courses"],
    req.body["Assign-Grades-groups"],
  ];
  require("./utilities")
    .assignGrades(req.session.urlPrefix, req.session.headers, courseId, groupId)
    .then((response) => {
      res.redirect("/profile");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/profile");
    });
});

app.route("/Create-Peer-Graded").post((req, res) => {
  let {
    "Create-Peer-Graded-course": courseId,
    "Create-Peer-Graded-name": name,
    "Create-Peer-Graded-group": group,
  } = req.body;
  const assignmentData = {
    assignment: {
      name: name,
      group_name: group,
      points_possible: 5,
      published: true,
    },
  };
  require("./utilities")
    .createPeerGradedAssignment(
      req.session.urlPrefix,
      req.session.headers,
      courseId,
      assignmentData,
    )
    .then(() => res.redirect("/profile"))
    .catch((err) => {
      console.log(err);
      res.send(err);
    });
});

app.route("/Process-Peer-Graded").post((req, res) => {
  if (Array.isArray(req.body["Process-Peer-Graded"])) {
    var courseIds = req.body["Process-Peer-Graded"];
  } else {
    var courseIds = [req.body["Process-Peer-Graded"]];
  }
  for (let i = 0; i < courseIds.length; i++) {
    const courseId = courseIds[i];
    try {
      require("./src/controllers/processPeerGraded")
        .processPeerGraded(req.session.urlPrefix, req.session.headers, courseId)
        .then(() => res.send("Processed peer graded assignments."));
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  }
});

app.route("/Sort-Into-Groups").post((req, res) => {
  if (Array.isArray(req.body["Sort-Into-Groups"])) {
    var courseIds = req.body["Sort-Into-Groups"];
  } else {
    var courseIds = [req.body["Sort-Into-Groups"]];
  }
  const helper = function (i) {
    if (i < courseIds.length) {
      try {
        require("./utilities")
          .sortIntoGroups(
            req.session.urlPrefix,
            req.session.headers,
            courseIds[i],
          )
          .then(() => {
            helper(i + 1);
          })
          .catch((err) => {
            console.log(err);
            res.send(err);
          });
      } catch (err) {
        res.send(err);
      }
    }
  };
  helper(0);
  res.send("Sort into Groups.");
});

app.use((req, res) => res.redirect("/"));
