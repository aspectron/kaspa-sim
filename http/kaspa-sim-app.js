import '/style/style.js';
import {dpc, camelCase, html, UID, FlowApp} from '/flow/flow-ux/flow-ux.js';

class App extends FlowApp {
	constructor(){
		super();
		//window.finfrApp = 
		window.app = this;
		//this.initSiteConfig(config)
		this.opt = {

		}

		this.initLog();
		//this.init();
		dpc(async ()=>this.init());
	}

	async init(){
		//this.initSocketIORPC();
		await this.initSocketNATS();
		await this.initUI();
		dpc(()=>this.setLoading(false));
	}

	async initUI(){
		this.bodyEl = document.body;
	}

	firstUpdated() {
		dpc(500, this.initTerm.bind(this));
	}

	initTerm() {
		this.terminal = this.querySelector('#console');
		this.terminal.registerSink(this);
		if(!this.terminal)
			console.log("UNABLE TO GET TERMINAL !!!!");
		console.log("GOT TERMINAL",this.terminal);
		this.terminal.term.writeln("HELLO TERM");

	}

	render(){

		return html`
		<flow-app-layout no-drawer no-header>
		<div slot="main" class="main-area flex sbar" col>
			<div for="home" row class="content">
				<flow-terminal id="console" class="x-terminal" background="#000" foreground="#FFF"></flow-terminal>
			</div>
		</div>
		</flow-app-layout>
		`
	}

	digest(cmd) {
		return new Promise((resolve,reject) => {
			let args = cmd.split(/\s+/);
			let op = args.shift();
			if(!op)
				return Promise.resolve();

            const handler = this[op];
			if(!handler) {
				reject(`${op}: unknown command`);
				return;
			}

			let ret = handler.call(this, ...args);
			if(ret && ret.then && typeof ret.then == 'function') {
				ret.then(resolve).catch(reject);
			}
			else {
				resolve();
			}
		})

	}

	complete(cmd) {

	}

	write(...args) { this.terminal.term.writeln(...args); }

	async test() {

		let resp = await this.nats.request('KASPA.test', { hello: 'world' });
		console.log("GOT RESP", resp);

// 		this.write('hello world - test');
// console.log('this NATS:', this.nats);
// 		return Promise.resolve('end of fn');
	}

}

App.define("kaspa-sim");
