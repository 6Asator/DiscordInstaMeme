const unirest = require('unirest');
const fs = require('fs');
const Discord = require('discord.js');

const client = new Discord.Client();

const discordBotToken= process.env.discordBotToken;
var lastPublishedMediaDate=Date.parse(0);

var accessTokenLongForRefreshing=process.env.initialInstaLongAccessToken; //it will be used for both refreshing and accessing
var accessTokenLongCurrent;
let setTimerIdRefreshToken;

let intervalTimerIdMedia;


client.login(discordBotToken);


client.on('ready',()=>{
	console.log('This bot is online');
	startRefreshTokenPolling();//ater bot is online start polling
})

// client.on('message',msg=>{
// 	if(msg.content==='hi'){
// 			msg.reply("hello");
// 	}
// })


async function startMediaPolling() {

	console.log('startMediaPolling') ;
	intervalTimerIdMedia = setInterval(function() {
        var url = "https://graph.instagram.com/me/media?fields=media_url,caption,timestamp,media_type,id,permalink,thumbnail_url&"+"access_token="+accessTokenLongCurrent;
        unirest.get(url)
				.end(function(res) {
				if (res.error) {
					console.log('GET error') ;
					 clearTimeout(intervalTimerIdMedia);///stop polling if error occoured
				}
				else {
					try{
						var body = res['body'];
						console.log('api call done');
						var i;
						for(i=0;i<body['data'].length;i++){
							var publishedMediaDate = Date.parse(body['data'][i]['timestamp']);
							var diffDate = publishedMediaDate- lastPublishedMediaDate;
							console.log(diffDate);
							if(diffDate>0){
								if(body['data'][i]['media_type']=== "IMAGE" || body['data'][i]['media_type']=== "VIDEO"){
											console.log('New data IMAGE- caption'+body['data'][i]['caption']);
											lastPublishedMediaDate = publishedMediaDate;
											client.channels.cache.get(process.env.channedID).send(body['data'][i]['permalink']);
											break;////as we don't want to spam on the channel
								 	}
								}
						  }
				    }
						catch(err){
							console.log("Error in the received data");
							console.log(err);
						}
				}
		});
	}, 30000);// poll insta in every 30s
}

async function refreshToken() {
	console.log("refreshToken");
	return new Promise(async (resolve,reject)=>{
	var url = "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token="+accessTokenLongForRefreshing;
		console.log(url);
        unirest.get(url)
		    .end(function(res) {
						if (res.error) {
							console.log('GET refreshToken error  -\n' +res.error ) ;
							reject();
						}
						else {
							try{
								var body = res['body'];
								timeIntervalForRefreshToken = body['expires_in'];
								accessTokenLongForRefreshing = body['access_token'];
								accessTokenLongCurrent = accessTokenLongForRefreshing;
								resolve(timeIntervalForRefreshToken);
							}
							catch(err){
								console.log("Error in the received refreshToken data ");
								console.log(err);
								reject();
							}
						}
		    });
  	});
}

async function startRefreshTokenPolling() {
	console.log("startRefreshTokenPolling");
	try{
		var expiresIn = await refreshToken();
		startMediaPolling();
		console.log("New expiry time - "+expiresIn);
		setTimerIdRefreshToken = setTimeout(function() {
											console.log("setTimeout for refresh token");
									    clearTimeout(intervalTimerIdMedia);
											startRefreshTokenPolling();
								},expiresIn-10000);//refresh it 10 second of expiry
	}catch(err){
		console.log("can not start startRefreshTokenPolling");
	}
}
