import { Api } from "@jellyfin/sdk";
import { getApi, getPerDeviceRandID, getWebsocket } from "./jellyfin_helper";
import { BaseItemDto, PlayerStateInfo, SessionInfoDto, SessionsMessage } from "@jellyfin/sdk/lib/generated-client/models";

class Tracker {

    api: Api;
    trackingSessionID = "";
    boundWebsocketHandler: any;
    boundKeepAliveHandler: any;
    boundConnectHandler: any;
    boundTIckHandler: any;
    mediaEl: HTMLMediaElement;
    statusEl: HTMLElement;
    syncFreq: number = 500;
    syncMargin: number = 0.1;
    rttTime = 0;
    lastKeepAliveTime = 0;
    lastObservedError = 0;
    controller: AbortController | null = null;
    downloadingStatus = -1;

    curItem: BaseItemDto | null = {"Id": null};

    constructor(syncFreq = 500, syncMargin = 0.1){
        this.syncFreq = syncFreq;
        this.syncMargin = syncMargin;
        this.api = getApi();
        this.boundWebsocketHandler = this.onWebsocketMessage.bind(this);
        this.boundKeepAliveHandler = this.sendKeepAlive.bind(this);
        this.boundTIckHandler = this.tick.bind(this);
        this.boundConnectHandler = this.onConnect.bind(this);

        getWebsocket().addEventListener('message', this.boundWebsocketHandler);
        setInterval(this.boundKeepAliveHandler, 5 * 1000);
        setInterval(this.boundTIckHandler, this.syncFreq);
        // immediately sub for sessions
        try{
            getWebsocket().send(JSON.stringify({"MessageType":"SessionsStart","Data":"100," + syncFreq}));
        }catch(ex){
            getWebsocket().addEventListener('open', this.boundConnectHandler);
        }
    }

    onConnect(){
        getWebsocket().send(JSON.stringify({"MessageType":"SessionsStart","Data":"100," + this.syncFreq}));
    }

    sendKeepAlive(){
        this.lastKeepAliveTime = performance.now();
        getWebsocket().send(JSON.stringify({"MessageType":"KeepAlive"}));
    }

    transition(session: SessionInfoDto){
        this.curItem = session.NowPlayingItem;
        this.mediaEl.srcObject = null; // clear src
        const liteAudioParameters = new URLSearchParams({
            api_key: this.api.accessToken,
            deviceId: getPerDeviceRandID(),
            audioBitrate: (128 * 1000).toString(),
            audioCodec: "mp3",
            transcodingContainer: "mp3",
            transcodingProtocol: "http"
        }).toString();
        const url = this.api.basePath + "/Audio/" + this.curItem.Id + "/universal?" + liteAudioParameters;

        const fullAudioParameters = new URLSearchParams({
            api_key: this.api.accessToken,
            deviceId: getPerDeviceRandID(),
            audioBitrate: (128 * 1000).toString(),
            audioCodec: "opus",
            transcodingContainer: "webm",
            transcodingProtocol: "http"
        }).toString();
        const fullUrl = this.api.basePath + "/Audio/" + this.curItem.Id + "/universal?" + fullAudioParameters;

        this.mediaEl.src = url;
        this.mediaEl.load();

        this.doBackgroundFullLoad(this.mediaEl, fullUrl);
    }

    doBackgroundFullLoad(el: HTMLMediaElement, url: string){
        if(this.controller){
            this.controller.abort();
            this.controller = null;
        }

        this.controller = new AbortController();
        const promise = fetch(url, {signal: this.controller.signal});
        promise.then(async (response) => {
            const values = [];
            const reader = response.body.getReader();
            let done = false;
            let downloadedBytes = 0;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                if (doneReading) {
                    done = true;
                } else {
                    downloadedBytes += value.length;
                    this.downloadingStatus = downloadedBytes;
                    values.push(value);
                }
            }

            let blob = new Blob(values);
            el.src = URL.createObjectURL(blob);
            el.load();

            this.downloadingStatus = -downloadedBytes;
        });
    }

    syncPausePlay(playState: PlayerStateInfo){
        if(playState.IsPaused){
            if(!this.mediaEl.paused){
                this.mediaEl.pause();
            }
        }else{
            if(this.mediaEl.paused){
                this.mediaEl.play();
            }
        }
    }

    syncPosition(session: SessionInfoDto){
        if(session.PlayState){
            if(this.mediaEl.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA || this.mediaEl.readyState == HTMLMediaElement.HAVE_FUTURE_DATA){
                const desiredPos = session.PlayState.PositionTicks / 10000000;
                const currentPos = this.mediaEl.currentTime;
                if(Math.abs(desiredPos - currentPos) > this.syncMargin){
                    console.log("Playback desync", desiredPos - currentPos);
                    const error =  desiredPos - currentPos;
                    const offset = (this.rttTime / 1000.0);//error * 0.02;
                    this.mediaEl.currentTime = desiredPos + offset;
                }
                this.lastObservedError = desiredPos - currentPos;
            }
            /*console.log(this.mediaEl.seekable);
            for(let i = 0; i < this.mediaEl.seekable.length; i++){
                console.log(this.mediaEl.seekable.start(i), this.mediaEl.seekable.end(i));
            }*/
            this.syncPausePlay(session.PlayState);
        }
    }

    sync(session: SessionInfoDto){
        if(session.NowPlayingItem){
            // playing
            let playState = session.PlayState;
            if(session.NowPlayingItem.Id != this.curItem?.Id){
                this.transition(session);
            }else{
                this.syncPosition(session);
            }

        }else{
            // not playing
            this.mediaEl.pause();
        }
    }

    onWebsocketMessage(message: MessageEvent){
        if(message.data){
            // console.log(typeof message.data, message.data);
            try{
                const msg = JSON.parse(message.data) as SessionsMessage;
                if(msg.MessageType == "Sessions"){
                    // data
                    const data = msg.Data;
                    if(data){
                        data.forEach((session: SessionInfoDto) => {
                            if(session.Id == this.trackingSessionID){
                                this.sync(session);
                            }
                        });
                    }
                    
                } else if (msg.MessageType == "KeepAlive"){
                    this.rttTime = performance.now() - this.lastKeepAliveTime;
                }
            }catch(ex){
                console.warn("Message handler for WebSocket failed", ex);
            }
        }
    }

    setStatus(status: string){
        if(!this.statusEl) return;
        this.statusEl.innerText = status;
    }

    tick(){
        const wsStatus = "WebSocket " + (getWebsocket().readyState == WebSocket.OPEN) ? "Connected" : "state " + getWebsocket().readyState;
        let currentItemStatus = "No item playing ";
        if(this.curItem && this.curItem.Name){
            currentItemStatus = "Playing " + this.curItem.Name;
        }
        let dlStatus = "no cache";
        if(this.downloadingStatus >= 0){
            dlStatus = "downloading " + (this.downloadingStatus / (1024 * 1024)).toFixed(2) + "mb";
        }else if(this.downloadingStatus < -1){
            dlStatus = " using cached " + (-this.downloadingStatus / (1024 * 1024)).toFixed(2) + "mb";
        }
        this.setStatus(currentItemStatus + " " + wsStatus + " RTT " + this.rttTime.toFixed(2) + "ms ERROR " + this.lastObservedError.toFixed(2) + "s " + dlStatus);  
    }

    attach(mediaEl: HTMLMediaElement){
        this.mediaEl = mediaEl;
    }

    setStatusElement(el: HTMLElement){
        this.statusEl = el;
    }

    stop(){
        getWebsocket().removeEventListener('message', this.boundWebsocketHandler);
        getWebsocket().removeEventListener('open', this.boundConnectHandler);
        getWebsocket().send(JSON.stringify({"MessageType":"SessionsStop"}));
        clearInterval(this.boundKeepAliveHandler);
    }

    track(sessionID: string){
        this.trackingSessionID = sessionID;
    }
}

let globalTracker: Tracker | null = null;

export function getTracker(): Tracker {
    if(globalTracker == null){
        globalTracker = new Tracker();
    }
    return globalTracker;
}

