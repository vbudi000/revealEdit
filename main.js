var express = require('express');
var targz = require('targz');
var url = require('url');
var path = require('path');
var Git = require('nodegit');
var http = require('http');
var https = require('https');
var bodyParser = require('body-parser');
//var busboy = require('connect-busboy');
var multer = require('multer');
var readline = require('readline');
var exec = require('child_process').exec;
var app = express();
var fs = require('fs');
var slideList = [];
var imgList = [];
var curSlide = "page-07-00-api-gateway";
var curPath = "C:\\VBDData\\garys-microservices-workshop-experiment\\";
var numSlide = 0;
var slideData = {
    slideHeader: "",
    slideContent: "",
    slideNotes: ""
};

var baseDir = __dirname   // or whatever base directory you want

app.get('/', function(req,res) {
    res.redirect('/srv/index.html');
})

app.get('/srv/:html', function(req,res) { 
    try {
        var fsPath = path.join(baseDir,req.params.html);
        console.log(fsPath);
        //res.writeHead(200)
        var fileStream = fs.createReadStream(fsPath)
        fileStream.pipe(res)
        fileStream.on('error',function(e) {
            console.log(e);
            res.writeHead(404)     // assume the file doesn't exist
            res.end()
        })
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.use('/prz', function(req,res) { 
    try {
        var subPath = req.path.substring(1);
        if (subPath.startsWith("..")) {
            res.writeHead(500);
            res.end();
        } else {
            var fsPath = path.join(curPath,subPath);
            console.log(fsPath);
            //res.writeHead(200)
            var fileStream = fs.createReadStream(fsPath)
            fileStream.pipe(res)
            fileStream.on('error',function(e) {
                console.log(e);
                res.writeHead(404)     // assume the file doesn't exist
                res.end()
            })
        }
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.use('/resources', function(req,res) { 
    try {
        var fsPath = curPath+'resources'+req.path;
        console.log(fsPath);
        res.writeHead(200)
        var fileStream = fs.createReadStream(fsPath)
        fileStream.pipe(res)
        fileStream.on('error',function(e) {
            res.writeHead(404)     // assume the file doesn't exist
            res.end()
        })
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

//app.use(busboy()); 

app.get('/files', function(req, res) {
    try {
    var currentDir =  baseDir;
    var query = req.query.path || '';
    if (query) currentDir = query;
    console.log("browsing ", currentDir);
    fs.readdir(currentDir, function (err, files) {
        if (err) {
            throw err;
        }
        var data = [];
        data.push({ Name: "..", IsDirectory: true, Path: path.join(currentDir,"..").normalize()});
        data.push({ Name: ".", IsDirectory: true, Path: currentDir})
        files.forEach(function (file) {
            try {
                var isDirectory = fs.statSync(path.join(currentDir,file)).isDirectory();
                if (isDirectory) {
                    data.push({ Name : file, IsDirectory: true, Path : path.join(currentDir, file)  });
                } 
            } catch(e) {
                console.log(e); 
            }        
        });
      //sdata = _.sortBy(data, function(f) { return f.Name });
      res.json(data);
    });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
});

app.get('/preview', function(req, res) {
    try {
        var fsPath1 = baseDir+'/reveal-top.html';
        var fsPath2 = baseDir+'/reveal-bot.html';
        //res.writeHead(200);
        var reply = "";
        fs.readFile(fsPath1, "utf8", function(err, data){
            reply += data;
            reply += "<section data-markdown=\"/prz/slides/"+curSlide+"\"></section>";
            fs.readFile(fsPath2, "utf8", function(err, data){
                reply += data;
                res.end(reply);
            });
            
        });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }  
})

app.get('/setPath', function (req, res) {
    try {
        curPath = req.query.path;
    console.log("Working with: "+curPath);
    fs.access(curPath, fs.F_OK, function(err) {
        // must create path
        console.log(err ? 'no access!' : 'can read/write');
        if (err)  res.status(500).send("Target path does not exists or inaccessible!");
        else {
            // starting npm
            res.end(curPath);
        }
    });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.get('/newPath', function(req,res) {
    try {
        curPath = req.query.path;
        fs.mkdir(curPath,function(err) {
            if (err) {
                res.status(500).end("Error creating directory "+err);
            } else {
                https.get('https://codeload.github.com/vbudi000/emptyReveal/legacy.tar.gz/master', (res1) => {
                    console.log('statusCode:', res1.statusCode);
                    console.log('headers:', res1.headers);
                    fs.writeFileSync(path.join(curPath,'emptyReveal.tar.gz'),"");
                    res1.on('data', function(d) {
                        fs.appendFileSync(path.join(curPath,'emptyReveal.tar.gz'),d);
                    });
                    res1.on('end', function() {
                        console.log("done");
                        targz.decompress({
                            src: path.join(curPath,'emptyReveal.tar.gz'),
                            dest: curPath,
                            tar: {
                                map: function(header) {
                                    var fname = header.name;
                                    header.name = fname.substring(fname.indexOf('/')+1);
                                    return header;
                                }
                            }
                        }, function(err){
                            if(err) {
                                console.log(err);
                            } else {
                                console.log("Done!");
                                fs.unlink(path.join(curPath,'emptyReveal.tar.gz'),function(err){console.log(err)});
                                res.end("done");
                            }
                        });            
                    });
                }).on('error', (e) => {
                    console.error(e);
                });
                    // clone repos
            }
        });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.get('/setSlide',function (req,res) {
    curSlide = req.query.slide;
    console.log("Slide: "+curSlide);
    res.end(curSlide);
})

app.get('/listSlides', function (req, res) {
    try {
        fs.readFile( curPath + "/slides/list.json", 'utf8', function (err, data) {
            slideList = data;
            res.end( slideList );
        });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.get('/listImages', function (req, res) {
    try {
        fs.readdir(curPath + "/resources/", 'utf8', function (err, files) {
            imgList = files;
            console.log(files);
            res.end( JSON.stringify(imgList) );
        });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.post('/uploadImage', function (req, res) {
    try {
        //var mybusboy = new busboy({ headers : req.headers });
        console.log('ooo');
        
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    console.log('got file', filename, mimetype, encoding);

  }).on('finish', function() {
    // show a link to the uploaded file
    res.writeHead(200, {'content-type': 'text/html'});
    res.end('<a href="/file/' + fileId.toString() + '">download file</a>');
  });

  req.pipe(busboy);
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.get('/readSlide', function (req,res) {
    try {
        var rd = readline.createInterface({
            input: fs.createReadStream(curPath + "/slides/"+curSlide),
            output: process.stdout,
            terminal: false
        });
        var fileData = [];
        linenum = 0;
        slideData.slideContent = "";
        slideData.slideNotes = "";
        inContent = 1;
        inNotes = 0;
        rd.on('line', function(line) {
            linenum = linenum + 1;
            console.log(linenum+" "+line);
            if (linenum==1) 
                slideData.slideHeader = line;
            else if (inContent == 1) {
                if (line.indexOf('<aside')>=0) {
                    inContent = 0;
                    inNotes = 1;
                } else slideData.slideContent+="\n"+line;
            } else if (inNotes == 1) {
                if (line.indexOf("</aside")>=0) inNotes = 0;
                else slideData.slideNotes += "\n"+line;
            }
        });
        rd.on('close', function() {
            res.end(JSON.stringify(slideData));
        });
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.post('/writeSlide', function(req, res) {
    try {
        slideData.slideHeader = req.body.slideHeader;
        slideData.slideContent = req.body.slideContent;
        slideData.slideNotes = req.body.slideNotes;
        var data = slideData.slideHeader + '\n' + slideData.slideContent + '\n' + '<aside class="notes">' + '\n' + slideData.slideNotes + '\n' + '</aside>';
        console.log(data);
        fs.writeFileSync(curPath + "/slides/"+curSlide, data );
        res.end("OK");
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

app.get('/newSlide', function (req, res) {
    try {
        var sldName = req.query.name;
        var sldPos = req.query.pos;
        var jsonList = JSON.parse(slideList);
        var numSld = jsonList.length;
        if (sldPos=='first') jsonList.splice(0,0,sldName);
        else if (sldPos=='last') jsonList.push(sldName);
        else if (sldPos<numSld) jsonList.splice(sldPos,0,sldName);
        else jsonList.push(sldName);
        fs.writeFileSync( curPath + "/slides/list.json", JSON.stringify(jsonList));
        curSlide = sldName;
        res.end(sldName);
    } catch(e) {
        res.writeHead(500)
        res.end()     // end the response so browsers don't hang
        console.log(e.stack)
    }
})

var server = app.listen(8081, function () {
var host = server.address().address
var port = server.address().port

console.log("Reveal Edit app at http://%s:%s/srv/index.html", host, port)

})
