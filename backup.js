const express = require('express');
const app = express();
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

const startTime = new Date();
const port = 3000;
const test = true;
if (test) {
  var canvasUrl = 'https://canvas.beta.instructure.com';
  var myToken = process.env['CANVAS_API_TOKEN_BETA'];
} else {
  var canvasUrl = 'https://canvas.instructure.com';
  var myToken = process.env['CANVAS_API_TOKEN'];
};

console.log("Test environment:", test);

const headers = {
  Authorization: `Bearer ${myToken}`,
  Accept: "application/json+canvas-string-ids"
}

const canvasAPI = axios.create({
  baseURL: canvasUrl,
  headers: headers
})

const courseId = '190000001883402';
const assignmentId = "190000016028838";
//const userId ="190000005920013";

/*
app.listen(port, () => {
  console.log("Your server started at", port);
});
*/

const getProfile = async function () {
  let data = await fetch(canvasUrl + '/api/v1/users/self/profile', {
    headers: headers
  });
  data = await data.json();
  return data;
}

module.exports.getProfile = getProfile;

//List the courses of a user.
const  getCurrCourses = function(Regex) {
  return fetch(canvasUrl + '/api/v1/courses?enrollment_state=active&enrollment_type=teacher&state[]=available&per_page=50', {
  headers: headers,
  }).then(res=>{
  return res.json();
  }).then(res => {
  console.log("Get Currence Courses - Request succeeded.");
  let currCourses = res.filter((entry) => entry.course_code.match(Regex));
    currCourses.forEach(entry => console.log(entry.id, entry.name));
  currCourses = currCourses.map(entry => entry.id);
  return currCourses;
  }).catch(err => console.log("Request failed.", err));
}


//List the assignment of a course.
const getAssignmentsDemo = () => {
  return axios({
    url: canvasUrl + `/api/v1/courses/${courseId}/assignments?page=1&per_page=30`,
    method: "get",
    headers: headers,
  }).then(res => {
    res.data.forEach((entry, i) => console.log(i, entry.name,entry.id));
  }).catch(err => console.log(err));
}

/*
//List the submissions of an assignment
axios({
  url: canvasUrl + `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
  method: 'get',
  headers: headers,
  params: {
    per_page: 50
  }
}).then(res => {
  res.data.forEach((entry, i) => console.log(i, entry.id, entry.user_id, entry.assignment_id, entry.score, entry.workflow_state));
}).catch(err=>console.log(err));

//Change the grade of a student
axios({
  url: canvasUrl + `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
  method: "put",
  headers: headers,
  data: {
    submission: {
      posted_grade: "0%"
    }
  }
}).then(
  res => console.log(res.data)
).catch(err => console.log(err));
*/

//Work with pagination.
//Return the requested data of the current url and the pagination in a promise.
const getPagination = function(instance, url, customized = false, isFetch = false, perPage = '10') {
  if (!url) return null;
  if (isFetch) {
    if(!customized) {
      url = canvasUrl + url + "?per_page="+ perPage;
    }
    return fetch(url,{
      headers: headers
    }).then(res => {
      const relRegex = /rel="(.*)"/;
      const urlRegex = /<(.*)>/;
      const pageLinks = res.headers.get('link').split(",");
      const pagination = {};
      pageLinks.forEach(entry => {
        pagination[entry.match(relRegex)[1]] = entry.match(urlRegex)[1];
      });
      return {
        data: res.json(),
        pagination: pagination
      };
    }).catch(err => console.log(err));
  } else {
    const baseURL = instance.defaults.baseURL;  
    if (customized) {
      instance.defaults.baseURL = undefined;
    };
    instance.defaults.params = {per_page: perPage};
    return instance.get(url).then(res => {
        const pageLinks = res.headers.link.split(",");
        const relRegex = /rel="(.*)"/;
        const urlRegex = /<(.*)>/;
        const pagination = {};
        pageLinks.forEach(entry => {
          pagination[entry.match(relRegex)[1]] = entry.match(urlRegex)[1];
        });
      instance.defaults.baseURL = baseURL;
      instance.defaults.params = null;
        return {
          data: res.data,
          pagination: pagination
        };
      }).catch(err => console.log(err));
  }
};

//Assign zero to the past due submissions.
const gradePastDue = async function(courseId, assignmentId,perPage="10",workflowState = "unsubmitted") {
  let url = `/api/v1/courses/${courseId}/assignments/${assignmentId}`
  const assignment = await canvasAPI.get(url);
  let dueAt = null;
  assignment.data.due_at? dueAt = new Date(assignment.data.due_at) : null;
  const now = new Date();
  if(dueAt&&dueAt < now) {
    url = url + '/submissions';
    let subPagination = await getPagination(canvasAPI, url,false,true,perPage);
    const baseURL = canvasAPI.defaults.baseURL;
    while (subPagination) {
      let data = {
        grade_data: {}
      };
      submissions = await subPagination.data;
      submissions.forEach(entry => {
        if(entry.workflow_state == workflowState)
        {
          data["grade_data"][entry.user_id] = {posted_grade: "0"};
        };
      });
      canvasAPI.defaults.baseURL = undefined;      
      const next = subPagination.pagination.next;
      subPagination = await getPagination(canvasAPI, next, true,true,perPage);
      canvasAPI.defaults.baseURL = baseURL;
      if(Object.keys(data.grade_data)!=0) {
        const grade = await canvasAPI.post(url+'/update_grades',data);
      }
    }
  }
}

const handleAssignments = async function(courseId,perPage='10') {
  let url = `/api/v1/courses/${courseId}/assignments`
  let assPagination = await getPagination(canvasAPI, url,false,true,perPage);  
  for(null; assPagination;null) {
    let assignments = await assPagination.data;
    for(let j = 0; j < assignments.length; j++) {
      await gradePastDue(courseId, assignments[j].id, perPage);    
      if (!assignments[j].due_at) {
        console.log(assignments[j].name, "has no due date.");
      } else if (new Date(assignments[j].due_at) > new Date()) {
        console.log(assignments[j].name, "has not due yet.")
      } else {
        console.log(assignments[j].name, "completed.")
      }            
    }
    const next = await assPagination.pagination.next;
    assPagination = await getPagination(canvasAPI, next,true,true,perPage);
  }  
}

const handleCourses = async function(arr,perPage='10') {
  for (let i = 0; i < arr.length; i++) {
    await handleAssignments(arr[i]);
    console.log(i+1, "courses completed,", arr.length - i - 1,"more to come.")
  }
};

const handleTerm = async function(Regex,perPage='10') {
  const currCourses = await getCurrCourses(Regex);
  handleCourses(currCourses,perPage);
}
//Assigning grade to past due ends here.
//handleTerm(/FA22/);

//Hide the grade, and not count toward the final grade.

//cause: [Error: unexpected end of file] { errno: -5, code: 'Z_BUF_ERROR' }

const getAssignmentsByGroup = async (courseId, groupName) => {
  let url = `/api/v1/courses/${courseId}/assignment_groups`;
  groupName = new RegExp(groupName,"ig");
  let groupPagination = await getPagination(canvasAPI, url);
  let groups = groupPagination.data.filter(entry => groupName.test(entry.name));
  let next = groupPagination.pagination.next;
  while (next) {
    groupPagination = await getPagination(canvasAPI, next, true);
    groups = [...groups, ...groupPagination.data.filter(entry => groupName.test(entry.name))];
  }
  groupIds = groups.map((entry) => entry.id);
  url = `/api/v1/courses/${courseId}/assignments`;
  const perPage = 50;
  let assPagination = await getPagination(canvasAPI, url,false,true, perPage);
  let result=[];
  next = null;
  do {
    const currAssignments =[];
    for (let i = 0; i < groupIds.length; i++) {
        const id = groupIds[i];
        data = await assPagination.data;
        for (let j = 0; j < data.length; j++) {
          if(data[j].assignment_group_id === id) {
            currAssignments.push(data[j]);
          }
        }
      }
    result = [...result, ...currAssignments];      
    next = assPagination.pagination.next;
    if(next) {
      assPagination = await getPagination(canvasAPI, next, true,true, perPage);
    }
  } while (next);
  for (let i = 0; i < result.length; i++) {
    result[i] = result[i].id;
  }
  return result;
}

const removeGrades = async (courseId, assignments) => {
  const url = `/api/v1/courses/${courseId}/assignments/`;
    for (let i = 0; i < assignments.length; i++) {
      await canvasAPI.put(url+assignments[i], {
        assignment: {omit_from_final_grade: true}
    });
  }
};

const assignRandomGrades = async (courseId, assignmentId) => {
  const perPage = '50';
  const totalScores = new Map();
  let url = canvasUrl + `/api/v1/courses/${courseId}`;
  for (let page = 1; true; page++) {    
    let query = `?page=${page}&per_page=${perPage}&enrollment_type[]=student&include[]=enrollments`;
    let students = await fetch(url+'/users'+query,{
      headers: headers
    });
    students = await students.json();

    if (students.length == 0) {break;}
    for (let i = 0; i < students.length; i++) {
      const enrollments = students[i].enrollments;
      for(let j = 0; j < students[i].enrollments.length; j++) {
        if (enrollments[j].course_id != courseId) {
          continue;
        }
        totalScores.set(enrollments[j].user_id, enrollments[j].grades.final_score);
      } 
    }
  }
  const studentIds = totalScores.keys();
  const grade_data = {};
  for(let id of studentIds) {
    grade_data[id] ={
      "posted_grade": ((Math.random()*0.1+0.905)*totalScores.get(id)).toFixed(2)
    }
  }
  url = url + `/assignments/${assignmentId}/submissions/update_grades`;
  axios.post(url, {
    grade_data: grade_data
  }, {
    headers: headers
  })
    .then(() => console.log(`Assigning random grades - Course ${courseId} - Assignment ${assignmentId} - Request succeeded. Time used: `, (new Date() - startTime)/1000), 's')
    .catch(err => console.log(err));
};

const courses = [
  ['190000001883402',75],//MATH211 01
  ['190000001883404',73],//MATH211 02
  ['190000001883441', 87]//MATH 308 01
];

const handleCLOs = async () => {
  for (let i = 0; i < courses.length;i++) {
    const ass = await getAssignmentsByGroup(courses[i][0], 'clos');     
    for (let j = 0; j < ass.length; j++) {
      await assignRandomGrades(courses[i][0],ass[j]);
    };
  };
};

