var net = require("net");
var tls = require("tls");
var fs = require("fs");

exports.createSecureServer = createSecureServer;
exports.createServer = createServer;
exports.createRewriter = createRewriter;

function createSecureServer(options,onrequest,port){
    return createProxyServer(tls.createServer(options),onrequest,true);
}

function createServer(onrequest,port){
    return createProxyServer(net.createServer(),onrequest,false);
}

function createProxyServer(server,onrequest,secure){
    server.on(secure?"secureConnection":"connection",function (c){
        var head = "";
        function ondata(d){
            var index = (d+"").indexOf("\r\n\r\n");
            if(index > -1){
                head += (d+"").substr(0,index);
                head = head.split("\r\n")
                
                var request = {};
                
                head[0] = head[0].split(" ");
                request.method = head[0][0];
                request.url = head[0][1];
                request.protocol = head[0][2];
                request.secure = secure;
                request.headers = {};
                
                for(var i = 1; i < head.length; i++){
                    head[i] = head[i].split(": ");
                    request.headers[head[i][0]] = head[i][1];
                }
                
                var p = request.headers.Host.split(":");
                request.host = p[0];
                if(p.length == 2){
                    request.port = parseInt(p[1],10);
                }else{
                    request.port = secure?443:80;
                }
                
                
                
                //change something
                if(onrequest){
                    request.headers.Host = request.host+":"+request.port;
                    var onresponse = onrequest(request);
                    
                }                
                //end of changes
                
                var r = request.method+" "+request.url+" "+request.protocol+"\r\n";
                for(var a in request.headers){
                    r += a+": "+request.headers[a]+"\r\n";
                }
                r += "\r\n";
                
                
                function closeconnection(){
                    try{
                        c.destroy();
                    }catch(e){}
                }
                function onconnect(con){
                    var b = new Buffer(r.length +d.length-index-4);
                    b.write(r);
                    d.copy(b,r.length,index+4);
                    con.write(b);
                    c.pipe(con);
                    c.removeListener("data",ondata);
                    
                    
                    
                    var head = "";
                    function ondata(d){
                        var index = (d+"").indexOf("\r\n\r\n");
                        if(index > -1){
                            head += (d+"").substr(0,index);
                            head = head.split("\r\n")
                            
                            var response = {};
                            
                            head[0] = head[0].split(" ");
                            response.protocol = head[0][0];
                            response.code = head[0][1];
                            response.message = head.slice(2).join(" ");
                            
                            response.headers = {};
                            
                            for(var i = 1; i < head.length; i++){
                                head[i] = head[i].split(": ");
                                response.headers[head[i][0]] = head[i][1];
                            }
                            
                            //change something
                            if(onresponse){
                                onresponse(response);                                
                            }
                            //end of changes
                            
                            var r = response.protocol+" "+response.code+" "+response.message+"\r\n";
                            for(var a in response.headers){
                                r += a+": "+response.headers[a]+"\r\n";
                            }
                            r += "\r\n";
                            
                            
                            var b = new Buffer(r.length +d.length-index-4);
                            b.write(r);
                            d.copy(b,r.length,index+4);
                            c.write(b);
                            con.pipe(c);
                            con.removeListener("data",ondata);
                            
                        }else{
                            head += d;
                        }
                    }
                    con.on("data",ondata);
                }
                
                
                if(request.secure){
                    var con = tls.connect(request.port,request.host,function(){						
                        onconnect(con);
                        clearTimeout(timeout);
                    });
                    con.on("error",function(){closeconnection()});
                    var timeout = setTimeout(closeconnection,5000);
                }else{
                    var con = net.createConnection(request.port,request.host);
					con.on("error",function(){closeconnection()});
                    con.on("connect",function(){
                        onconnect(con);
                        clearTimeout(timeout);
                    });                    
                    var timeout = setTimeout(closeconnection,5000);
                }                
                
            }else{
                head += d;
            }
        }
        c.on("data",ondata);
    });
    return server;
}

function createRewriter(path){
    
    var rules = [];
    
    fs.watchFile(path,function(after,before){
        if(before.ctime.getTime() < after.ctime.getTime()){
        	setTimeout(loadConfigFile,1000);
    	}
    });
    
    function loadConfigFile(){
        try{
            var r = eval(fs.readFileSync(path)+"");
            rules = [];
            for(var i = 0; i < r.length; i++){
                var parts = r[i].split(" ");
                rules.push({
                    expression:new RegExp(parts[0].replace(/\//g,"\\\/")),
                    template:parts[1],
                    option:parts[2]
                });
            }
        }catch(e){
        }
    }
    loadConfigFile();
    
    function rewrite (req){
        var isWebSocket = (req.headers.Upgrade||"").toLowerCase() == "websocket";
        var location = (isWebSocket?"ws":"http")+(req.secure?"s":"")+"://"+req.headers.Host+req.url;
		
        
        if(!isWebSocket){
            req.protocol = "HTTP/1.0";
        }else{
			location = location.replace(":80","").replace(":443","");
		}
        
        //rewrite engine start
        
        var address = (isWebSocket?"ws":"http")+(req.secure?"s":"")+"://"+req.host+":"+req.port+req.url;
        
        //console.log(rules);
        for(var i = 0; i < rules.length; i++){
            var rule = rules[i];
            var result = rule.expression.exec(address);
            
            if(result){
                break;
            }
        }
        var r = rule.template;
        for(var i = 1; i < result.length; i++){
            r = r.replace("$"+i,result[i]);
        }
        
        req.secure = (r.indexOf("https") == 0 || r.indexOf("wss") == 0);
        r = r.substr(r.indexOf("://")+3);
        
        req.host = r.substr(0,r.indexOf(":"));
        r = r.substr(req.host.length+1);
        
        if(r.indexOf("/") >= 0){
            req.port = parseInt(r.substr(0,r.indexOf("/")),10);
            req.url = r.substr((req.port+"").length);
        }else{
            req.port = parseInt(r,10);
            req.url = "/";
        }
        
        if(rule.option == "R"){
            var redirecter = rewrite(req);
        }
        
        //rewrite engine end        
        
        return function(res){
            if(redirecter){
                redirecter(res);
            }
            res.headers[(isWebSocket?"Sec-WebSocket-":"")+"Location"] = location;
        }
    }
    return rewrite;
}
