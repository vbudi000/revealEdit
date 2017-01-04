var express = require('express');
var url = require('url');
var path = require('path');
var Git = require('nodegit');
var http = require('http');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
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

app.get('/srv/:html', function(req,res) { 
    try {
        var fsPath = baseDir+'/'+req.params.html;
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

app.use('/prz', function(req,res) { 
    try {
        var fsPath = curPath+req.path.substring(1);
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

app.use(busboy()); 

app.get('/files', function(req, res) {
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
})

app.get('/newPath', function(req,res) {
    curPath = req.query.path;
            fs.mkdir(curPath,function(err) {
                if (err) {
                    res.status(500).end("Error creating directory "+err);
                } else {
                    // clone repos
                    Git.Clone("https://github.com/vbudi000/emptyreveal", curPath);
                    var fileExist = false;
                    while (!fileExist) {
                        if (fs.existsSync(curPath+'/slides/list.json')) fileExist = true;
                    }
                    res.end("done");
                    // starting npm
                }
            });
})

app.get('/setSlide',function (req,res) {
    curSlide = req.query.slide;
    console.log("Slide: "+curSlide);
    res.end(curSlide);
})

app.get('/listSlides', function (req, res) {
   fs.readFile( curPath + "/slides/list.json", 'utf8', function (err, data) {
       slideList = data;
       res.end( slideList );
   });
})

app.get('/listImages', function (req, res) {
   fs.readdir(curPath + "/resources/", 'utf8', function (err, files) {
       imgList = files;
       console.log(files);
       res.end( JSON.stringify(imgList) );
   });
})

app.post('/uploadImage', function (req, res) {
    console.log(JSON.stringify(req.files));
    fs.readFile(req.files.imageFileName.path, function (err, data) {
        var newPath = curPath + 'resources/' + req.files.imageFileName.name;
        fs.writeFile(newPath, data, function (err) {
            res.redirect("back");
        });
    });
})

app.get('/readSlide', function (req,res) {
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
})

app.post('/writeSlide', function(req, res) {
    slideData.slideHeader = req.body.slideHeader;
    slideData.slideContent = req.body.slideContent;
    slideData.slideNotes = req.body.slideNotes;
    var data = slideData.slideHeader + '\n' + slideData.slideContent + '\n' + '<aside class="notes">' + '\n' + slideData.slideNotes + '\n' + '</aside>';
    console.log(data);
    fs.writeFileSync(curPath + "/slides/"+curSlide, data );
    res.end("OK");
})

app.get('/newSlide', function (req, res) {
    sldName = req.query.name;
    sldPos = req.query.pos;
    console.log(slideList);
    var jsonList = JSON.parse(slideList);
    jsonList.push(sldName);
    console.log(JSON.stringify(jsonList));
    fs.writeFileSync( curPath + "/slides/list.json", JSON.stringify(jsonList));

    curSlide = sldName;
    res.end(sldName);
})

var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
