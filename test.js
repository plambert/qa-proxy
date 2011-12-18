// start a qa-proxy with simple rules

var qap = require("./qa-proxy");
var fs = require("fs");
var endpoint_for_host={
	'news.yahoo.com': 'yts1.global.media.ac4.yahoo.com'
};

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

	if(endpoint_for_host[request.host] !== undefined) {
		request.host=endpoint_for_host[request.host];
	}
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

qap.createServer(rewrite).listen(8080);              //create a server (http/ws) that listens for connections on port 80
