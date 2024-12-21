require("dotenv").config();
const { sortIntoGroups } = require("./utilities");
const courses = JSON.parse(process.env.COURSES);
async function main() {
    for (let course of courses) {
        console.log(course);
        await sortIntoGroups({ courseId: course });
    }
}
main();
