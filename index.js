var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var mongoose = require ("mongoose");

var phantom = require('phantom');

var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://localhost/StatsDB';

mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});

var statsSchema = new mongoose.Schema({
  yos: {type: Number, min: 0},
  lastYo: String,
  highScore: {type: Number, min: 0}
});

var gameStats = mongoose.model('gameStats', statsSchema);

var stats = new gameStats ({
  yos: 315,
  lastYo: "SAYANGEL",
  highScore: 14
});

stats.save(function (err) {if (err) console.log ('Error on save!')});

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
            stats.yos = 0;
            stats.lastYo = "";
            stats.highScore = 0;

            gameStats.findOne({}, function(err, doc) {
              if (err) return console.error(err);
              //console.dir(doc);
              stats.yos = doc.yos;
              stats.lastYo = doc.lastYo;
              stats.highScore = doc.highScore;
            });

            app.get('/yo', function(req, res) {
                stats.yos++;
                stats.lastYo = req.query.username;
                page.sendEvent("keypress", 32);
                res.end();
                gameStats.findOne({}, function(err, doc) {
                  if (err) return console.error(err);
                  //console.dir(doc);
                  doc.yos = stats.yos;
                  doc.lastYo = stats.lastYo;
                  doc.save(function (err) {if (err) console.log ('Error on save!')});
                });
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
                            gameStats.findOne({}, function(err, doc) {
                              if (err) return console.error(err);
                              //console.dir(doc);
                              doc.highScore = stats.highScore;
                              doc.save(function (err) {if (err) console.log ('Error on save!')});
                            });
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
