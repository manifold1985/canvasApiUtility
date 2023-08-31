require("dotenv").config();
const mongoose = require('mongoose');
const mongoURI = process.env['MONGO_URI'];
mongoose
  .connect(mongoURI)
  .then(() => console.log("Database connection succeeded."))
  .catch(err => console.log(err));


const {Schema, model} = mongoose;

const serviceSchema = new Schema ({
  active: {
    type: Boolean,
    default: false
  },
  courses: {
    type: [String],
    default: []
  }
});

const userSchema = new Schema ({
  id: String,
  name: String,
  email: String,
  auth: {
    envir: String,
    token: String
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  services: {
    'Check-Overdue': {
      type: serviceSchema,
      default: () => ({}) //populate the subdocument with nullish default values
    },
    'Sync-Grades': {
      type: serviceSchema,
      default: () => ({})
    },
    'Assign-Grades': {
      type: serviceSchema,
      default: () => ({})
    },
    "Create-Peer-Graded": {
      type: serviceSchema,
      default: () => ({})
    }, 
    'Process-Peer-Graded': {
      type: serviceSchema,
      default: () => ({})
    }      
  }
});

const User = model('canvasUsers', userSchema);

module.exports.createUser = async function (id, name, email, token, envir) {
  const user = User({
    id: id,
    name: name,
    email: email,
    auth: {
      envir: envir,
      token: token
    }
  })
  let result = await user.save();
  result = result.toObject();
  return result;
}

module.exports.findUser = async function(id, envir, token) {
  const user = await User.findOne({
    id: id
  });
  if (!user) {
    return false;
  }
  const {lastLogin} = user;
  user.lastLogin = Date.now();
  Object.assign(user.auth, {envir: envir, token: token});
  let result = await user.save();
  result = result.toObject();
  result.lastLogin = lastLogin;
  console.log(result.lastLogin);
  return result;
}

module.exports.findProfile = async function(id) {
  const profile = await User.findOne({id:id});
  return profile;
}

