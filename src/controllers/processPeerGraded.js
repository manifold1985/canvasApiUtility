const {
  getAssignmentGroups,
  createAssignmentGroup,
  getAssignmentsInGroup,
  getQuizQuestions,
  getSubmissions,
  putGradeOrComment,
  editAssignment,
} = require("../../utilities");

exports.processPeerGraded = async function (urlPrefix, headers, courseId) {
  const assignmentGroups = await getAssignmentGroups(
    urlPrefix,
    headers,
    courseId,
  );
  let unprocessedId;
  try {
    unprocessedId = assignmentGroups.find((e) =>
      /\bunprocessed\b/i.test(e.name),
    ).id;
  } catch {
    const groupData = {
      name: "Unprocessed",
      group_weight: 0,
    };
    const unprocessed = await createAssignmentGroup(
      urlPrefix,
      headers,
      courseId,
      groupData,
    );
    unprocessedId = unprocessed.id;
  }
  let processedId;
  try {
    processedId = assignmentGroups.find((e) =>
      /\bprocessed\b/i.test(e.name),
    ).id;
  } catch {
    const groupData = {
      name: "Processed",
      group_weight: 0,
    };
    const processed = await createAssignmentGroup(
      urlPrefix,
      headers,
      courseId,
      groupData,
    );
    processedId = processed.id;
  }
  let unprocessedSurveys = await getAssignmentsInGroup(
    urlPrefix,
    headers,
    courseId,
    unprocessedId,
  );
  const now = Date.now();
  unprocessedSurveys = unprocessedSurveys.filter(
    (e) => e.lock_at && now > new Date(e.lock_at),
  );
  for (let i = 0; i < unprocessedSurveys.length; i++) {
    const currSurvey = unprocessedSurveys[i];
    const questions = await getQuizQuestions(
      urlPrefix,
      headers,
      courseId,
      currSurvey.quiz_id,
    );
    const scoreQuestion = questions.find(
      (e) => e.question_name == "Presentation Score",
    );
    const feedbackQuestion = questions.find(
      (e) => e.question_name == "Presentation Feedback",
    );
    const studentIdRegExp = /(?<=data-student_id=")\d+(?=")/;
    const assignmentIdRegExp = /(?<=data-assignment_id=")\d+(?=")/;
    if (currSurvey.description.match(studentIdRegExp)) {
      const studentId = currSurvey.description.match(studentIdRegExp)[0];
      const assignmentId = currSurvey.description.match(assignmentIdRegExp)[0];
      const inclusions = ["submission_history", "user", "assignment"];
      let submissions = await getSubmissions(
        urlPrefix,
        headers,
        courseId,
        currSurvey.id,
        inclusions,
      );
      submissions = submissions.filter(
        (e) => e.workflow_state != "unsubmitted",
      );
      let totalScore = 0;
      let totalFeedback = "Below is the feedback from the class:\n\n";
      let peerCount = submissions.length;
      submissions.forEach((submission) => {
        const scoreData = submission.submission_history[0].submission_data.find(
          (e) => scoreQuestion.id.indexOf(e.question_id) != -1,
        );
        const rawScore = scoreQuestion.answers.find(
          (e) => e.id == scoreData.answer_id_for_score,
        );
        if (rawScore) {
          var currScore = Number(rawScore.text);
        } else {
          var currScore = 0;
          peerCount--;
        }
        totalScore += currScore;
        const feedbackMatch = submission.submission_history[0].submission_data
          .find((e) => feedbackQuestion.id.indexOf(e.question_id) != -1)
          .text.match(/(?<=>)[\w\W]+(?=<)/);

        const currFeedback = feedbackMatch ? feedbackMatch[0] : "N/A";
        totalFeedback += `${submission.user.name}: ${currFeedback}\n\n`;
      });
      const averageScore = totalScore / peerCount;
      const gradeData = {
        submission: {
          posted_grade: averageScore.toFixed(2),
        },
        comment: {
          text_comment: totalFeedback,
        },
      };
      await putGradeOrComment(
        urlPrefix,
        headers,
        courseId,
        assignmentId,
        studentId,
        gradeData,
      );
      const assignmentData = {
        assignment: {
          assignment_group_id: processedId,
        },
      };
      await editAssignment(
        urlPrefix,
        headers,
        courseId,
        currSurvey.id,
        assignmentData,
      );
    }
  }
};
