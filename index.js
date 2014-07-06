var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var phantom = require('phantom');

// HTTP
app.get('/', function(req, res) {
    res.sendfile('index.html');
});

io.on('connection', function(socket) {
      console.log('a user connected');

      socket.on('disconnect', function() {
          console.log('user disconnected');
      });
});

app.use(express.static(process.cwd() + '/public'));

app.get('/render', function(req, res) {
    res.sendfile('render.html');
});

app.get('/yo', function(req, res) {
});

http.listen(process.env.PORT || 3000, function(){
    console.log('Listening on port %d', http.address().port);
    phantom.create(function(ph) {
        ph.createPage(function(page) {
            page.open("http://localhost:3000/render", function(status) {
                setInterval(function() {
                    page.evaluate(function () {
                        return document.getElementById("testCanvas").toDataURL();
                    }, function(dataURL) {
                        console.log("updated!");
                        io.emit('update', dataURL);
                    });
                }, 1000);
            });
        });
    });
});
