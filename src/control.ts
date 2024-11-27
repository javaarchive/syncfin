import { getApi, jellyfin } from "./jellyfin_helper";
import {} from "@jellyfin/sdk/"

function setupControl(element: HTMLElement){
    const api = getApi();
    const devicesContainer = document.createElement('div');
    devicesContainer.classList.add('devices');


    

    function refreshDevices(){
        devicesContainer.innerHTML = '';
        

    }
    
}