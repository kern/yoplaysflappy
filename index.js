var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var jf = require('jsonfile');

var phantom = require('phantom');

var statsfile = './stats.json';

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
            var stats = {};
            //var yos = 0;
            //var lastYo = "";
            //var highScore = 0;

            jf.readFile(statsfile, function(err, obj) {
              stats.yos = obj.yos;
              stats.lastYo = obj.lastYo;
              stats.highScore = obj.highScore;
              console.log(obj.yos);
              console.log(obj.lastYo);
              console.log(obj.highscore);
            });

            app.get('/yo', function(req, res) {
                stats.yos++;
                stats.lastYo = req.query.username;
                page.sendEvent("keypress", 32);
                res.end();
                jf.writeFile(statsfile, stats, function(err) {
                  console.log(err);
                })
            });

            page.open("http://www.yoplaysflappy.com/render", function(status) {
                setInterval(function() {
                    page.evaluate(function () {
                        return {
                            score: window.score,
                            state: document.getElementById("testCanvas").toDataURL("image/jpeg", 0.1)
                        };
                    }, function(result) {
                        if (result.score > stats.highScore) {
                            stats.highScore = result.score;
                            jf.writeFile(statsfile, stats, function(err) {
                              console.log(err);
                            })
                        }

                        io.emit('update', {
                            highScore: stats.highScore,
                            lastYo: stats.lastYo,
                            yos: stats.yos,
                            state: result.state
                        });
                    });
                }, 100);
            });
        });
    });
});
