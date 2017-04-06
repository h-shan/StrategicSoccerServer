var fs = require('fs');

// var express = require('express');
// var https = require('https');
// var app = express();
// var options = {
//   key: fs.readFileSync('./file.pem'),
//   cert: fs.readFileSync('./file.crt')
// };
 var serverPort = 3000;
// var server = https.createServer(options, app);
// var io = require('socket.io')(server);

var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var userList = [];
var typingUsers = {};

app.get('/', function(req, res){
  res.send('<h1>Howard - Strategic Soccer Server</h1>');
});

function getIndex(playerName) {
  for (var i = 0; i < userList.length; i++) {
    if (userList[i]["username"] == playerName) {
      return i;
    }
  }
  return -1;
}

server.listen(serverPort, function(){
  console.log('Listening on *:3000');
});

io.on('connection', function(clientSocket) {
  console.log('a user connected');
  io.emit("userList", userList);

  clientSocket.on('disconnect', function(){
    console.log('user disconnected');

    var clientUsername;
    for (var i=0; i<userList.length; i++) {
      if (userList[i]["id"] == clientSocket.id) {
        userList.splice(i, 1);
        break;
      }
    }

    delete typingUsers[clientUsername];
    io.emit("userList", userList);
    io.emit("userExitUpdate", clientUsername);
    io.emit("userTypingUpdate", typingUsers);
  });


  clientSocket.on("exitUser", function(clientUsername){
    for (var i=0; i<userList.length; i++) {
      if (userList[i]["id"] == clientSocket.id) {
        userList.splice(i, 1);
        break;
      }
    }
    io.emit("userExitUpdate", clientUsername);
  });


  clientSocket.on('chatMessage', function(clientUsername, message){
    var currentDateTime = new Date().toLocaleString();
    delete typingUsers[clientUsername];
    io.emit("userTypingUpdate", typingUsers);
    io.emit('newChatMessage', clientUsername, message, currentDateTime);
  });


  clientSocket.on("connectUser", function(clientUsername) {
      var message = "User " + clientUsername + " was connected.";
      console.log(message);

      var userInfo = {};
      var foundUser = false;
      var i = getIndex(clientUsername);
      if (i != -1) {
        userList[i]["opponent"] = ""
        userList[i]["id"] = clientSocket.id;
        userList[i]["isHost"] = false;
        userInfo = userList[i];
        foundUser = true;
      }

      if (!foundUser) {
        userInfo["id"] = clientSocket.id;
        userInfo["username"] = clientUsername;
        userInfo["opponent"] = "";
        userList.push(userInfo);
      }

      io.emit("userList", userList);
      io.emit("userConnectUpdate", userInfo)
  });


  clientSocket.on("startType", function(clientUsername){
    console.log("User " + clientUsername + " is writing a message...");
    typingUsers[clientUsername] = 1;
    io.emit("userTypingUpdate", typingUsers);
  });


  clientSocket.on("stopType", function(clientUsername){
    console.log("User " + clientUsername + " has stopped writing a message...");
    delete typingUsers[clientUsername];
    io.emit("userTypingUpdate", typingUsers);
  });

  clientSocket.on("connectGame", function(clientUsername, otherUsername) {
    console.log("Game between: " + clientUsername + " and " + otherUsername)
    var otherId;
    var index1 = getIndex(clientUsername);
    var index2 = getIndex(otherUsername);
    if (index1 == -1) {
      console.log("User with name " + clientUsername + " not found.")
      return;
    }
    if (index2 == -1) {
      console.log("User with name " + otherUsername + " not found.")
      return;
    }
    userList[index1]["opponent"] = otherUsername;
    userList[index1]["isHost"] = true;
    userList[index2]["opponent"] = clientUsername;
    userList[index2]["isHost"] = false;
    io.to(clientSocket.id).emit("connectGameUpdate", otherUsername, true);
    io.to(userList[index2]["id"]).emit("connectGameUpdate", clientUsername, false);
  })

  clientSocket.on("gameInfo", function(opponentName, mode, playerOption, flag, screenWidth, screenHeight, friction) {
    var i = getIndex(opponentName);
    io.to(userList[i]["id"]).emit("gameInfoUpdate", mode, playerOption, flag, screenWidth, screenHeight, friction);
  })

  clientSocket.on("pause", function(opponentName, pauseOption) {
    var i = getIndex(opponentName);
    io.to(userList[i]["id"]).emit("pauseUpdate", pauseOption)
  })

  clientSocket.on("move", function(opponentName, playerName, velX, velY) {
    var i = getIndex(opponentName);
    io.to(userList[i]["id"]).emit("moveUpdate", playerName, velX, velY);
  })

  clientSocket.on("positionVelocity", function(opponentName, posVelInfo, time) {
    var i = getIndex(opponentName);
    io.to(userList[i]["id"]).emit("positionVelocityUpdate", posVelInfo, time)
  })

  clientSocket.on("highlight", function(opponentName, playerToHighlight) {
    var i = getIndex(opponentName);
    io.to(userList[i]["id"]).emit("highlightUpdate", playerToHighlight)
  })

});
