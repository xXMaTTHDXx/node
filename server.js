var express = require('express')
, passport = require('passport')
, util = require('util')
, SteamStrategy = require('passport-steam').Strategy;

var cookieParser = require('cookie-parser')();
var session = require('express-session')({ secret: 'secret'});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new SteamStrategy({
  returnURL: 'http://localhost:3000/auth/steam/return',
  realm: 'http://localhost:3000/',
  apiKey: '...'
},
function(identifier, profile, done) {
  process.nextTick(function () {
    profile.identifier = identifier;
    return done(null, profile);
  });
}
));

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


// configure Express
app.set('views', __dirname + '/public/views');
app.set('view engine', 'ejs');

app.use(cookieParser);
app.use(session);
passport.deserializeUser(function(id, done) {
  done(null, {id: id, name: 'foo'});
});


app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('account', { user: req.user });
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


app.get('/auth/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/home', function(req, res) {
  res.redirect("/");
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}

/*
 Socket
 */

 var clients = [];

 http.listen(3000, function(){
  console.log('listening on *:3000');
});

 io.use(function(socket, next) {
    var req = socket.handshake;
    var res = {};
    cookieParser(req, res, function(err) {
        if (err) return next(err);
        session(req, res, next);
    });
});

io.on('connection', function(socket) {
  var pass = socket.handshake.session.passport;

  if (pass == undefined) {

  } else {
    var json = JSON.stringify(pass);
    var parsed = JSON.parse(json);
    clients.push(socket.id);
    clients[socket.id] = parsed["user"];
    join(parsed["user"].id);
  }
});

/*
DATABASE
*/

var Client = require('mariasql');
var host = 'localhost';
var user = '...';
var pass = '...';
var db = '...';

var con = new Client({
  host: host,
  user: user,
  pass: pass,
  db: db,
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
});

/*
  User Data:
  SteamID
  Bio (x many characters)
  Trade URL
  Join Date
  Last login (Date/Time)
  Balance
  */

/*
  Site Stats:
  Unique Joins
  Total Amount Deposited Today
  */

  function getDateTime() {
    var date = new Date();
    var year = date.getFullYear();
    var month = (date.getMonth() + 1);
    var day = (date.getDay() + 1);

    var hour = date.getHours();
    var min = date.getMinutes();
    var seconds = date.getSeconds();

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + seconds;
  }

  function getDate() {
    var date = new Date();
    var year = date.getFullYear();
    var month = (date.getMonth() + 1);
    var day = (date.getDay() + 1);

    return year + "-" + month + "-" + day;
  }

  function join(steamID) {
    userExists(steamID, function(err, data) {
      if (err) throw err;

      if (data.length == 0) {
        newUser(steamID);
      } else {
        return;
      }
    });
  }

  function newUser(steamID) {
    var sql = 'INSERT INTO `users` (SteamID, Bio, TradeURL, FirstJoin, LastLogin, Bal) VALUES(?, ?, ?, ?, ?, ?)';
    con.query(sql, [steamID, '', '', getDate(), getDateTime(), 0], function(err) {
      if (err) throw err;
    });
  }

  function userExists(steamID, callback) {
    var sql = 'SELECT * FROM `users` WHERE SteamID=?';

    con.query(sql, [steamID], function(err, result) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    });
  }

  function getBio(steamID, callback) {
    userExists(steamID, function(err, data) {
      if (data.length == 0) {
        return;
      } else {
        var sql = 'SELECT Bio FROM `users` WHERE SteamID=?';
        con.query(sql, [steamID], function(error, result) {
          if (err) {
            callback(error, null)
          }
          callback(null, result[0].Bio);
        });
      }
    });
  }

  function getBolts(steamID, callback) {
    userExists(steamID, function(err, data) {
      if (data.length == 0) {
        return;
      } else {
        var sql = 'SELECT Bal FROM `users` WHERE SteamID=?';
        con.query(sql, [steamID], function(error, result) {
          if (error) {
            callback(error, null)
          }
          callback(null, result[0].Bal);
        });
      }
    });
  }

  function getFirstJoin(steamID, callback) {
    userExists(steamID, function(err, data) {
      if (data.length == 0) {
        return;
      } else {
        var sql = 'SELECT Bio FROM `users` WHERE SteamID=?';
        con.query(sql, [steamID], function(err, result) {
          if (err) {
            callback(err, null)
          }
          callback(null, result[0].FirstJoin);
        });
      }
    });
  }

  function getRank(steamID, callback) {
    userExists(steamID, function(err, data) {
      if (data.length == 0) {
        return;
      } else {
        var sql = 'SELECT Rank from `USERS` WHERE SteamID=?';
        con.query(sql, [steamID], function(err, result) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, result[0].Rank);
          }
        });
      }
    });
  }

  function getLastLogin(steamID, callback) {
    userExists(steamID, function(err, data) {
      if (data.length == 0) {
        return;
      } else {
        var sql = 'SELECT LastLogin FROM `users` WHERE SteamID=?';
        con.query(sql, [steamID], function(err, result) {
          if (err) {
            callback(err, null)
          }
          callback(null, result[0].LastLogin);
        });
      }
    });
  }

  function setLastLogin(steamID, time) {
    userExists(steamID, function(err, data) {
      if (data.length == 0) {
        return;
      } else {
        var sql = 'UPDATE `users` SET LastLogin=? WHERE SteamID=?';
        con.query(sql, [steamID, getDateTime()], function(err) {
          if (err) throw err;
        });
      }
    });
  }

  function giveBots(steamID, amount) {
    getBolts(steamID, function(err, data) {
      if (err) throw err;

      var total = (data + amount);
      var setSQL = 'UPDATE `users` SET Bal=? WHERE SteamID=?';
      con.query(setSQL, [total, steamID], function(error) {
        if (err) throw err;
      });
    });
  }

  function takeBolts(steamID, amount) {
    getBolts(steamID, function(err, data) {
      if (err) throw err;

      var total = (data - amount);
      if (total < 0) {
        total = 0;
      }
      var setSQL = 'UPDATE `users` SET Bal=? WHERE SteamID=?';
      con.query(setSQL, [total, steamID], function(error) {
        if (err) throw err;
      });
    });
  }

  function setBio(steamID, bio) {
    var setSQL = 'UPDATE `users` SET Bio=? WHERE SteamID=?';
    con.query(setSQL, [bio, steamID], function(err) {
      if (err) throw err;
    });
  }
