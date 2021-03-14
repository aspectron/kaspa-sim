const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const express = require('express');
const bodyParser = require('body-parser');
const EventEmitter = require("events");
const Cookie = require("cookie");
const CookieSignature = require("cookie-signature");
const FlowRouter = require('@aspectron/flow-router');
const utils = require('@aspectron/flow-utils');
const NATS = require('nats');
const jc = NATS.JSONCodec();
const ws = require('ws');
const {FlowHttp} = require('@aspectron/flow-http')({
	express,
	session,
	ws,
	Cookie,
	CookieSignature,
	NATS
});
const fs = require("fs");
// require("colors");
const multiparty = require('multiparty');
const isDocker = require('is-docker')();
const { FlowLogger } = require('@aspectron/flow-logger');
const log = new FlowLogger('Sim', {
	display : ['level','time','name'],
	color: ['level', 'content']
});

const args = utils.args();

class KaspaSim extends EventEmitter{
	constructor(appFolder){
		super();
		this.appFolder = appFolder;
		this.kycDocs = path.join(appFolder, "docs");
	}

	async main() {
		await this.initNATS();
		await this.initHttp();
		await this.initSubscribers();
	}


	async initNATS() {
		// TODO - init NATS and proxy with flowHttp

		this.nats = await NATS.connect({ servers : 'nats.kaspanet.io', token : 'kaspanet' });

	}

	initHttp(){
		const { nats } = this;

		let flowHttp = new FlowHttp(__dirname, {
			config:{
				websocketMode:"NATS",
				websocketPath:"/nats",
				http:{
					host:isDocker?"0.0.0.0":"localhost",
					port:4949,
					session:{
						secret:"34343546756767567657534578678672346573237436523798",
						key:"kaspa-sim"
					}
				},
				staticFiles:{
					'/':'http'
				}
			}
		});

		this.flowHttp = flowHttp;

		flowHttp.initAccess('KASPA', (subject, method) => {
			if(method == FlowHttp.METHODS.SUBSCRIBE)
				return true;
			return /^KASPA/.test(subject);
		}, (subject, method) => {
			return /^KASPA\./.test(subject);
		})

		// flowHttp.preflight((user, subject, data, method)=>{
		// 	this.log("preflight:subject", subject)
		// })

		flowHttp.initNATS(this.nats);

		flowHttp.on("app.init", args=>{
			let {app} = args;
			// app.use(bodyParser.json())
			// app.use(bodyParser.urlencoded({ extended: true }))
			app.use(express.json())
			app.use(express.urlencoded({ extended: true }))
			//this.log("init::app", app.options)


			let router = new FlowRouter(app, {
				mount:{
					flowUX:"/flow/flow-ux",
					litHtml:'/lit-html',
					litElement:'/lit-element',
					webcomponents:'/webcomponentsjs',
				},
				//rootFolder : 'http',
				rootFolder : this.appFolder, // path.join(this.appFolder,'http'),
				//rootFolder : path.join(this.appFolder,'http'),
				folders:[]
			});
			router.init();
		});


		flowHttp.init();

		//log.info('ready');
	}


	async initSubscribers() {

		(async ()=>{
			const sub = this.nats.subscribe('KASPA.test');
			for await(const msg of sub) {
				let data = msg.data ? jc.decode(msg.data) : { };
				console.log('incoming msg:', data);
				if(msg.reply) {
					msg.respond(jc.encode({ data : 'hello world...' }))
				}
			}
		})().then();

	}
}

(async () => {
	let app = new KaspaSim(__dirname);
	app.main();
})();
