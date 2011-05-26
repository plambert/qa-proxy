This module proxies and rewrites HTTP requests of all types.
For this you can, if you want, use regular expressions.

Please note, that this is the first version of this module. It could have some security isses.
It could be really unstable too. Please report all bugs you find.


Example 1
-----------------------------------------------------------------------------------------------------------------------

var nhrp = require("nhrp");
var fs = require("fs");


function rewrite(request){

    /*  change some request information like this:
    request.host = "newdomain.com";     //for proxying to a new host
    request.port = 456;                 //for proxying to a new port
    request.url = "/a/b/c";             //for changing the url
    request.protocol = "HTTP/1.0";      //USE THIS WHEN THE REQUEST IS NOT A WEBSOCKET!
                                        //Otherwise, the connection won´t close.
    request.secure = false;             //for proxying https/wss to http/ws or vice versa    
    request.Header["User-Agent"] = "xyz";   //to change some headers

    //this would result in
    GET /a/b/c HTTP/1.0
    User-Agent: xyz
    
    PLEASE NOTE THAT THINGS THAT YOU DO NOT CHANGE WILL BE KEPT
    */
    return function(response){

        /* change some response information like this:
        response.code = 200;                //change the response code
        response.message = "OK";            //change the response message
        response.protocol = "HTTP/1.1";     //change the response protocol
        response.headers["Host"] = "olddomain.com"; //change the response headers
                                                    //this will be useful to match the request origin

        //this would result in
        HTTP/1.1 200 OK
        Host: olddomain.com
        */
    }
}
nhrp.createServer(rewrite).listen(80);              //create a server (http/ws) that listens for connections on port 80
nhrp.createSecureServer({                           //create a secure server (https/wss) that listens for connections on port 443
    cert:fs.readFileSync("/root/certificate.pem"),
    key:fs.readFileSync("/root/key.pem")
},rewrite).listen(443);                             //both server will now be rewritten by your rewrite function


Example 2
-----------------------------------------------------------------------------------------------------------------------

`
var nhrp = require("nhrp");
var fs = require("fs");
var rewriter = nhrp.createRewriter("/path/to/your/configfile.js");      //This rewriter automatically proxy your requests using the
                                                                        //regular expressions in the config file below

nhrp.createServer(rewriter).listen(80);              //create a server (http/ws) that listens for connections on port 80
nhrp.createSecureServer({                           //create a secure server (https/wss) that listens for connections on port 443
    cert:fs.readFileSync("/root/certificate.pem"),
    key:fs.readFileSync("/root/key.pem")
},rewriter).listen(443);                             //both server will now be rewritten by your rewriter
`

configfile.js:
--------------

/*
Every request has the following sheme:
PROTOCOL://HOST:PORT/URL

PROTOCOL: This can be wss, ws, http or https
HOST:   This is the requested domain like "example.com"
PORT:   This is the requestsd port like 80,443 (this can simply be every port for that you have created a proxy server)
URL:    The requestsed path like /path/to/my/site.html

*/

[
    //this will proxy a request from http://example.com:80/tests/index.html to http://example.com:8080/index.html
    "^(http://example.com:80)/tests(.*)$ http://example.com:8080$2",
    
    //this will proxy all incoming http or https connections to example.com to http://example.com:8081
    //while the url wil be kept
    "^(http|https)://(example.com):([0-9]*)(.*)$ http://$2:8081$4",

    //this will proxy all incompin ws or wss connections to example.com/mywebsockets to ws://example.com:7070
    "^(ws|wss)://(example.com):([0-9]*)/mywebsocket(.*)$ ws://$2:7070$4"

]
