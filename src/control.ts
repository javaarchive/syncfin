import { getApi, jellyfin } from "./jellyfin_helper";
import {getSessionApi} from "@jellyfin/sdk/lib/utils/api/session-api"
import { getTracker } from "./tracker";

export function setupControl(element: HTMLElement){
    const api = getApi();
    const devicesHeader = document.createElement('h2');
    devicesHeader.innerText = 'Devices';
    element.appendChild(devicesHeader);
    const devicesContainer = document.createElement('div');
    devicesContainer.classList.add('devices');
    element.appendChild(devicesContainer);

    const reloadBtn = document.createElement('button');
    reloadBtn.innerText = 'Reload';
    reloadBtn.classList.add('reload');
    reloadBtn.addEventListener('click', (ev: any) => {
        refreshDevices();
    });
    element.appendChild(reloadBtn);

    const destAudio = document.createElement('audio');
    destAudio.controls = true;
    // max preload
    destAudio.preload = "auto";
    element.appendChild(destAudio);

    const trackerStatus = document.createElement('div');
    trackerStatus.innerText = 'Tracker status';
    element.appendChild(trackerStatus);

    getTracker().attach(destAudio);

    function updateTrackerStatus(){
        trackerStatus.innerText = "Tracking " + getTracker().trackingSessionID;
    }

    const sessionApi = getSessionApi(api);

    async function refreshDevices(){
        devicesContainer.innerHTML = '';
        const sessions = await sessionApi.getSessions();
        console.log(sessions);
        for(const session of sessions.data){
            const device = document.createElement('button');
            device.classList.add('device');
            device.title = session.RemoteEndPoint + " " + session.Client;
            device.innerText = session.DeviceName;
            
            // add event listener
            device.addEventListener('click', (ev: any) => {
                getTracker().track(session.Id);
                updateTrackerStatus();
                getTracker().setStatusElement(trackerStatus); // redundant
            });

            devicesContainer.appendChild(device);
        }

    }

    refreshDevices();
    getTracker().setStatusElement(trackerStatus);
    updateTrackerStatus();
    
}