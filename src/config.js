require('dotenv').config();
console.log(process.env);
const tokenName = 'CANVAS_API_TOKEN' + process.env.ENVIRONMENT;
const myEnv = Object.create(process.env); 
const myToken = myEnv[tokenName];
const myHeaders = {
  Authorization: `Bearer ${myToken}`,
  Accept: "application/json+canvas-string-ids"
}
console.log(myHeaders);

exports = {
  myHeaders: myHeaders,
}