require('dotenv').config();
const path = require('path');
const cron = require('node-cron');
const fetch = require('node-fetch');
//const canvasUrl = 'https://canvas.instructure.com';//check for delete
const urlPrefixTest = 'https://canvas.test.instructure.com'
const myToken = process.env['CANVAS_API_TOKEN_TEST'];
const headersTest = {
  Authorization: `Bearer ${myToken}`,
  Accept: "application/json+canvas-string-ids"
}
const courseIdTest = process.env['COURSE_ID'];
//const headersBackup = headers; //check for delete

const sendMessage = false;
const schedule = "20 57 2 * * *";
const userId = "190000005530740";
let url = path.join(urlPrefixTest, 'api/v1/conversations');

const body = {
  recipients: [userId],
  subject: 'test',
  body: "This is a multiline message generated by quotes.\nthis is the second line. This is the third.",
  force_new: true
}

function handleError(res) {
  return Error(res.status + ": " + res.statusText);
}
const fetchGetAll = async function(url, headers) {
  let page = 1;
  const output = [];
  let response = [];
  do {
    response.forEach(entry => {
      output.push(entry);
    });
    url.searchParams.set("page", page);
    response = await fetch(url, {
      headers: headers
    });
    if (response.ok) {
      response = await response.json();
    } else {
      throw handleError(response);
    }
    page++;
  } while (response.length > 0);
  return output;
};

const fetchPost = async function(url, headers, body) {
  const headersPost = Object.assign({ 'Content-Type': 'application/json' }, headers);
  let response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: headersPost
  })
  if (!response.ok) {
    throw handleError(response);
  } else {
    console.log('X-Rate-Limit-Remaining: ', response.headers.get('X-Rate-Limit-Remaining'));
    response = await response.json();
    return response;
  }
}

const fetchPut = async function(url, headers, body) {
  const headersPut = Object.assign({ 'Content-Type': 'application/json' }, headers);
  let response = await fetch(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: headersPut
  })
  if (!response.ok) {
    throw handleError(response);
  } else {
    console.log('Put X-Rate-Limit-Remaining: ', response.headers.get('X-Rate-Limit-Remaining'));
    response = await response.json();
    return response;
  }
}

module.exports.fetchPost = fetchPost;

////////////////////////////////////////////////////////

function getProgress(urlPrefix, id) {
  fetch(canvasUrl + `/api/v1/progress/${id}`, {
    method: "GET",
    headers: headers
  }).then(res => res.json()).then(res => console.log(res));
}
module.exports.getProgress = getProgress;

const getSubmissions = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, assignmentId, inclusions = []) {
  const url = new URL(path.join(urlPrefix, `api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`));
  inclusions.forEach(e => {
    url.searchParams.append('include[]', e);
  });
  let response = await fetchGetAll(url, headers);
  return response;
};

const getQuizQuestions = async function(urlPrefix, headers, courseId, quizId) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes/${quizId}/questions`));
  const response = await fetchGetAll(url, headers);
  return response;
}

const getQuizSubmissions = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, quizId) {
  const url = new URL(path.join(urlPrefix, `api/v1/courses/${courseId}/quizzes/${quizId}/submissions`));
  url.searchParams.append('include[]', 'user');
  url.searchParams.append('include[]', 'submission');
  url.searchParams.append('include[]', 'quiz');
  const submissions = await fetch(url, {
    headers: headers
  });
  return submissions;
}

const getQuizSubmissionQuestions = async function(urlPrefix = urlPrefixTest, headers = headersTest, quizSubmissionId) {
  const url = new URL(path.join(urlPrefix, `/api/v1/quiz_submissions/${quizSubmissionId}/questions`));
  let response = await fetch(url, {
    headers: headers
  });
  response = await response.json();
  return response;
}


//the block for "sync assignments"
const createAssignment = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, assignmentData) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignments`));
  const response = await fetchPost(url, headers, assignmentData);
  return response.id;
}
module.exports.createAssignment = createAssignment;

const editAssignment = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, assignmentId, assignmentData) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignments/${assignmentId}`));
  const response = await fetchPut(url, headers, assignmentData);
  return response;
}

const createAssignmentOverride = async function(urlPrefix, headers, courseId, assignmentId, data) {
  const url = new URL(path.join(urlPrefix, `api/v1/courses/${courseId}/assignments/${assignmentId}/overrides`));
  const response = await fetchPost(url, headers, data);
  return response.id;
}

const getAssignments = async function(urlPrefix, headers, courseId, page) {
  url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignments`));
  const response = await fetchPage(url, headers, page);
  return response;
}

const putGradeOrComment = async function(urlPrefix, headers, courseId, assignmentId, userId, data) {
  url = new URL(path.join(urlPrefix, `api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`));
  const response = await fetchPut(url, headers, data);
  return response;
}

const postGrades = async function(urlPrefix, headers, courseId, assignmentId, body) {
  const url = path.join(urlPrefix, `api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/update_grades`);
  const response = await fetchPost(url, headers, body);
  return response;
}

const syncGrades = async function(urlPrefix = canvasUrl, headers = headersBackup, sourceCourse = '190000001927027', targetCourse = '190000001927022') {//delete the default arguments
  let currAssignments;
  let page = 1;
  while (currAssignments = await getAssignments(urlPrefix, headers, sourceCourse, page)) {
    for (let i = 0; i < currAssignments.length; i++) {
      const {
        id: sourceAssignment,
        name: assignmentName,
        html_url: assignmentLink,
        points_possible: assignmentPoints,
        due_at: assignmentDueAt,
        lock_at: assignmentLockAt,
      } = currAssignments[i];
      let url = path.join(urlPrefix, `/api/v1/courses/${sourceCourse}/assignments/${sourceAssignment}/submissions?include[]=user`);
      let currSubmissions, page = 1;
      const body = {
        grade_data: {}
      }
      while (currSubmissions = await fetchPage(url, headers, page)) {
        currSubmissions.forEach(submission => {
          if (submission.user.name != 'Test Student') {
            body.grade_data[submission.user_id] = typeof submission.score == 'number' ? { posted_grade: submission.score.toString() } : { posted_grade: '0' }
          }
        })
        page++;
      }
      let targetAssignment = await fetch(urlPrefix + `/api/v1/courses/${targetCourse}/assignments?search_term=${assignmentName}`, {
        headers: headers
      })
      if (targetAssignment.ok) {
        targetAssignment = await targetAssignment.json();
        if (targetAssignment.length == 0) {
          const assignmentData = {
            assignment: {
              name: assignmentName,
              submission_type: "none",
              published: true,
              points_possible: assignmentPoints,
              due_at: assignmentDueAt,
              lock_at: assignmentLockAt,
              description: `
          <div>
            <a href='${assignmentLink}' target="_blank" rel="noopener" title="${assignmentName}" >Click to redirect to the assignment</a>.
          </div>
        `
            }
          }
          targetAssignment = await createAssignment(urlPrefix, headers, targetCourse, assignmentData);
          console.log("Assignment created: ", targetAssignment);
        }
        else {
          targetAssignment = targetAssignment[0].id;
          console.log('Assignment found: ', targetAssignment);
        }
        let progress = await postGrades(urlPrefix, headers, targetCourse, targetAssignment, body);
        setTimeout(function() {
          getProgress(urlPrefix, progress.id);
        }, 5000);
      }
      else {
        console.log(targetAssignment.statusText);
      }
    }
    page++;
  }
}
module.exports.syncGrades = syncGrades;
//end of the block

const createConversation = function(urlPrefix = canvasUrl, headers, recipientId, subject, message) {
  const url = path.join(urlPrefix, 'api/v1/conversations');
  const body = {
    recipients: [recipientId],
    subject: subject,
    body: message//,
    //force_new: true
  }
  fetchPost(url, headers, body);
}
/*  
  const getProfile = async function () {
    let data = await fetch(canvasUrl + '/api/v1/users/190000005920013/profile', {
      headers: headers
    });
    data = await data.json();
      console.log(data);
    return data;
  };
*/
//190000001883402 190000001927022
const checkOverdue = async (sendMessage, courseId = courses[0], urlPrefix = canvasUrl, headers = headersBackup, closing) => {//take away the "sendMessage" switch
  const now = new Date();
  const users = new Map();
  const url = path.join(urlPrefix, `/api/v1/courses/${courseId}/assignments?include[]=all_dates`);
  let currAssignments;
  let pageAssig = 1;
  let result = [];
  while (currAssignments = await fetchPage(url, headers, pageAssig)) {
    pageAssig++;    
    currAssignments = currAssignments.filter(entry => {
      const dates = entry.all_dates.filter(entry =>{
        return entry.base != null;
      })[0];
      if(dates != null) {
        const dueAt = new Date(dates.due_at);
        return dayDiff(now, dueAt) > 0 && dayDiff(now, dueAt) < closing && !entry.omit_from_final_grade;//fix
      } else {
        return false;
      }
    });
    for (let assignmentCount = 0; assignmentCount < currAssignments.length; assignmentCount++) {
      const assignment = currAssignments[assignmentCount];
      const pointsPossible = assignment.points_possible;
      const restDays = closing - dayDiff(now, new Date(assignment.all_dates[0].due_at));
      const url = path.join(urlPrefix, `/api/v1/courses/${courseId}/assignments/${assignment.id}/submissions?include[]=user`);
      let currSubmissions;
      let pageSub = 1;
      while (currSubmissions = await fetchPage(url, headers, pageSub)) {
        pageSub++;
        //gathering the non-full-scored submissions
        currSubmissions = currSubmissions.filter(submission => {
          return submission.user.name != 'Test Student' && submission.workflow_state != 'submitted' && submission.grade_matches_current_submission && !(submission.score >= pointsPossible);
        })
        const messageTemplate = function(assignmentName, restDays, userStatus) {
          return `\n${assignmentName}, ${userStatus}, ${restDays} days left.`
        }
        currSubmissions.forEach(submission => {
          const userName = submission.user.name.split(' ').slice(0, 1).join('');
          const assignmentName = assignment.name;
          const userId = submission.user_id;
          const userStatus = submission.score || submission.score == 0 ? parseFloat(submission.score.toFixed(2)) + "/" + pointsPossible : 'unsubmitted';
          if (!users.has(userId)) {
            let message = `*This message is auto-generated.* \n${userName}, \nYou have either not submitted or not acquired the full score of each of the following assignments yet.` + messageTemplate(assignmentName, restDays, userStatus);
            users.set(userId, message);
          } else {
            let message = users.get(userId);
            message = message + messageTemplate(assignmentName, restDays, userStatus);
            users.set(userId, message);
          }
        });
      };
    };
  };
  //Attempt to get around the Canvas rate limit 
  if (sendMessage) {
    const userArr = [];
    for (let [user, message] of users) {
      userArr.push([user, message]);
    }
    let userCount = 0;
    const sendRequest = setInterval(function() {
      if (userCount == userArr.length) {
        clearInterval(sendRequest);
        return;
      }
      createConversation(urlPrefix, headers, userArr[userCount][0], 'Overdue or Underscored', userArr[userCount][1]);
      userCount++;
    }, 200);
  }//send message
  //return result;//delete
  for (let [user, message] of users) {
    console.log(message);
  }//delete
};
module.exports.checkOverdue = checkOverdue;

module.exports.checkOverdueCron = function() {
  const job = cron.schedule(schedule, function() {//remove the "schedule" & use the selected time of the user
    console.log('Scheduling checkOverdueCron. sendMessage: ', sendMessage);
    for (let i = 0; i < courses.length; i++)
      checkOverdue(sendMessage, courses[i]);
  }, {
    timezone: "America/New_York" //use the timezone of the individual user
  })
}


//Helper functions


//Canvas API Utilities:

const dayDiff = function(date1, date2) {
  return Math.floor((date1 - date2) / 1000 / 3600 / 24);
}
const fetchPage = async function(url, headers, page, method = 'get', body = null) {
  url = new URL(url);
  url.searchParams.append('page', page);
  options = {
    method: method,
    headers: headers
  }
  if (body) options.body = body;
  let response = await fetch(url, options);
  if (!response.ok) {
    console.log(response.statusText);
    return;
  }
  response = await response.json();
  return response.length > 0 ? response : false;
}

module.exports.getProfile = async function({ urlPrefix, headers, token, envir }) {
  const url = path.join(urlPrefix, '/api/v1/users/self/profile');
  let profile = await fetch(url, {
    headers: headers
  });
  if (!profile.ok) {
    let err = await Error(profile.statusText);
    err = await err.toString();
    return err;
  }
  profile = await profile.json();
  const id = profile.id;
  const findUser = require('./database').findUser;
  const user = await findUser(id, envir, token);
  if (!user) {
    const createUser = require('./database').createUser;
    const user = await createUser(id, profile.name, profile.primary_email, token, envir);
    user.envir = envir;
    return user;
  }
  //The additional information needed to construct the profile page.
  const addon = {
    returning: true,
    envir: envir
  };
  Object.assign(user, addon);
  return user;
}


module.exports.getCourses = async function(urlPrefix = canvasUrl, headers = headersBackup) {//add enrollment type in the user interface
  let coursesTeacher = await fetch(urlPrefix + `/api/v1/courses?enrollment_state=active&enrollment_type=teacher&per_page=50`, {
    headers: headers,
  });
  if (!coursesTeacher.ok) {
    throw Error(coursesTeacher.statusText);
  } else {
    coursesTeacher = await coursesTeacher.json();
  }
  coursesTeacher = coursesTeacher.map(entry => {
    return {
      id: entry.id,
      name: entry.name,
      course_code: entry.course_code
    }
  });
  let coursesTA = await fetch(urlPrefix + `/api/v1/courses?enrollment_state=active&enrollment_type=ta&per_page=50`, {
    headers: headers,
  });
  if (!coursesTA.ok) {
    throw Error(coursesTA.statusText);
  } else {
    coursesTA = await coursesTA.json();
  }
  coursesTA = coursesTA.map(entry => {
    return {
      id: entry.id,
      name: entry.name,
      course_code: entry.course_code
    }
  });
  return coursesTeacher.concat(coursesTA);
};//address the pagination later


//Database Utilities:
module.exports.subscribe = async function(obj) {
  const profile = await require('./database.js').findProfile(obj.session.userId);
  const newSub = obj.body;
  const currSub = profile.services;
  const services = Object.keys(currSub);

  for (let service of services) {
    const subscription = {
      active: false,
      courses: []
    };

    if (newSub[service + '-sub'] && newSub[service]) {
      subscription.active = true;
      if (!Array.isArray(newSub[service])) newSub[service] = [newSub[service]];
      subscription.courses = newSub[service];
    }
    Object.assign(currSub[service], subscription);
  }
  return profile.save().catch(err => console.log(err));
}

const assignRandomGrades = async (urlPrefix, headers, courseId, assignmentId) => {
  const perPage = '36';
  const finalScores = new Map();
  let url = path.join(urlPrefix, `api/v1/courses/${courseId}`);
  for (let page = 1; true; page++) {
    let query = `?page=${page}&per_page=${perPage}&enrollment_type[]=student&include[]=enrollments`;
    let students = await fetch(url + '/users' + query, {
      headers: headers
    });
    students = await students.json();
    if (students.length == 0) break;
    for (let i = 0; i < students.length; i++) {
      const enrollment = students[i].enrollments.filter(e => e.course_id == courseId)[0];
      finalScores.set(enrollment.user_id, enrollment.grades.final_score);
    }
  }
  const studentIds = finalScores.keys();
  const grade_data = {};
  for (let studentId of studentIds) {
    grade_data[studentId] = {
      "posted_grade": ((Math.random() * 0.1 + 0.905) * finalScores.get(studentId)).toFixed(2)
    }
  }
  url = path.join(url, `/assignments/${assignmentId}/submissions/update_grades`);
  const startTime = new Date();
  fetchPost(url, headers, {
    grade_data: grade_data
  })
    .then(() => console.log(`Assigning random grades - Course ${courseId} - Assignment ${assignmentId} - Request succeeded. Time used: `, (new Date() - startTime) / 1000), 's')
    .catch(err => console.log(err));
};

const getAssignmentGroups = async function(urlPrefix, headers, courseId) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignment_groups`));
  let response = await fetchGetAll(url, headers);
  return response;
}
module.exports.getAssignmentGroups = getAssignmentGroups;

const createAssignmentGroup = async function(urlPrefix, headers, courseId, data) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignment_groups`));
  const response = await fetchPost(url, headers, data);
  return response;
}

const getAssignmentsInGroup = async function(urlPrefix, headers, courseId, groupId) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignment_groups/${groupId}`));
  url.searchParams.append('include[]', 'assignments');
  url.searchParams.append('include[]', 'all_dates');
  headers = new fetch.Headers(headers);
  let response = await fetch(url.href, {
    headers: headers
  });
  if (!response.ok) {
    throw handleError(response);
  } else {
    response = await response.json();
    return response.assignments;
  }
}

const assignGrades = async function(urlPrefix, headers, courseId, groupId) {
  const assignments = await getAssignmentsInGroup(urlPrefix, headers, courseId, groupId);
  for (let i = 0; i < assignments.length; i++) {
    await assignRandomGrades(urlPrefix, headers, courseId, assignments[i].id);
  }
  return;
}
module.exports.assignGrades = assignGrades;

const createQuizQuetion = async function(urlPrefix = urlPrefixTest, headers = headersTest, data) {
  const {
    courseId: courseId,
    quizId: quizId,
    postData: postData
  } = data;
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes/${quizId}/questions`));
  let createdQuestion = await fetchPost(url, headers, postData);
  //createdQuestion = await createdQuestion.json();
  return createdQuestion;
}

const createQuiz = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, quizData) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes`));
  const response = await fetchPost(url, headers, quizData);
  return response;
}
module.exports.createQuiz = createQuiz;

const getStudents = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest) {
  const url = new URL(path.join(urlPrefix, `api/v1/courses/${courseId}/users`));
  url.searchParams.append("enrollment_type[]", "student");
  const response = await fetchGetAll(url, headers);
  return response;
}

const assignmentDataTest = {
  assignment: {
    name: "Test Assignment 101"
  }
};//for testing

const createPeerGradedAssignment = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, assignmentData = assignmentDataTest) {
  const order = assignmentData.assignment.name.match(/\d+$/)[0];
  const assignmentGroups = await getAssignmentGroups(urlPrefix, headers, courseId);
  assignmentData.assignment.submission_type = "none";
  const groupRegEx = new RegExp(assignmentData.assignment.group_name, "i");
  let designatedGroup = assignmentGroups.find(e => groupRegEx.test(e.name));
  let designatedGroupId;
  if (!designatedGroup) {
    const groupData = {
      name: assignmentData.assignment.group_name,
      group_weight: 0
    }
    designatedGroup = await createAssignmentGroup(urlPrefix, headers, courseId, groupData);
    designatedGroupId = designatedGroup.id;
  } else {
    designatedGroupId = designatedGroup.id;
  }
  assignmentData.assignment.assignment_group_id = designatedGroupId;
  delete assignmentData.assignment.group_name;
  const createdAssignmentId = await createAssignment(urlPrefix, headers, courseId, assignmentData);
  try {
    var unprocessedId = assignmentGroups.find(e => /\bunprocessed\b/i.test(e.name)).id;
  } catch {
    const groupData = {
      name: "Unprocessed",
      group_weight: 0
    }
    const unprocessed = await createAssignmentGroup(urlPrefix, headers, courseId, groupData);
    var unprocessedId = unprocessed.id;
  }
  const students = await getStudents(urlPrefix, headers, courseId);
  const quizzes = [];//for testing. Used to delete the created quizzes.
  for (let i = 0; i < students.length; i++) {
    const {
      id: id,
      name: name
    } = students[i];
    const quizData = {
      quiz: {
        title: name + ' ' + order,
        quiz_type: 'graded_survey',
        show_correct_answers: false,
        allowed_attempts: -1,
        scoring_policy: "keep_highest",
        points_possible: 2,
        assignment_group_id: unprocessedId,
        only_visible_to_overrides: true,
        description: `<p data-student_id = ${id} data-assignment_id = ${createdAssignmentId}>This is the peer graded form of ${assignmentData.assignment.name} for ${name}.</p>`
      }
    }
    let createdQuiz = await createQuiz(urlPrefix, headers, courseId, quizData);

    try {
      const questionData = {
        courseId: courseId,
        quizId: createdQuiz.id,
        postData: {
          question: {
            question_name: "Presentation Score",
            question_text: `Please assign a score to the presentation of ${name}. [score]`,
            question_type: 'multiple_dropdowns_question',
            position: 1,
            answers: []
          }
        }
      }
      for (let i = 1; i <= 5; i++) {
        questionData.postData.question.answers.push(
          {
            text: i.toString(),
            blank_id: "score",
            weight: 0
          }
        )
      }
      await createQuizQuetion(urlPrefix, headers, questionData);
      questionData.postData.question = {
        question_name: "Presentation Feedback",
        question_text: `Please write down your feedback on the presentation. Please use approriate language. Your feedback will be sent to ${name} non-anoynmously after the due date.`,
        question_type: 'essay_question',
        position: 2,
      }
      await createQuizQuetion(urlPrefix, headers, questionData);
      const headersPut = Object.assign({ 'Content-Type': 'application/json' }, headers);
      let urlEdit = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes/${createdQuiz.id}`));
      let editedQuiz = await fetch(urlEdit, {
        method: 'PUT',
        headers: headersPut,
        body: JSON.stringify({
          quiz: {
            nofity_of_update: false,
            published: true
          }
        })
      });
      editedQuiz = await editedQuiz.json();
      createdQuiz = editedQuiz;
    } catch (err) {
      console.log(err);
    }

    studentsToAssign = Array.from(students.filter(student => student.id != id), student => student.id);
    const overrideData = {
      assignment_override: {
        student_ids: studentsToAssign,
        title: name + "'s peers"
      }
    };
    try {
      const createdOverrideId = await createAssignmentOverride(urlPrefix, headers, courseId, createdQuiz.assignment_id, overrideData);
    } catch (err) {
      console.log(err);
    }
    //quizzes.push(createdQuiz.id);//for testing. Used to delete the created quizzes.
  }
  //for testing. Used to delete the created quizzes.
  /*
  setTimeout(() => {
    quizzes.forEach(createdQuizId => {
      const urlDelete = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes/${createdQuizId}`));
      fetch(urlDelete, {
        method: "DELETE",
        headers: headers
      }).then(() => console.log(`Deleted quiz ${createdQuizId}`));
    });
    let urlDelete = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/assignment_groups/${designatedGroupId}`));
    fetch(urlDelete, {
      method: "DELETE",
      headers: headers
    }).then(() => console.log(`Deleted assignment group ${designatedGroupId}`));
  }, 600000);//End of "for testing"*/
}
module.exports.createPeerGradedAssignment = createPeerGradedAssignment;

const getSingleQuiz = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest, quizId) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes/${quizId}`));
  let response = await fetch(url, {
    headers: headers
  });
  response = response.json();
  return response;
}

const listQuizzes = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest) {
  const url = new URL(path.join(urlPrefix, `/api/v1/courses/${courseId}/quizzes/assignment_overrides`));
  let response = await fetch(url, {
    headers: headers
  });
  response = response.json();
  return response;
}
module.exports.listQuizzes = listQuizzes;

const processPeerGradedAssignments = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest) {
  const assignmentGroups = await getAssignmentGroups(urlPrefix, headers, courseId)
  let unprocessedId;
  try {
    unprocessedId = assignmentGroups.find(e => /\bunprocessed\b/i.test(e.name)).id;
  } catch {
    const groupData = {
      name: "Unprocessed",
      group_weight: 0
    }
    const unprocessed = await createAssignmentGroup(urlPrefix, headers, courseId, groupData);
    unprocessedId = unprocessed.id;
  }
  let processedId;
  try {
    processedId = assignmentGroups.find(e => /\bprocessed\b/i.test(e.name)).id
  } catch {
    const groupData = {
      name: "Processed",
      group_weight: 0
    }
    const processed = await createAssignmentGroup(urlPrefix, headers, courseId, groupData);
    processedId = processed.id;
  }
  let unprocessedSurveys = await getAssignmentsInGroup(urlPrefix, headers, courseId, unprocessedId);
  const now = new Date();
  unprocessedSurveys = unprocessedSurveys.filter(e => now > new Date(e.lock_at));
  for (let i = 0; i < unprocessedSurveys.length; i++) {
    const currSurvey = unprocessedSurveys[i];
    const questions = await getQuizQuestions(urlPrefix, headers, courseId, currSurvey.quiz_id);
    const scoreQuestion = questions.find(e => e.question_name == 'Presentation Score');
    const feedbackQuestion = questions.find(e => e.question_name == 'Presentation Feedback');
    const studentIdRegExp = /(?<=data-student_id=")\d+(?=")/;
    const assignmentIdRegExp = /(?<=data-assignment_id=")\d+(?=")/;
    if (currSurvey.description.match(studentIdRegExp)) {
      const studentId = currSurvey.description.match(studentIdRegExp)[0];
      const assignmentId = currSurvey.description.match(assignmentIdRegExp)[0];
      const inclusions = ['submission_history', 'user', 'assignment'];
      let submissions = await getSubmissions(urlPrefix, headers, courseId, currSurvey.id, inclusions);
      submissions = submissions.filter(e => e.workflow_state != 'unsubmitted');
      let totalScore = 0;
      let totalFeedback = "Below is the feedback from the class:\n\n";
      const peerCount = submissions.length;
      submissions.forEach(submission => {
        const scoreData = submission.submission_history[0].submission_data.find(e => scoreQuestion.id.indexOf(e.question_id) != -1);
        const currScore = Number(scoreQuestion.answers.find(e => e.id == scoreData.answer_id_for_score).text);
        totalScore += currScore;
        const currFeedback = submission.submission_history[0].submission_data.find(e => feedbackQuestion.id.indexOf(e.question_id) != -1).text.match(/(?<=>)[\w\W]+(?=<)/)[0];
        totalFeedback += `${submission.user.name}: ${currFeedback}\n\n`;
      });
      const averageScore = totalScore / peerCount;
      const gradeData = {
        submission: {
          posted_grade: averageScore.toFixed(2)
        },
        comment: {
          text_comment: totalFeedback
        }
      }
      await putGradeOrComment(urlPrefix, headers, courseId, assignmentId, studentId, gradeData);
      const assignmentData = {
        assignment: {
          assignment_group_id: processedId
        }
      }
      await editAssignment(urlPrefix, headers, courseId, currSurvey.id, assignmentData);
    }
  }
}
module.exports.processPeerGradedAssignments = processPeerGradedAssignments;

const sortIntoGroups = async function(urlPrefix = urlPrefixTest, headers = headersTest, courseId = courseIdTest) {
  const groupToId = new Map(); 
  const assignmentGroups = await getAssignmentGroups(urlPrefix, headers, courseId);
  assignmentGroups.forEach(group => {
    const names = group.name.split('/');
    names.forEach(name => {
      groupToId.set(name, group.id);
    })
  })
  const nonGradedId = groupToId.get('Non-graded');
  let page = 1;

  //The following design can prevent rate limit exceeding. But it takes too long to run.
  /*
  const pageHelper = async function(page) {
    const assignmentHelper = async function(i, arr) {
      if (i < arr.length) {
        const assignment = arr[i];
        const groupName = assignment.name.split(' ')[0];
        let groupId = groupToId.get(groupName);
        if (!groupId) {
          groupId = nonGradedId;
        }
        const assignmentData = {
          assignment: {
            assignment_group_id: groupId
          }
        }
        const edited = await editAssignment(urlPrefix, headers, courseId, assignment.id, assignmentData);
        if(edited) {
          const done = await pageHelper(i+1, arr);
          if(done) {
            return true;
          }
        }
      } else {
        return true;
      }
    }
    const currAssignments = await getAssignments(urlPrefix, headers, courseId, page);
    if(currAssignments) {
      const processed = await assignmentHelper(0, currAssignments);
      if(processed) {
        pageHelper(page + 1);
      }
    }
  }
  pageHelper(1);
  */
  const pageHelper = async function(page) {
    const currAssignments = await getAssignments(urlPrefix, headers, courseId, page);
    if(currAssignments) {
      let index = 0;
      //Can I wrap the following with a promise?
      const interval = setInterval(() => {        
        const assignment = arr[index];
        const groupName = assignment.name.split(' ')[0];
        let groupId = groupToId.get(groupName);
        if (!groupId) {
          groupId = nonGradedId;
        }
        const assignmentData = {
          assignment: {
            assignment_group_id: groupId
          }
        }
        editAssignment(urlPrefix, headers, courseId, assignment.id, assignmentData);
        if(index >= arr.length - 1) {
          clearInterval(interval);
        } else {
          index++;
        }
      }, 100);
    }    
  }
  
  while(currAssignments = await getAssignments(urlPrefix, headers, courseId, page)) {
    const arr = currAssignments; 
    setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {        
        const assignment = arr[index];
        const groupName = assignment.name.split(' ')[0];
        let groupId = groupToId.get(groupName);
        if (!groupId) {
          groupId = nonGradedId;
        }
        const assignmentData = {
          assignment: {
            assignment_group_id: groupId
          }
        }
        editAssignment(urlPrefix, headers, courseId, assignment.id, assignmentData);
        if(index >= arr.length - 1) {
          clearInterval(interval);
        } else {
          index++;
        }
      }, 500);
    }, page*1000);
    page++;
  }
}

module.exports.sortIntoGroups = sortIntoGroups;