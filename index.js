var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var phantom = require('phantom');

app.use(express.static(process.cwd() + '/public'));

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

app.get('/render', function(req, res) {
    res.sendfile('render.html');
});

http.listen(process.env.PORT || 3000, function(){
    console.log('Listening on port %d', http.address().port);

    phantom.create(function(ph) {
        ph.createPage(function(page) {
            var yos = 0;
            var lastYo = "";

            app.get('/yo', function(req, res) {
                yos++;
                lastYo = req.query.username;
                page.sendEvent("keypress", 32);
                res.end();
            });

            page.open("http://www.yoplaysflappy.com/render", function(status) {
                setInterval(function() {
                    page.evaluate(function () {
                        return document.getElementById("testCanvas").toDataURL("image/jpeg", 0.1);
                    }, function(dataURL) {
                        io.emit('update', {
                            lastYo: lastYo,
                            yos: yos,
                            state: dataURL
                        });
                    });
                }, 100);
            });
        });
    });
});
